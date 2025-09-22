import express from "express";
import RepoMongodb from "../RepoMongodb/connection.js";
import { ObjectId } from "mongodb";

const router = express.Router();
const collection = RepoMongodb.collection("programs"); // collection name

// -------------------- Routes --------------------

// GET all programs (limit 50 for safety)
router.get("/", async (req, res) => {
  try {
    const results = await collection.find({}).limit(50).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching programs" });
  }
});

// GET single program by program_id
router.get("/:program_id", async (req, res) => {
  try {
    const result = await collection.findOne({ program_id: req.params.program_id });

    if (!result) {
      return res.status(404).json({ error: "Program not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching program" });
  }
});

// POST new program
router.post("/", async (req, res) => {
  try {
    const { program_id, department, program, chairperson_id } = req.body;

    if (!program_id || !department || !program || !chairperson_id) {
      return res.status(400).json({ error: "All fields are required" });
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
      insertedId: result.insertedId,
      program_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding program" });
  }
});

// PUT update program by program_id
router.put("/:program_id", async (req, res) => {
  try {
    const { program_id } = req.params;

    const updateFields = {};
    if (req.body.department) updateFields.department = req.body.department;
    if (req.body.program) updateFields.program = req.body.program;
    if (req.body.chairperson_id) updateFields.chairperson_id = req.body.chairperson_id;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.updated_at = new Date();

    const result = await collection.updateOne(
      { program_id },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Program not found" });
    }

    res.json({
      message: "Program updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating program" });
  }
});

// DELETE a program by program_id
router.delete("/:program_id", async (req, res) => {
  try {
    const result = await collection.deleteOne({ program_id: req.params.program_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Program not found" });
    }

    res.status(200).json({
      message: Program ${req.params.program_id} deleted successfully,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting program" });
  }
});

export default router;