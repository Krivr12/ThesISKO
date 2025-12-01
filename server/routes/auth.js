import express from 'express';
import passport from 'passport';
import { 
  googleAuthSuccess, 
  googleAuthFailure
} from '../controller/authController.js';
import { loginUser, getCurrentUser, logoutUser } from '../controller/userController.js';
// Lazy import mailer to ensure environment variables are loaded first

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🚀 Test endpoint accessed');
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Test Google OAuth callback simulation
router.get('/test-google-callback', async (req, res) => {
  console.log('🚀 Test Google OAuth callback simulation');
  try {
    // Simulate what the Google OAuth callback should do
    const mockUser = {
      googleId: 'test-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      avatar: 'https://example.com/avatar.jpg'
    };
    
    console.log('Mock user data:', mockUser);
    
    // Test database connection
    const { default: pool } = await import('../data/database.js');
    console.log('Database pool imported successfully');
    
    // Test role query
    const roleResult = await pool.query('SELECT role_id FROM roles WHERE role_name = $1', ['Guest']);
    let roleId = roleResult.rows[0]?.role_id;
    console.log('Guest role ID:', roleId);
    
    if (!roleId) {
      console.log('Creating Guest role...');
      const createRoleResult = await pool.query(
        'INSERT INTO roles (role_name) VALUES ($1) RETURNING role_id',
        ['Guest']
      );
      roleId = createRoleResult.rows[0]?.role_id;
      console.log('Created Guest role with ID:', roleId);
    }
    
    // Test user creation
    const insertResult = await pool.query(
      'INSERT INTO users_info (email, firstname, lastname, role_id, avatar_url, password_hash, course, department, google_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id',
      [mockUser.email, mockUser.firstName, mockUser.lastName, roleId, mockUser.avatar, 'guest_no_password', null, null, mockUser.googleId]
    );
    
    console.log('User created successfully:', insertResult.rows[0]);
    
    res.json({ 
      message: 'Test Google OAuth callback simulation successful!',
      user: {
        id: insertResult.rows[0]?.user_id,
        email: mockUser.email,
        Status: 'guest',
        Firstname: mockUser.firstName,
        Lastname: mockUser.lastName,
        AvatarUrl: mockUser.avatar,
        Email: mockUser.email,
        role_id: roleId
      }
    });
    
  } catch (error) {
    console.error('Test Google OAuth callback simulation error:', error);
    res.status(500).json({ 
      error: 'Test simulation failed', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Google OAuth route accessed
  console.log('🚀 Google OAuth route accessed');
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
  (req, res, next) => {
    console.log('🚀 Google OAuth callback reached!');
    console.log('🚀 Query params:', req.query);
    console.log('🚀 Body:', req.body);
    console.log('🚀 Headers:', req.headers);
    next();
  },
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }),
  googleAuthSuccess
);

router.get('/google/failure', googleAuthFailure);

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Use the userController login function
    await loginUser(req, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin login endpoint - only allows admin and superadmin roles
router.post('/admin-login', async (req, res) => {
  try {
    const rawEmail = req.body.email ?? req.body.Email
    const password = req.body.password ?? req.body.Password

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    
    try {
      // Import pool here to avoid circular dependency
      const pool = (await import('../data/database.js')).default;
      const bcrypt = (await import('bcrypt')).default;
      
      // Find user with admin or superadmin role (4, 5, 7, 8)
      const userResult = await pool.query(`
        SELECT 
          ui.user_id,
          ui.firstname,
          ui.lastname,
          ui.email,
          ui.password_hash,
          ui.role_id,
          r.role_name,
          ui.course AS course_code,
          ui.department AS department_name,
          ui.student_id,
          ui.faculty_id,
          ui.admin_id,
          ui.avatar_url
        FROM users_info ui
        LEFT JOIN roles r ON ui.role_id = r.role_id
        WHERE LOWER(ui.email) = $1 
        AND ui.role_id IN (4, 5, 7, 8) -- admin (4), superadmin (5), admin_faculty (7), superadmin_faculty (8)
        LIMIT 1
      `, [email])
      
      const users = userResult.rows
      
      if (users.length === 0) {
        return res.status(401).json({ 
          error: 'Access denied. Only administrators and super administrators can access this login.' 
        })
      }
      
      const user = {
        StudentID: users[0].user_id,
        Firstname: users[0].firstname,
        Lastname: users[0].lastname,
        Email: users[0].email,
        Password: users[0].password_hash,
        role_id: users[0].role_id,
        Status: users[0].role_name,
        Course: users[0].course_code,
        Department: users[0].department_name,
        student_id: users[0].student_id,
        faculty_id: users[0].faculty_id,
        admin_id: users[0].admin_id,
        AvatarUrl: users[0].avatar_url
      }

      const isValidPassword = await bcrypt.compare(password, user.Password)
      
      if (isValidPassword) {
        const { Password: _ignored, ...userWithoutPassword } = user
        
        // Store user data in server session
        req.session.user = {
          id: userWithoutPassword.StudentID,
          user_id: userWithoutPassword.StudentID,
          email: userWithoutPassword.Email,
          Status: userWithoutPassword.Status,
          Firstname: userWithoutPassword.Firstname,
          Lastname: userWithoutPassword.Lastname,
          role_id: userWithoutPassword.role_id
        };
        
        // Set HttpOnly cookie with user data using centralized security configuration
        const { getAuthCookieConfig, AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
        
        res.cookie(AUTH_COOKIE_NAME, JSON.stringify({
          id: userWithoutPassword.StudentID,
          email: userWithoutPassword.Email,
          Status: userWithoutPassword.Status,
          Firstname: userWithoutPassword.Firstname,
          Lastname: userWithoutPassword.Lastname,
          Course: userWithoutPassword.Course,
          Department: userWithoutPassword.Department,
          AvatarUrl: userWithoutPassword.AvatarUrl,
          role_id: userWithoutPassword.role_id,
          account_type: 'admin'
        }), getAuthCookieConfig());
        
        res.json({
          message: 'Admin login successful',
          user: userWithoutPassword,
          account_type: 'admin'
        })
      } else {
        res.status(401).json({ error: 'Invalid password' })
      }
    } catch (dbError) {
      // Database connection failed
      console.error('❌ Database connection failed:', dbError.message);
      return res.status(500).json({ 
        error: 'Database connection failed. Please try again later.',
        details: dbError.message
      })
    }
  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    res.status(500).json({ 
      error: 'Error during admin login',
      details: error.message
    })
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
    const { to, subject, message } = req.body;
    
    // Use unified email service
    const { sendEmail } = await import('../services/emailService.js');
    
    const result = await sendEmail({
      to: to || 'test@example.com',
      subject: subject || 'Test Email - ThesISKO',
      template: 'general',
      data: {
        recipientName: 'Test User',
        message: message || 'This is a test email from ThesISKO unified email service.',
        mainContent: 'If you received this email, the email service is working correctly!',
        footerNote: 'This is an automated test. Please disregard if received in error.'
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      provider: result.provider,
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email via all providers',
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
    const result = await pool.query(
      'SELECT * FROM users_pending WHERE LOWER(email) = $1 LIMIT 1',
      [email.toLowerCase()]
    );
    const pending = result.rows;
    
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
    
    // Use unified email service
    const { sendEmail } = await import('../services/emailService.js');
    
    const expiryHours = Math.round((new Date(user.expiresat) - new Date()) / (1000 * 60 * 60));
    
    const emailResult = await sendEmail({
      to: email,
      subject: 'Resend: Verify your email - ThesISKO',
      template: 'verification',
      data: {
        headerIcon: '✉️',
        headerTitle: 'Verification Email Resent',
        firstname: user.firstname,
        lastname: user.lastname,
        email: email,
        verifyUrl: verifyUrl,
        status: user.status,
        department: user.department,
        course: user.course,
        warningMessage: `This verification link will expire in ${expiryHours} hours.`
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Verification email resent successfully',
      provider: emailResult.provider,
      messageId: emailResult.messageId 
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
