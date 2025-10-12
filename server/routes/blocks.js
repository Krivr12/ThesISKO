import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";

const router = express.Router();
const collection = RepoMongodb.collection("blocks"); // collection name

// -------------------- Routes --------------------

// GET all blocks (limit 50 for safety)
router.get("/", async (req, res) => {
  try {
    const results = await collection.find({}).limit(50).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching blocks" });
  }
});

// GET single block by block_id
router.get("/:block_id", async (req, res) => {
  try {
    const result = await collection.findOne({ block_id: req.params.block_id });

    if (!result) {
      return res.status(404).json({ error: "Block not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching block" });
  }
});

// POST new block
router.post("/", async (req, res) => {
  try {
    const { 
      academic_year, 
      program_id, 
      block_code, 
      faculty_in_charge,           // Faculty name
      faculty_in_charge_email,     // Faculty email
      panelists,                   // Array of panelist names
      panelists_email              // Array of panelist emails
    } = req.body;

    if (!academic_year || !program_id || !block_code) {
      return res.status(400).json({ error: "Missing required fields: academic_year, program_id, block_code" });
    }

    // Build block_id: academic_year-program_id-block_code
    const block_id = `${academic_year}-${program_id}-${block_code}`;

    // 🔹 Prevent duplicate block_id
    const existing = await collection.findOne({ block_id });
    if (existing) {
      return res.status(400).json({ error: "Block already exists" });
    }

    // Validate panelists arrays have same length
    const panelistsArray = Array.isArray(panelists) ? panelists : [];
    const panelistsEmailArray = Array.isArray(panelists_email) ? panelists_email : [];
    
    if (panelistsArray.length !== panelistsEmailArray.length) {
      return res.status(400).json({ error: "Panelists names and emails must have same length" });
    }

    // Prevent faculty_in_charge_email from being in panelists_email[]
    if (faculty_in_charge_email && panelistsEmailArray.includes(faculty_in_charge_email)) {
      return res.status(400).json({ error: "Faculty in Charge cannot also be a panelist" });
    }

    // Prevent duplicate panelists
    const uniquePanelistEmails = new Set(panelistsEmailArray);
    if (uniquePanelistEmails.size !== panelistsEmailArray.length) {
      return res.status(400).json({ error: "Duplicate panelists are not allowed" });
    }

    const newBlock = {
      block_id,
      academic_year,
      program_id,
      block_code,
      faculty_in_charge: faculty_in_charge || "",
      faculty_in_charge_email: faculty_in_charge_email || "",
      panelists: panelistsArray,
      panelists_email: panelistsEmailArray,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await collection.insertOne(newBlock);

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      block_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding block" });
  }
});

// PUT update block by block_id
router.put("/:block_id", async (req, res) => {
  try {
    const { block_id } = req.params;

    // Fetch the existing block
    const existingBlock = await collection.findOne({ block_id });
    if (!existingBlock) {
      return res.status(404).json({ error: "Block not found" });
    }

    const updateFields = {};
    if (req.body.academic_year) updateFields.academic_year = req.body.academic_year;
    if (req.body.program_id) updateFields.program_id = req.body.program_id;
    if (req.body.block_code) updateFields.block_code = req.body.block_code;
    if (req.body.faculty_in_charge !== undefined) updateFields.faculty_in_charge = req.body.faculty_in_charge;
    if (req.body.faculty_in_charge_email !== undefined) updateFields.faculty_in_charge_email = req.body.faculty_in_charge_email;

    // Use updated faculty_in_charge_email if provided, otherwise use the existing one
    const facultyInChargeEmail = req.body.faculty_in_charge_email || existingBlock.faculty_in_charge_email;

    // Handle panelists update
    if (req.body.panelists !== undefined) {
      updateFields.panelists = Array.isArray(req.body.panelists) ? req.body.panelists : [];
    }
    if (req.body.panelists_email !== undefined) {
      updateFields.panelists_email = Array.isArray(req.body.panelists_email) ? req.body.panelists_email : [];
    }

    // Get final panelists arrays (either updated or existing)
    const finalPanelists = updateFields.panelists !== undefined ? updateFields.panelists : (existingBlock.panelists || []);
    const finalPanelistsEmail = updateFields.panelists_email !== undefined ? updateFields.panelists_email : (existingBlock.panelists_email || []);

    // Validate panelists arrays have same length
    if (finalPanelists.length !== finalPanelistsEmail.length) {
      return res.status(400).json({ error: "Panelists names and emails must have same length" });
    }

    // Prevent faculty_in_charge_email from being in panelists_email[]
    if (facultyInChargeEmail && finalPanelistsEmail.includes(facultyInChargeEmail)) {
      return res.status(400).json({ error: "Faculty in Charge cannot also be a panelist" });
    }

    // Prevent duplicate panelists
    const uniquePanelistEmails = new Set(finalPanelistsEmail);
    if (uniquePanelistEmails.size !== finalPanelistsEmail.length) {
      return res.status(400).json({ error: "Duplicate panelists are not allowed" });
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.updated_at = new Date();

    const result = await collection.updateOne(
      { block_id },
      { $set: updateFields }
    );

    res.json({
      success: true,
      message: "Block updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating block" });
  }
});


// DELETE a block by block_id
router.delete("/:block_id", async (req, res) => {
  try {
    const result = await collection.deleteOne({ block_id: req.params.block_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

    res.status(200).json({
      message: `Block ${req.params.block_id} deleted successfully`  ,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting block" });
  }
});

export default router;