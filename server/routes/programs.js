import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";

const router = express.Router();
const collection = RepoMongodb.collection("programs"); // collection name

// -------------------- Routes --------------------

// GET all programs (limit 50 for safety)
router.get("/", async (req, res) => {
  try {
    const results = await collection.find({}).limit(50).toArray();
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching programs" });
  }
});

// GET single program by program_id
router.get("/:program_id", async (req, res) => {
  try {
    const result = await collection.findOne({ program_id: req.params.program_id });

    if (!result) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching program" });
  }
});

// POST new program
router.post("/", async (req, res) => {
  try {
    const { program_id, department, program, chairperson_id } = req.body;

    if (!program_id || !department || !program || !chairperson_id) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Prevent duplicate program_id
    const existing = await collection.findOne({ program_id });
    if (existing) {
      return res.status(409).json({ success: false, message: "Program ID already exists" });
    }

    const newProgram = {
      program_id,
      department,
      program,
      chairperson_id,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await collection.insertOne(newProgram);

    res.status(201).json({
      success: true,
      message: "Program created successfully",
      data: { insertedId: result.insertedId, program_id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error adding program" });
  }
});

// PUT update program by program_id
router.put("/:program_id", async (req, res) => {
  try {
    const { program_id } = req.params;
    const { department, program, chairperson_id } = req.body;

    const updateFields = {};
    if (department?.trim()) updateFields.department = department;
    if (program?.trim()) updateFields.program = program;
    if (chairperson_id?.trim()) updateFields.chairperson_id = chairperson_id;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    updateFields.updated_at = new Date();

    const result = await collection.updateOne(
      { program_id },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    res.json({
      success: true,
      message: "Program updated successfully",
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error updating program" });
  }
});

// DELETE a program by program_id
router.delete("/:program_id", async (req, res) => {
  try {
    const result = await collection.deleteOne({ program_id: req.params.program_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    res.status(200).json({
      success: true,
      message: `Program ${req.params.program_id} deleted successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting program" });
  }
});

export default router;
