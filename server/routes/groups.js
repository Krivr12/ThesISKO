import express from 'express';
import { 
  createStudentGroup, 
  getGroupInfo, 
  deleteStudentGroup, 
  getAllGroups 
} from '../controller/groupController.js';

const router = express.Router();

/**
 * POST /groups/create
 * Create a new student group
 * 
 * Body:
 * {
 *   "group_id": "G001",
 *   "leader_email": "leader@example.com",
 *   "leader_text": "Project Leader",
 *   "members": [
 *     {
 *       "email": "member1@example.com",
 *       "text": "Developer"
 *     },
 *     {
 *       "email": "member2@example.com", 
 *       "text": "Researcher"
 *     }
 *   ]
 * }
 */
router.post('/create', createStudentGroup);

/**
 * GET /groups/:group_id
 * Get detailed information about a specific group
 */
router.get('/:group_id', getGroupInfo);

/**
 * DELETE /groups/:group_id
 * Delete a student group and all related records
 */
router.delete('/:group_id', deleteStudentGroup);

/**
 * GET /groups
 * Get all student groups with basic information
 */
router.get('/', getAllGroups);

/**
 * POST /groups/test-email
 * Test email configuration
 */
router.post('/test-email', async (req, res) => {
  try {
    const { transporter } = await import('../config/mailer.js');
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('Testing email to:', email);
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? 'Set' : 'Missing'
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'ThesISKO Email Test',
      text: 'This is a test email from ThesISKO system. If you receive this, email configuration is working correctly.'
    });

    res.json({ 
      message: 'Test email sent successfully',
      recipient: email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message,
      code: error.code,
      response: error.response
    });
  }
});

export default router;
