import express from 'express';
import passport from 'passport';
import { 
  googleAuthSuccess, 
  googleAuthFailure
} from '../controller/authController.js';
import { loginUser, getCurrentUser, logoutUser } from '../controller/userController.js';
// Lazy import mailer to ensure environment variables are loaded first

const router = express.Router();

// Google OAuth routes
router.get('/google', (req, res, next) => {
  console.log('🔍 Google OAuth route accessed');
  try {
    passport.authenticate('google', { 
      scope: ['profile', 'email'] 
    })(req, res, next);
  } catch (error) {
    console.error('❌ Google OAuth route error:', error);
    res.status(500).json({ error: 'Google OAuth initialization failed', details: error.message });
  }
});

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

// Debug endpoint for Google OAuth configuration
router.get('/google/debug', (req, res) => {
  res.json({
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'Missing',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    serverPort: process.env.PORT || 5050,
    hasSession: !!req.session,
    sessionId: req.sessionID,
    user: req.user || null,
    sessionUser: req.session?.user || null
  });
});

// Test email route
router.post('/test-email', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    
    // Lazy import transporter to ensure environment variables are loaded
    const { transporter } = await import('../config/mailer.js');
    
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

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists in pending table
    const pool = (await import('../data/database.js')).default;
    const [pending] = await pool.execute(
      'SELECT * FROM users_pending WHERE LOWER(email) = ? LIMIT 1',
      [email.toLowerCase()]
    );
    
    if (pending.length === 0) {
      return res.status(404).json({ 
        error: 'No pending verification found for this email' 
      });
    }
    
    const user = pending[0];
    
    // Check if expired
    if (new Date(user.expiresat) < new Date()) {
      return res.status(400).json({ 
        error: 'Verification link has expired. Please sign up again.' 
      });
    }
    
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-student?token=${user.token}&email=${encodeURIComponent(email)}`;
    
    console.log(`📧 Resending verification email to: ${email}`);
    
    // Lazy import transporter
    const { transporter } = await import('../config/mailer.js');
    
    const emailOptions = {
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Resend: Verify your email - ThesISKO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #800000;">Verification Email Resent</h2>
          <p>Hello ${user.firstname},</p>
          <p>You requested to resend your verification email. Please verify your email by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}"
              style="display:inline-block;background:#4CAF50;color:white;
                     padding:15px 30px;text-decoration:none;border-radius:5px;
                     font-weight:bold;font-size:16px;">
              Verify Email Address
            </a>
          </div>
          <p>This link will expire in ${Math.round((new Date(user.expiresat) - new Date()) / (1000 * 60 * 60))} hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    };
    
    const result = await transporter.sendMail(emailOptions);
    
    console.log('✅ Verification email resent successfully');
    console.log('📧 Result:', {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    });
    
    res.json({ 
      success: true, 
      message: 'Verification email resent successfully',
      messageId: result.messageId 
    });
    
  } catch (error) {
    console.error('❌ Failed to resend verification email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resend verification email',
      details: error.message 
    });
  }
});

export default router;