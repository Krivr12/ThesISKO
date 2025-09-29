import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../data/database.js';
import { adminCreateFaculty } from '../controller/userController.js';

const router = express.Router();


// GET /admin/faculty - Get all faculty members
router.get('/faculty', async (req, res) => {
  try {
    let rows;
    
    try {
      // Try to get faculty with status column
      [rows] = await pool.execute(
        'SELECT user_id, firstname, lastname, email, faculty_id, status, created_at FROM users_info WHERE role_id = 3 ORDER BY created_at DESC'
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('status')) {
        // Status column doesn't exist, get faculty without status
        console.log('Status column not found, fetching faculty without status field');
        [rows] = await pool.execute(
          'SELECT user_id, firstname, lastname, email, faculty_id, created_at FROM users_info WHERE role_id = 3 ORDER BY created_at DESC'
        );
        
        // Add default status for each faculty member
        rows = rows.map(faculty => ({
          ...faculty,
          status: 'Faculty'
        }));
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
    
    res.json(rows);
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
    const [existingRows] = await pool.execute(
      'SELECT user_id FROM users_info WHERE email = ? AND user_id != ?',
      [email, id]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check if faculty ID already exists (excluding current user)
    const [facultyRows] = await pool.execute(
      'SELECT user_id FROM users_info WHERE faculty_id = ? AND user_id != ?',
      [faculty_id, id]
    );

    if (facultyRows.length > 0) {
      return res.status(400).json({ error: 'Faculty ID already exists' });
    }

    // Update faculty member
    const [result] = await pool.execute(
      'UPDATE users_info SET firstname = ?, lastname = ?, email = ?, faculty_id = ? WHERE user_id = ? AND role_id = 3',
      [firstname, lastname, email, faculty_id, id]
    );

    if (result.affectedRows === 0) {
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

    const [result] = await pool.execute(
      'DELETE FROM users_info WHERE user_id = ? AND role_id = 3',
      [id]
    );

    if (result.affectedRows === 0) {
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
    const [result] = await pool.execute(
      'UPDATE users_info SET password_hash = ? WHERE user_id = ? AND role_id = 3',
      [password_hash, id]
    );

    if (result.affectedRows === 0) {
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

// DELETE /admin/faculty/:id - Delete faculty member
router.delete('/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if faculty exists
    const [existingFaculty] = await pool.execute(
      'SELECT user_id, firstname, lastname, email FROM users_info WHERE user_id = ? AND role_id = 3',
      [id]
    );

    if (existingFaculty.length === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    // Delete faculty member
    const [result] = await pool.execute(
      'DELETE FROM users_info WHERE user_id = ? AND role_id = 3',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    res.json({
      success: true,
      message: 'Faculty member deleted successfully',
      deleted_faculty: {
        user_id: id,
        firstname: existingFaculty[0].firstname,
        lastname: existingFaculty[0].lastname,
        email: existingFaculty[0].email
      }
    });

  } catch (error) {
    console.error('Error deleting faculty member:', error);
    res.status(500).json({ error: 'Failed to delete faculty member' });
  }
});

export default router;
