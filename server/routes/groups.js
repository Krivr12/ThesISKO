import express from "express";
import { ObjectId } from "mongodb";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";

const router = express.Router();
const groupsCollection = RepoMongodb.collection("groups");
const blocksCollection = RepoMongodb.collection("blocks"); // for dynamic panelist count

// -------------------- Helper: Deep Merge --------------------
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

// -------------------- Routes --------------------

// GET all groups (limit 50 for safety)
router.get("/", async (req, res) => {
  try {
    const results = await groupsCollection.find({}).limit(50).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// GET single group by group_id
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

// POST new group
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
          verified: { chairperson: { approved: false, approved_at: null } },
          created_at: now,
          updated_at: now,
        },
        {
          type: "pass_turnitin",
          status: false,
          s3_key: [],
          verified: { chairperson: { approved: false, approved_at: null } },
          created_at: now,
          updated_at: now,
        },
        {
          type: "upload_all_docs",
          status: false,
          s3_key: [],
          verified: { chairperson: { approved: false, approved_at: null } },
          created_at: now,
          updated_at: now,
        },
        {
          type: "describe_work",
          status: false,
          verified: { chairperson: { approved: false, approved_at: null } },
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

// -------------------- NEW FILE ROUTE --------------------
// PATCH files for a milestone
router.patch("/:groupId/milestones/:milestoneType/files", async (req, res) => {
  try {
    const { groupId, milestoneType } = req.params;
    const { action, files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files must be a non-empty array" });
    }

    // only allow PDF files
    const invalid = files.filter(f => !f.toLowerCase().endsWith(".pdf"));
    if (invalid.length > 0) {
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    let updateQuery;
    if (action === "add") {
      updateQuery = { $addToSet: { "milestones.$.s3_key": { $each: files } } };
    } else if (action === "remove") {
      updateQuery = { $pull: { "milestones.$.s3_key": { $in: files } } };
    } else if (action === "replace") {
      updateQuery = { $set: { "milestones.$.s3_key": files } };
    } else {
      return res.status(400).json({ error: "Invalid action. Use add, remove, or replace." });
    }

    updateQuery.$set = { ...(updateQuery.$set || {}), "milestones.$.updated_at": new Date() };

    const result = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": milestoneType },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    const updatedGroup = await groupsCollection.findOne({ group_id: groupId });

    res.json({
      message: `Files ${action}d successfully for ${milestoneType}`,
      group: updatedGroup,
    });
  } catch (err) {
    console.error("Error updating milestone files:", err);
    res.status(500).json({ error: "Error updating milestone files" });
  }
});

// -------------------- Existing Approval Routes --------------------

// PATCH panelist approval (upload_manuscript)
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

// (rest of your routes stay unchanged...)

// -------------------- Generic PATCH (unchanged) --------------------
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

// DELETE group (unchanged)
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
