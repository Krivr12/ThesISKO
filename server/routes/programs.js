import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";
import pool from '../data/database.js';

const router = express.Router();
const collection = RepoMongodb.collection("programs"); // collection name

// -------------------- Routes --------------------

// GET available faculty (not yet assigned as chairpersons)
router.get("/faculty/available", async (req, res) => {
  try {
    const query = `
      SELECT ui.email, ui.firstname, ui.lastname, ui.faculty_id
      FROM users_info ui
      WHERE ui.faculty_id IS NOT NULL
        AND (ui.admin_program IS NULL OR ui.admin_program = '')
      ORDER BY ui.lastname, ui.firstname
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({ 
      success: true, 
      data: result.rows 
    });
  } catch (err) {
    console.error('Error fetching available faculty:', err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching available faculty" 
    });
  }
});

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
    const { program_id, department_id, department_name, program_name, chairperson_email } = req.body;

    // Validate required fields
    if (!program_id || !department_id || !department_name || !program_name || !chairperson_email) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required: program_id, department_id, department_name, program_name, chairperson_email" 
      });
    }

    // 1. Check if program_id already exists
    const existingProgram = await collection.findOne({ program_id });
    if (existingProgram) {
      return res.status(409).json({ 
        success: false, 
        message: `Program ID '${program_id}' already exists` 
      });
    }

    // 2. Verify chairperson exists and has faculty_id
    const chairpersonQuery = `
      SELECT email, faculty_id, admin_program, program_id
      FROM users_info
      WHERE email = $1 AND faculty_id IS NOT NULL
    `;
    const chairpersonResult = await pool.query(chairpersonQuery, [chairperson_email]);

    if (chairpersonResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Chairperson not found or does not have faculty_id" 
      });
    }

    const chairperson = chairpersonResult.rows[0];

    // 3. Check if chairperson is already assigned to another program
    if (chairperson.admin_program && chairperson.admin_program !== '') {
      return res.status(400).json({ 
        success: false, 
        message: `Chairperson is already assigned to program: ${chairperson.admin_program}` 
      });
    }

    // 4. Insert program into MongoDB
    const newProgram = {
      program_id,
      department_id,
      department_name,
      program_name,
      chairperson_email,
      created_at: new Date(),
      edited_at: new Date(),
    };

    const mongoResult = await collection.insertOne(newProgram);

    // 5. Update chairperson in Supabase
    // If they don't have a program_id yet, assign them to this program as faculty
    // If they already have a program_id, keep it (they're faculty in a different program)
    const hasExistingProgram = chairperson.program_id && chairperson.program_id !== '';
    
    if (hasExistingProgram) {
      // Keep existing program_id, only update chairperson role
      await pool.query(`
        UPDATE users_info
        SET role_id = 7,
            admin_type = 'ADMIN',
            admin_program = $1
        WHERE email = $2
      `, [program_id, chairperson_email]);
      console.log(`✅ Program '${program_id}' created with chairperson ${chairperson_email} (keeping faculty status in ${chairperson.program_id})`);
    } else {
      // No existing program, assign them as faculty in this program
      await pool.query(`
        UPDATE users_info
        SET role_id = 7,
            admin_type = 'ADMIN',
            admin_program = $1,
            program_id = $1
        WHERE email = $2
      `, [program_id, chairperson_email]);
      console.log(`✅ Program '${program_id}' created with chairperson ${chairperson_email} (also assigned as faculty)`);
    }

    res.status(201).json({
      success: true,
      message: "Program created successfully and chairperson assigned",
      data: { 
        insertedId: mongoResult.insertedId, 
        program_id,
        chairperson_email 
      },
    });
  } catch (err) {
    console.error('❌ Error creating program:', err);
    res.status(500).json({ success: false, message: "Error adding program" });
  }
});

// PUT update program by program_id (including chairperson reassignment)
router.put("/:program_id", async (req, res) => {
  try {
    const { program_id } = req.params;
    const { department_id, department_name, program_name, chairperson_email } = req.body;

    // Check if program exists
    const existingProgram = await collection.findOne({ program_id });
    if (!existingProgram) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    const updateFields = {};
    if (department_id?.trim()) updateFields.department_id = department_id;
    if (department_name?.trim()) updateFields.department_name = department_name;
    if (program_name?.trim()) updateFields.program_name = program_name;

    // Handle chairperson change
    if (chairperson_email && chairperson_email !== existingProgram.chairperson_email) {
      // Verify new chairperson exists and has faculty_id
      const newChairQuery = `
        SELECT email, faculty_id, admin_program, program_id
        FROM users_info
        WHERE email = $1 AND faculty_id IS NOT NULL
      `;
      const newChairResult = await pool.query(newChairQuery, [chairperson_email]);

      if (newChairResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "New chairperson not found or does not have faculty_id" 
        });
      }

      const newChair = newChairResult.rows[0];

      // Check if new chairperson is already assigned
      if (newChair.admin_program && newChair.admin_program !== '' && newChair.admin_program !== program_id) {
        return res.status(400).json({ 
          success: false, 
          message: `New chairperson is already assigned to program: ${newChair.admin_program}` 
        });
      }

      // Unassign old chairperson (revert role_id to 3 - faculty, keep their program_id)
      if (existingProgram.chairperson_email) {
        await pool.query(`
          UPDATE users_info
          SET role_id = 3,
              admin_type = NULL,
              admin_program = NULL
          WHERE email = $1
        `, [existingProgram.chairperson_email]);
        console.log(`✅ Demoted ${existingProgram.chairperson_email} to faculty (kept program_id)`);
      }

      // Assign new chairperson
      // If they don't have a program_id, assign them to this program as faculty
      // If they already have a program_id, keep it
      const hasExistingProgram = newChair.program_id && newChair.program_id !== '';
      
      if (hasExistingProgram) {
        // Keep existing program_id
        await pool.query(`
          UPDATE users_info
          SET role_id = 7,
              admin_type = 'ADMIN',
              admin_program = $1
          WHERE email = $2
        `, [program_id, chairperson_email]);
        console.log(`✅ Assigned ${chairperson_email} as chairperson of ${program_id} (keeping faculty status in ${newChair.program_id})`);
      } else {
        // No existing program, assign them as faculty in this program
        await pool.query(`
          UPDATE users_info
          SET role_id = 7,
              admin_type = 'ADMIN',
              admin_program = $1,
              program_id = $1
          WHERE email = $2
        `, [program_id, chairperson_email]);
        console.log(`✅ Assigned ${chairperson_email} as chairperson of ${program_id} (also assigned as faculty)`);
      }

      updateFields.chairperson_email = chairperson_email;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    updateFields.edited_at = new Date();

    const result = await collection.updateOne(
      { program_id },
      { $set: updateFields }
    );

    res.json({
      success: true,
      message: "Program updated successfully",
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    console.error('❌ Error updating program:', err);
    res.status(500).json({ success: false, message: "Error updating program" });
  }
});

// DELETE a program by program_id (also unassigns chairperson)
router.delete("/:program_id", async (req, res) => {
  try {
    const { program_id } = req.params;

    // Get program details before deletion
    const program = await collection.findOne({ program_id });
    
    if (!program) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    // Unassign chairperson if exists (revert role_id to 3 - faculty)
    // Keep their program_id - they remain faculty in their program even if they were demoted
    if (program.chairperson_email) {
      await pool.query(`
        UPDATE users_info
        SET role_id = 3,
            admin_type = NULL,
            admin_program = NULL
        WHERE email = $1
      `, [program.chairperson_email]);
      
      console.log(`✅ Unassigned chairperson ${program.chairperson_email} from program ${program_id} (kept program_id for faculty status)`);
    }

    // Delete program from MongoDB
    const result = await collection.deleteOne({ program_id });

    res.status(200).json({
      success: true,
      message: `Program ${program_id} deleted successfully and chairperson unassigned`,
    });
  } catch (err) {
    console.error('❌ Error deleting program:', err);
    res.status(500).json({ success: false, message: "Error deleting program" });
  }
});

export default router;
