import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";
import pool from "../data/database.js"; // PostgreSQL connection for users_info

const router = express.Router();
const collection = RepoMongodb.collection("blocks"); // collection name
const programsCollection = RepoMongodb.collection("programs"); // programs collection

// -------------------- Routes --------------------

// GET faculty's blocks (FIC and Panelist)
router.get("/faculty/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    // Find blocks where faculty is FIC
    const ficBlocks = await collection.find({ 
      faculty_in_charge_email: email 
    }).toArray();

    // Find blocks where faculty is a panelist
    const panelistBlocks = await collection.find({ 
      panelists_email: email 
    }).toArray();

    // Get unique program_ids
    const ficProgramIds = [...new Set(ficBlocks.map(b => b.program_id))];
    const panelistProgramIds = [...new Set(panelistBlocks.map(b => b.program_id))];

    // Fetch program details from programs collection
    const allProgramIds = [...new Set([...ficProgramIds, ...panelistProgramIds])];
    const programs = await programsCollection.find({
      program_id: { $in: allProgramIds }
    }).toArray();

    // Create program lookup map
    const programMap = {};
    programs.forEach(p => {
      programMap[p.program_id] = {
        program_id: p.program_id,
        program_name: p.program_name,
        department_id: p.department_id,
        department_name: p.department_name
      };
    });

    console.log('📊 Programs found:', programs.length);
    console.log('📋 Program IDs in map:', Object.keys(programMap));
    console.log('📚 FIC blocks program_ids:', ficBlocks.map(b => b.program_id));
    console.log('👥 Panelist blocks program_ids:', panelistBlocks.map(b => b.program_id));

    // Group FIC blocks by program
    const ficByProgram = {};
    ficBlocks.forEach(block => {
      if (!ficByProgram[block.program_id]) {
        const programInfo = programMap[block.program_id];
        if (!programInfo) {
          console.warn(`⚠️ No program found for program_id: ${block.program_id} (block: ${block.block_id})`);
        }
        ficByProgram[block.program_id] = {
          program_id: block.program_id,
          program_name: programInfo?.program_name || `Unknown Program (${block.program_id})`,
          department_id: programInfo?.department_id,
          department_name: programInfo?.department_name,
          blocks: []
        };
      }
      ficByProgram[block.program_id].blocks.push({
        block_id: block.block_id,
        academic_year: block.academic_year,
        block_code: block.block_code
      });
    });

    // Group panelist blocks by program
    const panelistByProgram = {};
    panelistBlocks.forEach(block => {
      if (!panelistByProgram[block.program_id]) {
        const programInfo = programMap[block.program_id];
        if (!programInfo) {
          console.warn(`⚠️ No program found for program_id: ${block.program_id} (block: ${block.block_id})`);
        }
        panelistByProgram[block.program_id] = {
          program_id: block.program_id,
          program_name: programInfo?.program_name || `Unknown Program (${block.program_id})`,
          department_id: programInfo?.department_id,
          department_name: programInfo?.department_name,
          blocks: []
        };
      }
      panelistByProgram[block.program_id].blocks.push({
        block_id: block.block_id,
        academic_year: block.academic_year,
        block_code: block.block_code
      });
    });

    res.status(200).json({
      success: true,
      data: {
        ficBlocks: Object.values(ficByProgram),
        panelistBlocks: Object.values(panelistByProgram)
      }
    });
  } catch (err) {
    console.error('Error fetching faculty blocks:', err);
    res.status(500).json({ 
      success: false,
      error: "Error fetching faculty blocks" 
    });
  }
});

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

    // Update faculty_in_charge's block_id in PostgreSQL users_info
    if (faculty_in_charge_email) {
      try {
        await pool.query(
          'UPDATE users_info SET block_id = $1 WHERE email = $2',
          [block_id, faculty_in_charge_email]
        );
        console.log(`✅ Updated block_id for faculty: ${faculty_in_charge_email} → ${block_id}`);
      } catch (dbError) {
        console.error('⚠️ Failed to update faculty block_id in users_info:', dbError);
        // Don't fail the entire operation, just log the error
      }
    }

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

    // Update faculty_in_charge's block_id in PostgreSQL users_info if it changed
    if (req.body.faculty_in_charge_email !== undefined) {
      const oldEmail = existingBlock.faculty_in_charge_email;
      const newEmail = req.body.faculty_in_charge_email;

      try {
        // Clear old faculty's block_id if it changed
        if (oldEmail && oldEmail !== newEmail) {
          await pool.query(
            'UPDATE users_info SET block_id = NULL WHERE email = $1 AND block_id = $2',
            [oldEmail, block_id]
          );
          console.log(`✅ Cleared block_id for old faculty: ${oldEmail}`);
        }

        // Set new faculty's block_id
        if (newEmail) {
          await pool.query(
            'UPDATE users_info SET block_id = $1 WHERE email = $2',
            [block_id, newEmail]
          );
          console.log(`✅ Updated block_id for new faculty: ${newEmail} → ${block_id}`);
        }
      } catch (dbError) {
        console.error('⚠️ Failed to update faculty block_id in users_info:', dbError);
        // Don't fail the entire operation, just log the error
      }
    }

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
    const { block_id } = req.params;

    // First, get the block to find the faculty_in_charge_email
    const existingBlock = await collection.findOne({ block_id });
    
    if (!existingBlock) {
      return res.status(404).json({ error: "Block not found" });
    }

    // Delete the block
    const result = await collection.deleteOne({ block_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

    // Clear faculty_in_charge's block_id in PostgreSQL users_info
    if (existingBlock.faculty_in_charge_email) {
      try {
        await pool.query(
          'UPDATE users_info SET block_id = NULL WHERE email = $1 AND block_id = $2',
          [existingBlock.faculty_in_charge_email, block_id]
        );
        console.log(`✅ Cleared block_id for faculty: ${existingBlock.faculty_in_charge_email}`);
      } catch (dbError) {
        console.error('⚠️ Failed to clear faculty block_id in users_info:', dbError);
        // Don't fail the entire operation, just log the error
      }
    }

    res.status(200).json({
      success: true,
      message: `Block ${block_id} deleted successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting block" });
  }
});

export default router;