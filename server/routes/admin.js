import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../data/database.js';
import { adminCreateFaculty } from '../controller/userController.js';

const router = express.Router();


// GET /admin/faculty - Get all faculty members
router.get('/faculty', async (req, res) => {
  try {
    let result;
    
    try {
      // Try to get faculty with status column
      result = await pool.query(
        'SELECT user_id, firstname, lastname, email, faculty_id, status, created_at FROM users_info WHERE role_id = 3 ORDER BY created_at DESC'
      );
    } catch (error) {
      if (error.code === '42703') { // PostgreSQL error code for undefined column
        // Status column doesn't exist, get faculty without status
        // Status column not found, using fallback query
        result = await pool.query(
          'SELECT user_id, firstname, lastname, email, faculty_id, created_at FROM users_info WHERE role_id = 3 ORDER BY created_at DESC'
        );
        
        // Add default status for each faculty member
        result.rows = result.rows.map(faculty => ({
          ...faculty,
          status: 'Faculty'
        }));
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Failed to fetch faculty members' });
  }
});


// POST /admin/faculty - Create new faculty member (with auto-generated password and email)
router.post('/faculty', adminCreateFaculty);




// PUT /admin/faculty/:id - Update faculty member
router.put('/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, email, faculty_id } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !email || !faculty_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email already exists (excluding current user)
    const existingResult = await pool.query(
      'SELECT user_id FROM users_info WHERE email = $1 AND user_id != $2',
      [email, id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check if faculty ID already exists (excluding current user)
    const facultyResult = await pool.query(
      'SELECT user_id FROM users_info WHERE faculty_id = $1 AND user_id != $2',
      [faculty_id, id]
    );

    if (facultyResult.rows.length > 0) {
      return res.status(400).json({ error: 'Faculty ID already exists' });
    }

    // Update faculty member
    const result = await pool.query(
      'UPDATE users_info SET firstname = $1, lastname = $2, email = $3, faculty_id = $4 WHERE user_id = $5 AND role_id = 3',
      [firstname, lastname, email, faculty_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    res.json({
      success: true,
      message: 'Faculty member updated successfully',
      faculty_id: faculty_id
    });

  } catch (error) {
    console.error('Error updating faculty member:', error);
    res.status(500).json({ error: 'Failed to update faculty member' });
  }
});

// DELETE /admin/faculty/:id - Delete faculty member
router.delete('/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM users_info WHERE user_id = $1 AND role_id = 3',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    res.json({
      success: true,
      message: 'Faculty member deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting faculty member:', error);
    res.status(500).json({ error: 'Failed to delete faculty member' });
  }
});

// POST /admin/faculty/:id/reset-password - Reset faculty password
router.post('/faculty/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Hash new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const result = await pool.query(
      'UPDATE users_info SET password_hash = $1 WHERE user_id = $2 AND role_id = 3',
      [password_hash, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});


export default router;
