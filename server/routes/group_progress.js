import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";

const router = express.Router();
const collection = RepoMongodb.collection("group_progress");

// GET all group progress
router.get("/", async (req, res) => {
  try {
    const results = await collection.find({}).toArray();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching group progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST new group
router.post("/create-progress", async (req, res) => {
  try {
    const { group_id, faculty_ids } = req.body;

    // Validate input
    if (!group_id || !faculty_ids || !Array.isArray(faculty_ids) || faculty_ids.length !== 3) {
      return res.status(400).json({ error: "group_id and exactly 3 faculty_ids are required" });
    }

    // Check if group_id already exists
    const existing = await collection.findOne({ group_id });
    if (existing) {
      return res.status(409).json({ error: "Group progress for this group_id already exists" });
    }

    // Base structure
    let newDoc = {
      group_id: group_id,
      title: "None",
      upload_manuscript: "false",
      complete_copyright: "false",
      pass_turnitin: "false",
      upload_all_docs: "false",
      describe_work: "false",
    };

    // Add faculty approvals
    faculty_ids.forEach((fid) => {
      newDoc[`panelist_${fid}_approved`] = "false";
    });

    // Insert into MongoDB
    const result = await collection.insertOne(newDoc);

    res.status(201).json({
      message: "Group progress created successfully",
      insertedId: result.insertedId,
      data: newDoc
    });
  } catch (error) {
    console.error("Error creating group progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT update title
router.put("/update-title", async (req, res) => {
  try {
    const { group_id, title } = req.body;

    if (!group_id || !title) {
      return res.status(400).json({ error: "group_id and title are required" });
    }

    // Update the document
    const result = await collection.updateOne(
      { group_id }, // find by group_id
      { $set: { title } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({ message: "Title updated successfully", group_id, title });
  } catch (error) {
    console.error("Error updating title:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT update upload_manuscript to 'true'
router.put("/upload_manuscript/:group_id", async (req, res) => {
  try {
    const {group_id} = req.params;

    const result = await collection.updateOne(
      {group_id} , 
      {$set:{upload_manuscript: "true"}}
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({error: "Group not found"});
    }

    res.status(200).json({message: "upload_manuscript updated to true"});
  } catch (error) {
    console.error("Error updating upload_manuscript:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// PUT update complete_copyright to 'true'
router.put("/complete_copyright/:group_id", async (req, res) => {
  try {
    const {group_id} = req.params;

    const result = await collection.updateOne(
      {group_id} , 
      {$set:{complete_copyright: "true"}}
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({error: "Group not found"});
    }

    res.status(200).json({message: "complete_copyright updated to true"});
  } catch (error) {
    console.error("Error updating complete_copyright:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// PUT update pass_turnitin to 'true'
router.put("/pass_turnitin/:group_id", async (req, res) => {
  try {
    const {group_id} = req.params;

    const result = await collection.updateOne(
      {group_id} , 
      {$set:{pass_turnitin: "true"}}
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({error: "Group not found"});
    }

    res.status(200).json({message: "pass_turnitin updated to true"});
  } catch (error) {
    console.error("Error updating pass_turnitin:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// PUT update upload_all_docs to 'true'
router.put("/upload_all_docs/:group_id", async (req, res) => {
  try {
    const {group_id} = req.params;

    const result = await collection.updateOne(
      {group_id} , 
      {$set:{upload_all_docs: "true"}}
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({error: "Group not found"});
    }

    res.status(200).json({message: "upload_all_docs updated to true"});
  } catch (error) {
    console.error("Error updating upload_all_docs:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// PUT update describe_work to 'true'
router.put("/describe_work/:group_id", async (req, res) => {
  try {
    const {group_id} = req.params;

    const result = await collection.updateOne(
      {group_id} , 
      {$set:{describe_work: "true"}}
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({error: "Group not found"});
    }

    res.status(200).json({message: "describe_work updated to true"});
  } catch (error) {
    console.error("Error updating describe_work:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// PUT update specific faculty 
router.put("/update-faculty-status", async (req, res) => {
  try {
    const { group_id, faculty_id } = req.body;

    if (!group_id || !faculty_id) {
      return res.status(400).json({ error: "group_id and faculty_id are required" });
    }

    // Build dynamic key for update
    const key = `panelist_${fid}_approved`;

    // Update only that faculty_id's approval
    const result = await collection.updateOne(
      { group_id: group_id }, // find document by group_id
      { $set: { [key]: "true" } } // update only the matching faculty
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({ message: `Faculty ${faculty_id} marked as approved`, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error updating faculty status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE group_progress
router.delete("/delete", async (req, res) => {
  try {
    const { group_id } = req.body;

    if (!group_id) {
      return res.status(400).json({ error: "group_id is required" });
    }

    // Delete the document
    const result = await collection.deleteOne({ group_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({ message: "Group progress deleted successfully", group_id });
  } catch (error) {
    console.error("Error deleting group progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Flexible status checker
router.get("/check-status/:group_id/:requirement", async (req, res) => {
  try {
    const { group_id, requirement } = req.params;

    // Find the group progress doc
    const group = await collection.findOne({ group_id: group_id });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if requirement field exists
    if (!(requirement in group)) {
      return res.status(400).json({ error: `Requirement "${requirement}" not found` });
    }

    // Return status
    const status = group[requirement] === "true";
    res.status(200).json({
      requirement,
      status,
      canProceed: status // alias, useful for frontend
    });

  } catch (error) {
    console.error("Error checking status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
