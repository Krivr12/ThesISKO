import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../data/database.js';

const router = express.Router();

// Change faculty password
router.put('/change-password', async (req, res) => {
  try {
    console.log('🔍 Faculty password change request received:', req.body);
    const { currentPassword, newPassword, userId } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and user ID are required'
      });
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get current user from database
    console.log('🔍 Querying user with ID:', userId);
    const userQuery = 'SELECT user_id, password_hash FROM users_info WHERE user_id = $1 AND role_id = 3';
    const userResult = await pool.query(userQuery, [userId]);
    console.log('🔍 User query result:', userResult.rows.length, 'rows found');

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty user not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const updateQuery = 'UPDATE users_info SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2';
    await pool.query(updateQuery, [hashedNewPassword, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing faculty password:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
