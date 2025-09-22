import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";

const router = express.Router();
const collection = RepoMongodb.collection("groups");

// -------------------- Helper: Deep Merge --------------------
function deepMerge(target, source) {
  for (const key in source) {
    if (Array.isArray(source[key])) {
      // Merge arrays instead of replacing
      target[key] = [...(target[key] || []), ...source[key]];
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

// GET all groups (limit 50)
router.get("/", async (req, res) => {
  try {
    const results = await collection.find({}).limit(50).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// GET single group by group_id
router.get("/:group_id", async (req, res) => {
  try {
    const result = await collection.findOne({ group_id: req.params.group_id });

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
      return res.status(400).json({ error: "block_id and leader.email are required" });
    }

    // Count how many groups already exist for this block
    const count = await collection.countDocuments({ block_id });
    const group_id = `${block_id}_${count + 1}`;

    const newGroup = {
      group_id,
      block_id,
      title: title || null,
      leader,
      members: Array.isArray(members) ? members : [],
      milestones: {
        upload_manuscript: { status: false, s3_key: null, approved_by: [], verified: { faculty_in_charge: false } },
        complete_copyright: { status: false, s3_key: null, verified: { chairperson: false } },
        pass_turnitin: { status: false, s3_key: null, verified: { chairperson: false } },
        upload_all_docs: { status: false, s3_key: [], verified: { chairperson: false } },
        describe_work: { status: false, verified: { chairperson: false } }
      },
      progress: "not_started",  // default enum
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await collection.insertOne(newGroup);

    res.status(201).json({
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating group" });
  }
});

// PUT update group by group_id
router.put("/:group_id", async (req, res) => {
  try {
    const { group_id } = req.params;

    // Fetch existing doc to merge milestones safely
    const existingDoc = await collection.findOne({ group_id });
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

    await collection.updateOne({ group_id }, { $set: updateFields });
    const updatedDoc = await collection.findOne({ group_id });

    res.json({
      message: "Group updated successfully",
      group: updatedDoc,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating group" });
  }
});

// DELETE a group by group_id
router.delete("/:group_id", async (req, res) => {
  try {
    const result = await collection.deleteOne({ group_id: req.params.group_id });

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
