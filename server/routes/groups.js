import express from "express";
import { ObjectId } from "mongodb";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();
const groupsCollection = RepoMongodb.collection("groups");
const blocksCollection = RepoMongodb.collection("blocks"); // For dynamic panelist count

// Helper: Deep merge objects
function deepMerge(target, source) {
  for (const key in source) {
    if (Array.isArray(source[key])) {
      if (key === "members") {
        target[key] = [...source[key]];
      } else if (key === "s3_key") {
        target[key] = [...(target[key] || []), ...source[key]];
      } else {
        target[key] = [...source[key]];
      }
    } else if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Helper: Update group progress based on milestone completion
async function updateGroupProgress(groupId) {
  try {
    const group = await groupsCollection.findOne({ group_id: groupId });
    if (!group) return;

    let newProgress = group.progress;

    // Check if any milestone has been started (has files or approvals)
    const hasStartedWork = group.milestones.some(m => 
      m.status === true || 
      m.approved_by?.length > 0 || 
      m.verified?.faculty_in_charge?.approved === true ||
      m.verified?.chairperson?.some?.(c => c.approved === true)
    );

    // Check if all milestones are fully completed
    const allMilestonesComplete = group.milestones.every(m => {
      const hasFiles = m.s3_key && m.s3_key.length > 0;
      const hasStatus = m.status === true;
      
      let hasVerification = false;
      if (m.type === "upload_manuscript") {
        // Needs all panelist approvals AND faculty approval
        const requiredPanelistCount = 3;
        hasVerification = m.approved_by?.length >= requiredPanelistCount && 
                         m.verified?.faculty_in_charge?.approved === true;
      } else if (m.type === "describe_work") {
        // describe_work doesn't need files, just verification
        hasVerification = m.verified?.chairperson?.some?.(c => c.approved === true);
        return hasVerification; // Skip file check for describe_work
      } else {
        // Other milestones need chairperson approval
        hasVerification = m.verified?.chairperson?.some?.(c => c.approved === true);
      }
      
      return hasFiles && hasStatus && hasVerification;
    });

    if (allMilestonesComplete) {
      newProgress = "completed";
    } else if (hasStartedWork && group.progress === "not_started") {
      newProgress = "ongoing";
    }

    // Update progress if it changed
    if (newProgress !== group.progress) {
      await groupsCollection.updateOne(
        { group_id: groupId },
        { 
          $set: { 
            progress: newProgress,
            updated_at: new Date()
          }
        }
      );
    }
  } catch (err) {
    console.error("Error updating group progress:", err);
  }
}

// Route: Get all groups (limit 50 for safety)
router.get("/", async (req, res) => {
  try {
    const results = await groupsCollection.find({}).limit(50).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// Route: Get single group by group_id
router.get("/:group_id", async (req, res) => {
  try {
    const result = await groupsCollection.findOne({ group_id: req.params.group_id });

    if (!result) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching group" });
  }
});

// Route: Create new group
router.post("/", async (req, res) => {
  try {
    const { block_id, title, leader, members } = req.body;

    if (!block_id || !leader?.email) {
      return res
        .status(400)
        .json({ error: "block_id and leader.email are required" });
    }

    const groupCount = await groupsCollection.countDocuments({ block_id });
    const group_id = `${block_id}_${groupCount + 1}`;

    const now = new Date();

    const newGroup = {
      _id: new ObjectId(),
      group_id,
      block_id,
      title: title || null,
      leader,
      members: Array.isArray(members) ? members : [],
      milestones: [
        {
          type: "upload_manuscript",
          status: false,
          s3_key: [],
          approved_by: [],
          verified: {
            faculty_in_charge: { approved: false, approved_at: null },
          },
          created_at: now,
          updated_at: now,
        },
        {
          type: "complete_copyright",
          status: false,
          s3_key: [],
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
        {
          type: "pass_turnitin",
          status: false,
          s3_key: [],
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
        {
          type: "upload_all_docs",
          status: false,
          s3_key: [],
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
        {
          type: "describe_work",
          status: false,
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
      ],
      progress: "not_started",
      created_at: now,
      updated_at: now,
    };

    await groupsCollection.insertOne(newGroup);

    res.status(201).json({
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating group" });
  }
});

// Route: Update milestone files (add, remove, or replace)
router.patch("/:groupId/milestones/:milestoneType/files", async (req, res) => {
  try {
    const { groupId, milestoneType } = req.params;
    const { action, files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files must be a non-empty array" });
    }

    // Enforce PDF only validation
    const invalid = files.filter((f) => !f.toLowerCase().endsWith(".pdf"));
    if (invalid.length > 0) {
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    // Build the base update query
    let updateQuery;
    if (action === "add") {
      updateQuery = { $addToSet: { "milestones.$.s3_key": { $each: files } } };
    } else if (action === "remove") {
      updateQuery = { $pull: { "milestones.$.s3_key": { $in: files } } };
    } else if (action === "replace") {
      updateQuery = { $set: { "milestones.$.s3_key": files } };
    } else {
      return res
        .status(400)
        .json({ error: "Invalid action. Use add, remove, or replace." });
    }

    // Update milestone status based on file operations
    if (action === "add" && files.length > 0) {
      updateQuery.$set = {
        ...updateQuery.$set,
        "milestones.$.status": true, // Mark as complete when files are added
        "milestones.$.updated_at": new Date(),
      };
    } else if (action === "remove") {
      // Use MongoDB aggregation to check remaining files in a single operation
      const pipeline = [
        { $match: { group_id: groupId } },
        { $unwind: "$milestones" },
        { $match: { "milestones.type": milestoneType } },
        {
          $project: {
            remainingFiles: {
              $filter: {
                input: "$milestones.s3_key",
                cond: { $not: { $in: ["$$this", files] } }
              }
            }
          }
        }
      ];
      
      const result = await groupsCollection.aggregate(pipeline).toArray();
      const hasRemainingFiles = result[0]?.remainingFiles?.length > 0;
      
      updateQuery.$set = {
        ...updateQuery.$set,
        "milestones.$.status": hasRemainingFiles,
        "milestones.$.updated_at": new Date(),
      };
    } else if (action === "replace") {
      // For replace action, status depends on whether files array is empty
      updateQuery.$set = {
        ...updateQuery.$set,
        "milestones.$.status": files.length > 0,
        "milestones.$.updated_at": new Date(),
      };
    }

    // If no $set was created yet, initialize it
    if (!updateQuery.$set) {
      updateQuery.$set = {
        "milestones.$.updated_at": new Date(),
      };
    }

    // Execute the database update
    const result = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": milestoneType },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    const updatedGroup = await groupsCollection.findOne({ group_id: groupId });

    // Update group progress asynchronously (fire and forget)
    updateGroupProgress(groupId).catch(err => 
      console.error(`Background progress update failed for group ${groupId}:`, err)
    );

    res.json({
      message: `Files ${action}d successfully for ${milestoneType}`,
      group: updatedGroup,
    });
  } catch (err) {
    console.error("Error updating milestone files:", err);
    res.status(500).json({ error: "Error updating milestone files" });
  }
});

// Route: Faculty approval for upload_manuscript milestone
router.patch("/:groupId/milestones/upload_manuscript/faculty-approve", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // First check if all panelists have approved
    const group = await groupsCollection.findOne({ group_id: groupId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const milestone = group.milestones.find(m => m.type === "upload_manuscript");
    const requiredPanelistCount = 3; // Based on your block data
    
    if (milestone.approved_by.length < requiredPanelistCount) {
      return res.status(400).json({ 
        error: `All ${requiredPanelistCount} panelists must approve before faculty can approve` 
      });
    }

    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": "upload_manuscript" },
      {
        $set: {
          "milestones.$.verified.faculty_in_charge.approved": true,
          "milestones.$.verified.faculty_in_charge.approved_at": new Date(),
          "milestones.$.verified.faculty_in_charge.approved_by": name,
          "milestones.$.updated_at": new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    // Update group progress asynchronously (fire and forget)
    updateGroupProgress(groupId).catch(err => 
      console.error(`Background progress update failed for group ${groupId}:`, err)
    );

    res.json({ message: "Faculty approval recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording faculty approval" });
  }
});

// Route: Chairperson approval for various milestones
router.patch("/:groupId/milestones/:milestoneType/chairperson-approve", async (req, res) => {
  try {
    const { groupId, milestoneType } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Validate milestone type
    const validMilestones = ["complete_copyright", "pass_turnitin", "upload_all_docs", "describe_work"];
    if (!validMilestones.includes(milestoneType)) {
      return res.status(400).json({ error: "Invalid milestone type for chairperson approval" });
    }

    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": milestoneType },
      {
        $push: {
          "milestones.$.verified.chairperson": {
            approved: true,
            approved_at: new Date(),
            approved_by: name
          }
        },
        $set: { "milestones.$.updated_at": new Date() }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    // Update group progress asynchronously (fire and forget)
    updateGroupProgress(groupId).catch(err => 
      console.error(`Background progress update failed for group ${groupId}:`, err)
    );

    res.json({ message: "Chairperson approval recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording chairperson approval" });
  }
});

// Route: Panelist approval for upload_manuscript milestone
router.patch("/:groupId/milestones/upload_manuscript/approve", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { panelist_id, name } = req.body;

    if (!panelist_id || !name) {
      return res
        .status(400)
        .json({ error: "panelist_id and name are required" });
    }

    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": "upload_manuscript" },
      {
        $addToSet: {
          "milestones.$.approved_by": {
            panelist_id,
            name,
            approved_at: new Date(),
          },
        },
        $set: { "milestones.$.updated_at": new Date() },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    res.json({ message: "Panelist approval recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording panelist approval" });
  }
});

// Route: Manually refresh group progress
router.patch("/:groupId/refresh-progress", async (req, res) => {
  try {
    const { groupId } = req.params;
    
    await updateGroupProgress(groupId);
    const updatedGroup = await groupsCollection.findOne({ group_id: groupId });
    
    if (!updatedGroup) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    res.json({ 
      message: "Progress refreshed successfully", 
      progress: updatedGroup.progress 
    });
  } catch (err) {
    console.error(`Error refreshing progress for group ${groupId}:`, err);
    res.status(500).json({ error: "Error refreshing group progress" });
  }
});

// Route: Generic group update (unchanged)
router.patch("/:group_id", async (req, res) => {
  try {
    const { group_id } = req.params;

    const existingDoc = await groupsCollection.findOne({ group_id });
    if (!existingDoc) {
      return res.status(404).json({ error: "Group not found" });
    }

    const updateFields = {};
    if (req.body.title !== undefined) updateFields.title = req.body.title;
    if (req.body.leader) updateFields.leader = req.body.leader;
    if (req.body.members) updateFields.members = req.body.members;

    if (req.body.milestones && typeof req.body.milestones === "object") {
      updateFields.milestones = deepMerge(
        { ...existingDoc.milestones },
        req.body.milestones
      );
    }

    if (req.body.progress) {
      const validEnums = ["not_started", "ongoing", "completed", "rejected"];
      if (!validEnums.includes(req.body.progress)) {
        return res.status(400).json({ error: "Invalid progress value" });
      }
      updateFields.progress = req.body.progress;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.updated_at = new Date();

    await groupsCollection.updateOne({ group_id }, { $set: updateFields });
    const updatedDoc = await groupsCollection.findOne({ group_id });

    res.json({
      message: "Group updated successfully",
      group: updatedDoc,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating group" });
  }
});

// Route: Delete group
router.delete("/:group_id", async (req, res) => {
  try {
    const result = await groupsCollection.deleteOne({ group_id: req.params.group_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({
      message: `Group ${req.params.group_id} deleted successfully`,
      deletedId: req.params.group_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting group" });
  }
});

export default router;