import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../data/database.js';
import { adminCreateFaculty } from '../controller/userController.js';

const router = express.Router();


// GET /admin/faculty - Get all faculty members (role 3 only)
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

// GET /admin/faculty/all-roles - Get all users with roles 3, 4, 5 (Faculty, Chairperson, Dean)
router.get('/faculty/all-roles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ui.user_id,
        ui.firstname,
        ui.lastname,
        ui.email,
        ui.faculty_id,
        ui.role_id,
        r.role_name,
        ui.created_at
      FROM users_info ui
      LEFT JOIN roles r ON ui.role_id = r.role_id
      WHERE ui.role_id IN (3, 4, 5)
      ORDER BY ui.role_id ASC, ui.lastname ASC, ui.firstname ASC
    `);
    
    // Map role_id to display names
    const usersWithDisplayRoles = result.rows.map(user => ({
      ...user,
      role_display: user.role_id === 3 ? 'FACULTY' : 
                   user.role_id === 4 ? 'CHAIRPERSON' : 
                   user.role_id === 5 ? 'DEAN' : 'UNKNOWN'
    }));
    
    res.json({
      success: true,
      data: usersWithDisplayRoles
    });
  } catch (error) {
    console.error('Error fetching all role users:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users' 
    });
  }
});


// GET /admin/faculty/blocks - Get all faculty for block assignment (includes faculty, chairperson, admin+faculty, superadmin+faculty)
router.get('/faculty/blocks', async (req, res) => {
  try {
    // Get faculty with role_id 3 (Faculty), 4 (Chairperson), 7 (admin_faculty), or 8 (superadmin_faculty)
    const result = await pool.query(`
      SELECT 
        user_id,
        firstname,
        lastname,
        email,
        faculty_id,
        role_id,
        created_at
      FROM users_info 
      WHERE role_id IN (3, 4, 7, 8) AND faculty_id IS NOT NULL
      ORDER BY lastname ASC, firstname ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching faculty for blocks:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch faculty members' 
    });
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

// PUT /admin/faculty/all-roles/:id - Update user details (for roles 3, 4, 5)
router.put('/faculty/all-roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, email, faculty_id } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !email) {
      return res.status(400).json({
        error: 'First name, last name, and email are required'
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address'
      });
    }

    // Check if user exists and has the correct role
    const userCheck = await pool.query(
      'SELECT user_id, role_id FROM users_info WHERE user_id = $1 AND role_id IN (3, 4, 5)',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found or does not have the required role' 
      });
    }

    // Check if email already exists (excluding current user)
    const existingEmailResult = await pool.query(
      'SELECT user_id FROM users_info WHERE email = $1 AND user_id != $2',
      [email, id]
    );

    if (existingEmailResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Email already exists. Please use a different email.' 
      });
    }

    // Check if faculty_id already exists (excluding current user) - only if faculty_id is provided
    if (faculty_id) {
      const existingFacultyResult = await pool.query(
        'SELECT user_id FROM users_info WHERE faculty_id = $1 AND user_id != $2',
        [faculty_id, id]
      );

      if (existingFacultyResult.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Faculty ID already exists. Please use a different ID.' 
        });
      }
    }

    // Update user details
    const updateFields = ['firstname = $1', 'lastname = $2', 'email = $3'];
    const updateValues = [firstname, lastname, email];
    let paramCount = 3;

    if (faculty_id) {
      updateFields.push(`faculty_id = $${paramCount + 1}`);
      updateValues.push(faculty_id);
      paramCount++;
    }

    updateValues.push(id); // Add user_id as the last parameter

    const result = await pool.query(
      `UPDATE users_info SET ${updateFields.join(', ')} WHERE user_id = $${paramCount + 1} RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message
    });
  }
});

// DELETE /admin/faculty/:id - Delete faculty member (role_id = 3 only)
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

// DELETE /admin/faculty/all-roles/:id - Delete user with any role (3, 4, 5)
router.delete('/faculty/all-roles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM users_info WHERE user_id = $1 AND role_id IN (3, 4, 5)',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found or cannot be deleted' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
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