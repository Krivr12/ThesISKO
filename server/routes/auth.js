import express from 'express';
import passport from 'passport';
import { 
  googleAuthSuccess, 
  googleAuthFailure, 
  getCurrentUser, 
  logoutUser 
} from '../controller/authController.js';
import { loginUser } from '../controller/userController.js';
import { transporter } from '../config/mailer.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }),
  googleAuthSuccess
);

router.get('/google/failure', googleAuthFailure);

// Login endpoint for faculty and admin
router.post('/login', async (req, res) => {
  try {
    // Use the userController login function
    await loginUser(req, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', getCurrentUser);

// Logout
router.post('/logout', logoutUser);

// Test email route
router.post('/test-email', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    
    const mailOptions = {
      from: process.env.MAIL_FROM || 'thesiskopup@gmail.com',
      to: to || 'test@example.com',
      subject: subject || 'Test Email',
      text: text || 'This is a test email from ThesISKO server'
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

export default router;