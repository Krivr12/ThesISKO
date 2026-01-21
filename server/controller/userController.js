import bcrypt from 'bcrypt'
import crypto from 'crypto'
import pool from '../data/database.js'
// Lazy import mailer to ensure environment variables are loaded first
import { generatePassword } from '../utils/passwordGenerator.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper function to get HTML template with data replacement
const getVerificationTemplate = (templateName, data = {}) => {
  // Generating email template
  
  // Define all templates inline for reliability
  const templates = {
    'verify-success': `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - ThesISKO</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #800000 0%, #a00000 100%); min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); padding: 60px 40px; text-align: center; max-width: 500px; width: 100%;">
          <div style="width: 80px; height: 80px; background: #ffd966; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px; color: #800000; font-weight: bold;">✓</div>
          <h1 style="color: #333; margin-bottom: 20px; font-size: 2.5em; font-weight: 300;">Email Verified!</h1>
          <div style="color: #666; font-size: 1.2em; line-height: 1.6; margin-bottom: 30px;">
            Congratulations! Your email has been successfully verified.
          </div>
          <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffd966;">
            <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${data.firstname || ''} ${data.lastname || ''}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${data.email || ''}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Status:</strong> ${data.status || ''}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Department:</strong> ${data.department || ''}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Course:</strong> ${data.course || ''}</p>
          </div>
          <p style="color: #666; font-size: 1.2em; line-height: 1.6; margin-bottom: 30px;">
            Your account has been created and you can now log in to access ThesISKO.
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://thesisko.online'}/login" style="display: inline-block; background: #ffd966; color: #800000; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em; box-shadow: 0 5px 15px rgba(255, 217, 102, 0.4); transition: transform 0.3s ease;">
            Go to Login Page
          </a>
          <div style="margin-top: 30px; color: #999; font-size: 0.9em;">
            <p>Thank you for joining ThesISKO!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    'verify-invalid': `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid Link - ThesISKO</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #800000 0%, #a00000 100%); min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); padding: 60px 40px; text-align: center; max-width: 500px; width: 100%;">
          <div style="width: 80px; height: 80px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px; color: white; font-weight: bold;">✗</div>
          <h1 style="color: #333; margin-bottom: 20px; font-size: 2.5em; font-weight: 300;">Invalid Verification Link</h1>
          <div style="color: #666; font-size: 1.2em; line-height: 1.6; margin-bottom: 30px;">
            The verification link you clicked is invalid or malformed. Please check the link and try again.
          </div>
          <a href="${process.env.FRONTEND_URL || 'https://thesisko.online'}/signup" style="display: inline-block; background: #ffd966; color: #800000; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em; box-shadow: 0 5px 15px rgba(255, 217, 102, 0.4);">
            Sign Up Again
          </a>
        </div>
      </body>
      </html>
    `,
    'verify-expired': `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired - ThesISKO</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #800000 0%, #a00000 100%); min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); padding: 60px 40px; text-align: center; max-width: 500px; width: 100%;">
          <div style="width: 80px; height: 80px; background: #ff9800; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px; color: white; font-weight: bold;">⏰</div>
          <h1 style="color: #333; margin-bottom: 20px; font-size: 2.5em; font-weight: 300;">Link Expired</h1>
          <div style="color: #666; font-size: 1.2em; line-height: 1.6; margin-bottom: 30px;">
            This verification link has expired. Please request a new verification email to complete your registration.
          </div>
          <a href="${process.env.FRONTEND_URL || 'https://thesisko.online'}/signup" style="display: inline-block; background: #ffd966; color: #800000; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em; box-shadow: 0 5px 15px rgba(255, 217, 102, 0.4);">
            Sign Up Again
          </a>
        </div>
      </body>
      </html>
    `,
    'verify-used': `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Already Verified - ThesISKO</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #800000 0%, #a00000 100%); min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); padding: 60px 40px; text-align: center; max-width: 500px; width: 100%;">
          <div style="width: 80px; height: 80px; background: #2196f3; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px; color: white; font-weight: bold;">ℹ</div>
          <h1 style="color: #333; margin-bottom: 20px; font-size: 2.5em; font-weight: 300;">Already Verified</h1>
          <div style="color: #666; font-size: 1.2em; line-height: 1.6; margin-bottom: 30px;">
            This email has already been verified. You can now log in to your account.
          </div>
          <a href="${process.env.FRONTEND_URL || 'https://thesisko.online'}/login" style="display: inline-block; background: #ffd966; color: #800000; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em; box-shadow: 0 5px 15px rgba(255, 217, 102, 0.4);">
            Go to Login
          </a>
        </div>
      </body>
      </html>
    `
  };

  let html = templates[templateName];
  
  if (!html) {
    console.error(`Template ${templateName} not found`);
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #800000;">ThesISKO</h1>
        <h2>Email Verification</h2>
        <p>Unknown template: ${templateName}</p>
        <a href="${process.env.FRONTEND_URL || 'https://thesisko.online'}/login" style="background: #ffd966; color: #800000; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
      </body>
      </html>
    `;
  }

  // Replace placeholders with actual data
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`\\$\\{data\\.${key} \\|\\| ''\\}`, 'g');
    html = html.replace(placeholder, data[key] || '');
  });

  // Template generated successfully
  return html;
};

// Helper function to get role_id by role name
const getRoleId = async (roleName) => {
  try {
    // Normalize the role name to lowercase for case-insensitive matching
    const normalizedRole = roleName.toLowerCase();
    
    // First, try to find existing role (case-insensitive)
    const result = await pool.query(
      'SELECT role_id FROM roles WHERE LOWER(role_name) = $1 LIMIT 1',
      [normalizedRole]
    )
    
    if (result.rows.length > 0) {
      return result.rows[0].role_id
    }
    
    // If role doesn't exist, use a fallback mapping
    const roleMapping = {
      'student': 2,
      'faculty': 3,
      'admin': 4,
      'guest': 1,
      'superadmin': 5
    }
    
    if (roleMapping[normalizedRole]) {
      return roleMapping[normalizedRole];
    }
    
    // If still not found, use student as default
    console.warn(`Role '${roleName}' not found, defaulting to student role`);
    return 2; // student role_id
  } catch (error) {
    console.error('Error getting role_id:', error)
    throw error
  }
}

// Helper function to get department_id by department code or name
const getDepartmentId = async (departmentInput) => {
  try {
    // First try to find by department_code
    let result = await pool.query(
      'SELECT department_id FROM departments WHERE department_code = $1 LIMIT 1',
      [departmentInput]
    )
    
    // If not found by code, try by name
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT department_id FROM departments WHERE department_name = $1 LIMIT 1',
        [departmentInput]
      )
    }
    
    // If still not found, handle common mappings
    if (result.rows.length === 0) {
      const departmentMapping = {
        'CCIS': 'COLLEGE OF COMPUTER AND INFORMATION SCIENCES',
        'COE': 'COLLEGE OF ENGINEERING',
        'CBA': 'COLLEGE OF BUSINESS ADMINISTRATION',
        'CAL': 'COLLEGE OF ARTS AND LETTERS'
      }
      
      const mappedDepartment = departmentMapping[departmentInput];
      if (mappedDepartment) {
        result = await pool.query(
          'SELECT department_id FROM departments WHERE department_name = $1 LIMIT 1',
          [mappedDepartment]
        )
      }
    }
    
    // If still not found, try partial match
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT department_id FROM departments WHERE department_name ILIKE $1 LIMIT 1',
        [`%${departmentInput}%`]
      )
    }
    
    // If still not found, use first available
    if (result.rows.length === 0) {
      console.warn(`Department '${departmentInput}' not found, using first available department`);
      result = await pool.query('SELECT department_id FROM departments LIMIT 1', []);
    }
    
    return result.rows[0].department_id
  } catch (error) {
    console.error('Error getting department_id:', error)
    throw error
  }
}

// Helper function to get course_id by course code or name
const getCourseId = async (courseInput) => {
  try {
    // First try to find by course_code
    let result = await pool.query(
      'SELECT course_id FROM courses WHERE course_code = $1 LIMIT 1',
      [courseInput]
    )
    let rows = result.rows
    
    // If not found by code, try by name
    if (rows.length === 0) {
      result = await pool.query(
        'SELECT course_id FROM courses WHERE course_name = $1 LIMIT 1',
        [courseInput]
      )
      rows = result.rows
    }
    
    // If still not found, try partial matches for common cases
    if (rows.length === 0) {
      // Handle common course mapping
      const courseMapping = {
        'BSIT': 'Bachelor of Science in Information Technology',
        'BSCS': 'Bachelor of Science in Computer Science',
        'BSIS': 'Bachelor of Science in Information Systems'
      }
      
      const mappedCourse = courseMapping[courseInput];
      if (mappedCourse) {
        result = await pool.query(
          'SELECT course_id FROM courses WHERE course_name ILIKE $1 LIMIT 1',
          [`%${mappedCourse}%`]
        )
        rows = result.rows
      }
    }
    
    // If still not found, create a default entry or use first available
    if (rows.length === 0) {
      console.warn(`Course '${courseInput}' not found, using first available course`);
      result = await pool.query('SELECT course_id FROM courses LIMIT 1', []);
      rows = result.rows;
    }
    
    return rows[0].course_id
  } catch (error) {
    console.error('Error getting course_id:', error)
    throw error
  }
}

// Get all users (without passwords)
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ui.user_id AS StudentID,
        ui.firstname AS Firstname,
        ui.lastname AS Lastname,
        ui.email AS Email,
        r.role_name AS Status,
        ui.course AS Course,
        ui.department AS Department,
        ui.student_id,
        ui.faculty_id,
        ui.admin_id,
        ui.block_id,
        ui.program_id,
        ui.admin_program,
        ui.admin_type,
        ui.avatar_url AS AvatarUrl
      FROM users_info ui
      LEFT JOIN roles r ON ui.role_id = r.role_id
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Error fetching users' })
  }
}

// Signup user with email verification
const signupUser = async (req, res) => {
  try {
    // Accept both frontend field names and backend field names for flexibility
    const firstname = req.body.firstname ?? req.body.Firstname ?? req.body.firstName
    const lastname = req.body.lastname ?? req.body.Lastname ?? req.body.lastName
    const rawEmail = req.body.email ?? req.body.Email
    const password = req.body.password ?? req.body.Password
    const studentID = req.body.studentID ?? req.body.StudentID ?? req.body.studentNum ?? req.body.student_id
    const course = req.body.course ?? req.body.Course
    const department = req.body.department ?? req.body.Department
    const status = req.body.status ?? req.body.Status ?? req.body.role

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!firstname || !lastname || !email || !password || !course || !department || !status) {
      return res.status(400).json({
        error: 'First name, last name, email, password, course, department, and status are required'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    // Validate status is one of the allowed values
    const allowedStatuses = ['Student', 'Faculty', 'Admin']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Status must be one of: Student, Faculty, Admin'
      })
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address'
      })
    }

    // Domain validation for Students - must use @iskolarngbayan.pup.edu.ph
    if (status === 'Student') {
      const requiredDomain = '@iskolarngbayan.pup.edu.ph'
      if (!email.endsWith(requiredDomain)) {
        return res.status(400).json({
          error: `Student accounts must use ${requiredDomain} email address`
        })
      }
    }

    const emailResult = await pool.query(
      'SELECT user_id FROM users_info WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    )
    const emailUsers = emailResult.rows
    if (emailUsers.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    // For all status types, require email verification
    try {
      const pendingResult = await pool.query(
        'SELECT user_id FROM users_pending WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      )
      const pending = pendingResult.rows
      if (pending.length > 0) {
        return res.status(202).json({ message: 'Verification email already sent. Please check your inbox.' })
      }
    } catch (e) {
      // users_pending table may not exist
    }

    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(password, salt)
    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

    try {
      // Inserting user into pending verification table
      
      await pool.query(
        'INSERT INTO users_pending (firstname, lastname, email, hashpass, student_id, course, department, status, token, expiresat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [firstname, lastname, email, hashedPassword, studentID, course, department, status, token, expiresAt]
      )
      
      // User successfully added to pending verification
    } catch (e) {
      console.error('❌ Failed to insert into users_pending:', e.message);
      console.error('❌ Full error:', e);
      return res.status(500).json({ 
        error: 'Server is not configured for email verification. Please create users_pending table.',
        details: e.message 
      })
    }

    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-student?token=${token}&email=${encodeURIComponent(email)}`
    
    // Use unified email service
    try {
      const { sendEmail } = await import('../services/emailService.js');
      
      await sendEmail({
        to: email,
        subject: 'Verify your email - ThesISKO',
        template: 'verification',
        data: {
          headerIcon: '🎓',
          headerTitle: 'Welcome to ThesISKO!',
          firstname: firstname,
          lastname: lastname,
          email: email,
          verifyUrl: verifyUrl,
          status: status,
          department: department,
          course: course
        }
      });
      
    } catch (e) {
      console.error('❌ Failed to send verification email:', e);
      console.error('❌ Error details:', {
        message: e.message
      });
    }
    return res.status(202).json({ 
      message: 'Verification email sent. Please verify to complete signup.'
    })

  } catch (error) {
    const msg = error && (error.sqlMessage || error.message || String(error))
    console.error('Signup error:', msg)
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Error creating user' : msg
    })
  }
}

// Login user
const loginUser = async (req, res) => {
  try {
    // Processing login attempt
    console.log('🔐 Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const rawEmail = req.body.email ?? req.body.Email
    const password = req.body.password ?? req.body.Password

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    console.log('📧 Processed email:', email);
    
    if (!email || !password) {
      // Missing email or password
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' })
    }
    
    try {
      // Attempting database query

      // First, try to find regular user
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
          ui.block_id,
          ui.group_id,
          ui.program_id,
          ui.admin_program,
          ui.admin_type,
          ui.avatar_url
        FROM users_info ui
        LEFT JOIN roles r ON ui.role_id = r.role_id
        WHERE LOWER(ui.email) = $1 
        LIMIT 1
      `, [email])
      const users = userResult.rows
      console.log('🔍 Database query result:', { userCount: users.length, email: email });
    
    // Check if user exists
    if (users.length === 0) {
      // No user found in database
      return res.status(401).json({ 
        error: 'Invalid credentials. User not found in database.' 
      })
    }

    // Regular user login flow
    // Map the column names to match expected format
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
      group_id: users[0].group_id,
      AvatarUrl: users[0].avatar_url
    }

    // User found in database

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
        role_id: userWithoutPassword.role_id,
        group_id: userWithoutPassword.group_id
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
        group_id: userWithoutPassword.group_id,
        account_type: 'user'
      }), getAuthCookieConfig());
      
      res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        account_type: 'user'
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
    console.error('❌ Login error:', error.message);
    console.error('❌ Full login error:', error);
    console.error('❌ Stack trace:', error.stack);
    // Return the actual error message for debugging
    res.status(500).json({ 
      error: 'Error during login',
      details: error.message,
      type: error.name
    })
  }
}

// Logout user
const logoutUser = async (req, res) => {
  try {
    // Log the logout reason if provided
    const logoutReason = req.body?.reason || 'manual_logout';
    console.log('🚪 User logout initiated:', logoutReason);
    
    // Clear the HttpOnly cookie using centralized configuration
    const { getAuthCookieConfig, AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
    const cookieConfig = getAuthCookieConfig();
    
    // Method 1: Clear cookie with same settings used to set it (standard method)
    const clearCookieOptions1 = {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path || '/'
    };
    
    // Only set domain if it was defined in the original config
    if (cookieConfig.domain !== undefined) {
      clearCookieOptions1.domain = cookieConfig.domain;
    }
    
    res.clearCookie(AUTH_COOKIE_NAME, clearCookieOptions1);
    
    // Method 2: Also set cookie with expiration in the past (ensures removal)
    // This is a more aggressive approach that guarantees cookie removal
    const clearCookieOptions = {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path || '/',
      expires: new Date(0) // Set expiration to epoch (Jan 1, 1970) - effectively deletes cookie
    };
    
    // Only set domain if it was defined in the original config
    if (cookieConfig.domain !== undefined) {
      clearCookieOptions.domain = cookieConfig.domain;
    }
    
    // Set empty cookie with past expiration to force removal
    res.cookie(AUTH_COOKIE_NAME, '', clearCookieOptions);
    
    console.log('✅ Authentication cookie cleared');
    
    // Destroy session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Session destruction error:', err);
          // Still send success response even if session destruction fails
          // The cookie is already cleared, which is the main security concern
        } else {
          console.log('✅ Session destroyed');
        }
        
        // For sendBeacon requests (browser close), send minimal response
        if (logoutReason === 'browser_close') {
          res.status(204).send(); // No content response for sendBeacon
        } else {
          res.json({ 
            success: true,
            message: 'Logout successful',
            authenticated: false
          });
        }
      });
    } else {
      // No session to destroy, just send response
      if (logoutReason === 'browser_close') {
        res.status(204).send();
      } else {
        res.json({ 
          success: true,
          message: 'Logout successful',
          authenticated: false
        });
      }
    }
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Even if there's an error, try to clear the cookie
    try {
      const { AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
      res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
      res.cookie(AUTH_COOKIE_NAME, '', { expires: new Date(0), path: '/' });
    } catch (clearError) {
      console.error('❌ Failed to clear cookie during error handling:', clearError);
    }
    res.status(500).json({ error: 'Error during logout' });
  }
};

// Get current user from cookie
const getCurrentUser = async (req, res) => {
  try {
    const { AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
    const authCookie = req.cookies[AUTH_COOKIE_NAME];
    
    if (!authCookie) {
      return res.status(401).json({ authenticated: false, error: 'No authentication cookie found' });
    }
    
    try {
      const user = JSON.parse(authCookie);
      // Return format expected by frontend: { authenticated: true, user }
      res.json({ authenticated: true, user });
    } catch (parseError) {
      console.error('Error parsing auth cookie:', parseError);
      res.status(401).json({ authenticated: false, error: 'Invalid authentication cookie' });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ authenticated: false, error: 'Error getting current user' });
  }
};

// Verify student email
const verifyStudentEmail = async (req, res) => {
  const { token, email } = req.query
  if (!token || !email) {
    return res.status(400).send(getVerificationTemplate('verify-invalid'))
  }
  try {
    const result = await pool.query(
      'SELECT * FROM users_pending WHERE LOWER(email) = $1 AND token = $2 LIMIT 1',
      [String(email).toLowerCase(), token]
    )
    const rows = result.rows
    if (!rows.length) {
      return res.status(400).send(getVerificationTemplate('verify-used'))
    }
    const pending = rows[0]
    if (pending.expiresat && new Date(pending.expiresat) < new Date()) {
      await pool.query('DELETE FROM users_pending WHERE user_id = $1', [pending.user_id])
      return res.status(400).send(getVerificationTemplate('verify-expired'))
    }

    const existsResult = await pool.query('SELECT user_id FROM users_info WHERE LOWER(email) = $1 LIMIT 1', [String(email).toLowerCase()])
    const exists = existsResult.rows
    if (exists.length === 0) {
      // Get role ID
      const roleId = await getRoleId(pending.status)
      
      // Generate appropriate ID based on status
      let generatedId = null
      if (pending.status === 'Student') {
        generatedId = pending.student_id || `STU${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      } else if (pending.status === 'Faculty') {
        generatedId = `FAC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      } else if (pending.status === 'Admin') {
        generatedId = `ADM${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      }
      
      // Insert into users_info table with department and course as text
      await pool.query(
        'INSERT INTO users_info (email, password_hash, role_id, firstname, lastname, department, course, student_id, faculty_id, admin_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          pending.email.toLowerCase(), 
          pending.hashpass, 
          roleId, 
          pending.firstname, 
          pending.lastname, 
          pending.department, // Save department as text
          pending.course,      // Save course as text
          pending.status === 'Student' ? generatedId : null,
          pending.status === 'Faculty' ? generatedId : null,
          pending.status === 'Admin' ? generatedId : null
        ]
      )
    }

      await pool.query('DELETE FROM users_pending WHERE user_id = $1', [pending.user_id])
    
    // Send a beautiful HTML response using template
    const successData = {
      firstname: pending.firstname,
      lastname: pending.lastname,
      email: pending.email,
      status: pending.status,
      department: pending.department,
      course: pending.course
    };
    
    res.send(getVerificationTemplate('verify-success', successData))
  } catch (e) {
    console.error('verify-student error:', e)
    res.status(500).json({ error: 'Failed to verify' })
  }
}

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const users = await pool.query(`
      SELECT 
        ui.user_id AS StudentID,
        ui.firstname AS Firstname,
        ui.lastname AS Lastname,
        ui.email AS Email,
        ui.role_id,
        r.role_name AS Status,
        ui.course AS Course,
        ui.department AS Department,
        ui.student_id,
        ui.faculty_id,
        ui.admin_id,
        ui.group_id,
        ui.block_id,
        ui.program_id,
        ui.admin_program,
        ui.admin_type,
        ui.avatar_url AS AvatarUrl
      FROM users_info ui
      LEFT JOIN roles r ON ui.role_id = r.role_id
      WHERE ui.user_id = $1 LIMIT 1
    `, [userId]);

    if (users.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users.rows[0];
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
};

// Update user information
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      firstname,
      lastname,
      student_id,
      currentPassword,
      newPassword
    } = req.body;

    // Validate required fields
    if (!firstname || !lastname) {
      return res.status(400).json({
        error: 'First name and last name are required'
      });
    }

    // If password change is requested, validate current password
    let hashedNewPassword = null;
    if (newPassword && currentPassword) {
      // Get user's current password hash
      const userResult = await pool.query(
        'SELECT password_hash FROM users_info WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: 'Current password is incorrect'
        });
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'New password must be at least 6 characters long'
        });
      }

      // Hash the new password
      hashedNewPassword = await bcrypt.hash(newPassword, 10);
    }

    // Build update query with PostgreSQL syntax
    let paramIndex = 1;
    let setClauses = [`firstname = $${paramIndex++}`, `lastname = $${paramIndex++}`];
    let updateParams = [firstname, lastname];
    
    // Only update student_id if it's provided (for student users)
    if (student_id !== undefined && student_id !== null) {
      setClauses.push(`student_id = $${paramIndex++}`);
      updateParams.push(student_id);
    }
    
    if (hashedNewPassword) {
      setClauses.push(`password_hash = $${paramIndex++}`);
      updateParams.push(hashedNewPassword);
    }
    
    updateParams.push(userId);
    const updateQuery = `
      UPDATE users_info 
      SET ${setClauses.join(', ')}
      WHERE user_id = $${paramIndex}
    `;

    const result = await pool.query(updateQuery, updateParams);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: hashedNewPassword 
        ? 'Profile and password updated successfully. Please log in again for security.' 
        : 'User information updated successfully',
      user_id: userId,
      passwordChanged: !!hashedNewPassword
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      error: 'Error updating user information',
      details: error.message 
    });
  }
};

// Admin create faculty - Create faculty member directly (no email verification needed)
const adminCreateFaculty = async (req, res) => {
  try {
    const { firstname, lastname, email, faculty_id } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !email || !faculty_id) {
      return res.status(400).json({ 
        error: 'All fields are required: firstname, lastname, email, and faculty_id' 
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT user_id FROM users_info WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Email already exists. Please use a different email.' 
      });
    }

    // Check if faculty_id already exists
    const facultyIdCheck = await pool.query(
      'SELECT user_id FROM users_info WHERE faculty_id = $1',
      [faculty_id]
    );

    if (facultyIdCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Faculty ID already exists. Please use a different ID.' 
      });
    }

    // Generate password
    const generatedPassword = generatePassword();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Insert faculty into users_info with role_id = 3 (Faculty)
    const result = await pool.query(
      'INSERT INTO users_info (email, password_hash, role_id, firstname, lastname, faculty_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, firstname, lastname, email, faculty_id',
      [normalizedEmail, hashedPassword, 3, firstname.trim(), lastname.trim(), faculty_id]
    );

    const newFaculty = result.rows[0];

    // Send credentials email
    try {
      const { sendEmail } = await import('../services/emailService.js');
      const frontendUrl = process.env.FRONTEND_URL || 'https://thesisko.online';
      
      await sendEmail({
        to: normalizedEmail,
        subject: 'Your ThesISKO Faculty Account Credentials',
        template: 'credentials',
        data: {
          headerIcon: '🎓',
          headerTitle: 'Welcome to ThesISKO!',
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          email: normalizedEmail,
          password: generatedPassword,
          accountType: 'Faculty',
          identifier: faculty_id,
          identifierLabel: 'Faculty ID',
          loginUrl: `${frontendUrl}/login`
        }
      });
      
      console.log(`✅ Faculty account created and credentials email sent to ${normalizedEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send credentials email:', emailError);
      // Don't fail the request if email fails - account is still created
    }

    res.status(201).json({
      success: true,
      message: 'Faculty account created successfully',
      data: {
        user_id: newFaculty.user_id,
        firstname: newFaculty.firstname,
        lastname: newFaculty.lastname,
        email: newFaculty.email,
        faculty_id: newFaculty.faculty_id
      }
    });

  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ 
      error: 'Failed to create faculty account',
      details: error.message 
    });
  }
};

export {
  getAllUsers,
  signupUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyStudentEmail,
  getUserById,
  updateUser,
  adminCreateFaculty
}

/* 
  OLD HTML TEMPLATE - KEPT FOR REFERENCE ONLY
  This template has been replaced by the unified email service templates
  Located in: server/templates/email/credentials.html
  
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ThesISKO</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #800000 0%, #a52a2a 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            🎓 Welcome to ThesISKO!
          </h1>
          <p style="color: #f8f8f8; margin: 10px 0 0 0; font-size: 16px;">
            Polytechnic University of the Philippines
          </p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
              Hello ${firstname} ${lastname}! 👋
            </h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
              Your faculty account has been created successfully. You're now part of the ThesISKO system!
            </p>
          </div>
          
          <!-- Credentials Card -->
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #800000; border-radius: 12px; padding: 25px; margin: 25px 0; position: relative;">
            <div style="position: absolute; top: -12px; left: 20px; background: #800000; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">
              🔐 Login Credentials
            </div>
            
            <div style="margin-top: 15px;">
              <div style="margin-bottom: 15px; padding: 12px; background: #ffffff; border-radius: 8px; border-left: 4px solid #800000;">
                <strong style="color: #495057; display: block; margin-bottom: 5px;">📧 Email:</strong>
                <span style="color: #2c3e50; font-size: 16px; font-family: 'Courier New', monospace;">${email}</span>
              </div>
              
              <div style="margin-bottom: 15px; padding: 12px; background: #ffffff; border-radius: 8px; border-left: 4px solid #28a745;">
                <strong style="color: #495057; display: block; margin-bottom: 5px;">🔑 Password:</strong>
                <span style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 8px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; display: inline-block;">${generatedPassword}</span>
              </div>
              
              <div style="padding: 12px; background: #ffffff; border-radius: 8px; border-left: 4px solid #007bff;">
                <strong style="color: #495057; display: block; margin-bottom: 5px;">🆔 Faculty ID:</strong>
                <span style="color: #2c3e50; font-size: 16px; font-family: 'Courier New', monospace;">${faculty_id}</span>
              </div>
            </div>
          </div>
          
          <!-- Security Note -->
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>🔒 Security Note:</strong> Please change your password after your first login for enhanced security.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #2c3e50; padding: 20px; text-align: center;">
          <p style="color: #bdc3c7; margin: 0; font-size: 13px;">
            This is an automated message from the ThesISKO System<br>
            Polytechnic University of the Philippines | Manila, Philippines
          </p>
          <p style="color: #95a5a6; margin: 10px 0 0 0; font-size: 12px;">
            © ${new Date().getFullYear()} ThesISKO. All rights reserved.
          </p>
        </div>
        
        <!-- Legal Notice -->
        <div style="background: #fff3cd; border-top: 3px solid #ffc107; padding: 20px; text-align: left;">
          <p style="margin: 0 0 10px 0; color: #856404; font-size: 13px; font-weight: bold;">
            ⚠️ CONFIDENTIALITY NOTICE & LEGAL DISCLAIMER
          </p>
          <p style="margin: 0 0 10px 0; color: #856404; font-size: 12px; line-height: 1.6;">
            This email and any attachments are confidential and intended solely for the person(s) named above. 
            This communication may contain privileged or confidential information.
          </p>
          <p style="margin: 0 0 10px 0; color: #856404; font-size: 12px; line-height: 1.6;">
            <strong>If you are NOT the intended recipient:</strong><br>
            • Please DO NOT read, copy, forward, or use this email<br>
            • Delete this email immediately<br>
            • Notify us at: <a href="mailto:thesiskopup@gmail.com" style="color: #800000;">thesiskopup@gmail.com</a>
          </p>
          <p style="margin: 0; color: #856404; font-size: 11px; line-height: 1.6;">
            Unauthorized use, disclosure, or distribution of this communication is strictly prohibited and may be unlawful.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
*/
