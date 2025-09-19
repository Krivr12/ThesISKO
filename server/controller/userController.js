import bcrypt from 'bcrypt'
import crypto from 'crypto'
import pool from '../data/database.js'
import { transporter } from '../config/mailer.js'
import { generatePassword } from '../utils/passwordGenerator.js'

// Helper function to get role_id by role name
const getRoleId = async (roleName) => {
  try {
    // First, try to find existing role
    const [rows] = await pool.execute(
      'SELECT role_id FROM roles WHERE role_name = ? LIMIT 1',
      [roleName]
    )
    
    if (rows.length > 0) {
      return rows[0].role_id
    }
    
    // If role doesn't exist, create it with UNIQUE constraint handling
    try {
      const [result] = await pool.execute(
        'INSERT INTO roles (role_name) VALUES (?)',
        [roleName]
      )
      return result.insertId
    } catch (insertError) {
      // If insert fails due to duplicate (race condition), try to get the existing one
      if (insertError.code === 'ER_DUP_ENTRY') {
        const [existingRows] = await pool.execute(
          'SELECT role_id FROM roles WHERE role_name = ? LIMIT 1',
          [roleName]
        )
        if (existingRows.length > 0) {
          return existingRows[0].role_id
        }
      }
      throw insertError
    }
  } catch (error) {
    console.error('Error getting role_id:', error)
    throw error
  }
}

// Helper function to get department_id by department name
const getDepartmentId = async (departmentName) => {
  try {
    const [rows] = await pool.execute(
      'SELECT department_id FROM departments WHERE department_name = ? LIMIT 1',
      [departmentName]
    )
    
    if (rows.length === 0) {
      throw new Error(`Department '${departmentName}' not found. Please select from existing departments.`)
    }
    
    return rows[0].department_id
  } catch (error) {
    console.error('Error getting department_id:', error)
    throw error
  }
}

// Helper function to get course_id by course code
const getCourseId = async (courseCode) => {
  try {
    // First, try to find existing course
    const [rows] = await pool.execute(
      'SELECT course_id FROM courses WHERE course_code = ? LIMIT 1',
      [courseCode]
    )
    
    if (rows.length > 0) {
      return rows[0].course_id
    }
    
    // If course doesn't exist, create it with UNIQUE constraint handling
    try {
      const [result] = await pool.execute(
        'INSERT INTO courses (course_code) VALUES (?)',
        [courseCode]
      )
      return result.insertId
    } catch (insertError) {
      // If insert fails due to duplicate (race condition), try to get the existing one
      if (insertError.code === 'ER_DUP_ENTRY') {
        const [existingRows] = await pool.execute(
          'SELECT course_id FROM courses WHERE course_code = ? LIMIT 1',
          [courseCode]
        )
        if (existingRows.length > 0) {
          return existingRows[0].course_id
        }
      }
      throw insertError
    }
  } catch (error) {
    console.error('Error getting course_id:', error)
    throw error
  }
}

// Get all users (without passwords)
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        ui.user_id AS StudentID,
        ui.firstname AS Firstname,
        ui.lastname AS Lastname,
        ui.email AS Email,
        r.role_name AS Status,
        c.course_code AS Course,
        d.department_name AS Department,
        ui.student_id,
        ui.faculty_id,
        ui.admin_id,
        ui.avatar_url AS AvatarUrl
      FROM users_info ui
      LEFT JOIN roles r ON ui.role_id = r.role_id
      LEFT JOIN courses c ON ui.course_id = c.course_id
      LEFT JOIN departments d ON ui.department_id = d.department_id
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Error fetching users' })
  }
}

// Signup user
const signupUser = async (req, res) => {
  try {
    // Accept both frontend field names and backend field names for flexibility
    const firstname = req.body.firstname ?? req.body.Firstname ?? req.body.firstName
    const lastname = req.body.lastname ?? req.body.Lastname ?? req.body.lastName
    const rawEmail = req.body.email ?? req.body.Email
    const password = req.body.password ?? req.body.Password
    const studentID = req.body.studentID ?? req.body.StudentID ?? req.body.studentNum
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

    // Basic email format validation (no domain restrictions)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address'
      })
    }

    const [emailUsers] = await pool.execute(
      'SELECT user_id FROM users_info WHERE LOWER(email) = ? LIMIT 1',
      [email]
    )
    if (emailUsers.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    // For all status types, require email verification
    try {
      const [pending] = await pool.execute(
        'SELECT user_id FROM users_pending WHERE LOWER(email) = ? LIMIT 1',
        [email]
      )
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
      await pool.execute(
        'INSERT INTO users_pending (firstname, lastname, email, hashpass, course, department, status, token, expiresat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [firstname, lastname, email, hashedPassword, course, department, status, token, expiresAt]
      )
    } catch (e) {
      return res.status(500).json({ error: 'Server is not configured for email verification. Please create users_pending table.' })
    }

    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-student?token=${token}&email=${encodeURIComponent(email)}`
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Verify your email - ThesISKO',
        html: `
            <p>Hello ${firstname},</p>
            <p>Please verify your email by clicking the button below:</p>
            <a href="${verifyUrl}"
              style="display:inline-block;background:#4CAF50;color:white;
                     padding:10px 20px;text-decoration:none;border-radius:5px;">
              Verify Email
            </a>
            <p>This link will expire in 24 hours.</p>
        `
      })
    } catch (e) {
      console.error('Failed to send verification email:', e && (e.response || e.message || e))
      console.warn('Email not sent. Verification link:', verifyUrl)
    }
    return res.status(202).json({ message: 'Verification email sent. Please verify to complete signup.' })

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
    const rawEmail = req.body.email ?? req.body.Email
    const password = req.body.password ?? req.body.Password

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const [users] = await pool.execute(`
      SELECT 
        ui.user_id AS StudentID,
        ui.firstname AS Firstname,
        ui.lastname AS Lastname,
        ui.email AS Email,
        ui.password_hash AS Password,
        r.role_name AS Status,
        c.course_code AS Course,
        d.department_name AS Department,
        ui.student_id,
        ui.faculty_id,
        ui.admin_id,
        ui.avatar_url AS AvatarUrl
      FROM users_info ui
      LEFT JOIN roles r ON ui.role_id = r.role_id
      LEFT JOIN courses c ON ui.course_id = c.course_id
      LEFT JOIN departments d ON ui.department_id = d.department_id
      WHERE LOWER(ui.email) = ? LIMIT 1
    `, [email])

    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found' })
    }

    const user = users[0]

    const isValidPassword = await bcrypt.compare(password, user.Password)
    if (isValidPassword) {
      const { Password: _ignored, ...userWithoutPassword } = user
      res.json({
        message: 'Login successful',
        user: userWithoutPassword
      })
    } else {
      res.status(401).json({ error: 'Invalid password' })
    }
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Error during login' })
  }
}

// Verify student email
const verifyStudentEmail = async (req, res) => {
  const { token, email } = req.query
  if (!token || !email) return res.status(400).json({ error: 'Invalid verification link' })
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users_pending WHERE LOWER(email) = ? AND token = ? LIMIT 1',
      [String(email).toLowerCase(), token]
    )
    if (!rows.length) return res.status(400).json({ error: 'Invalid or used verification link' })
    const pending = rows[0]
    if (pending.expiresat && new Date(pending.expiresat) < new Date()) {
      await pool.execute('DELETE FROM users_pending WHERE user_id = ?', [pending.user_id])
      return res.status(400).json({ error: 'Verification link expired' })
    }

    const [exists] = await pool.execute('SELECT user_id FROM users_info WHERE LOWER(email) = ? LIMIT 1', [String(email).toLowerCase()])
    if (exists.length === 0) {
      // Get IDs for the user's selected role, department, and course
      const roleId = await getRoleId(pending.status)
      const departmentId = await getDepartmentId(pending.department)
      const courseId = await getCourseId(pending.course)
      
      // Generate appropriate ID based on status
      let generatedId = null
      if (pending.status === 'Student') {
        generatedId = pending.student_id || `STU${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      } else if (pending.status === 'Faculty') {
        generatedId = `FAC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      } else if (pending.status === 'Admin') {
        generatedId = `ADM${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      }
      
      // Insert into users_info table (single table)
      await pool.execute(
        'INSERT INTO users_info (email, password_hash, role_id, firstname, lastname, course_id, department_id, student_id, faculty_id, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pending.email.toLowerCase(), 
          pending.hashpass, 
          roleId, 
          pending.firstname, 
          pending.lastname, 
          courseId, 
          departmentId,
          pending.status === 'Student' ? generatedId : null,
          pending.status === 'Faculty' ? generatedId : null,
          pending.status === 'Admin' ? generatedId : null
        ]
      )
    }

    await pool.execute('DELETE FROM users_pending WHERE user_id = ?', [pending.user_id])
    res.json({ message: 'Email verified. Your account has been created. You can log in now.' })
  } catch (e) {
    console.error('verify-student error:', e)
    res.status(500).json({ error: 'Failed to verify' })
  }
}

// Admin faculty signup (creates faculty account with generated password)
const adminCreateFaculty = async (req, res) => {
  try {
    const { firstname, lastname, email, faculty_id } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !email || !faculty_id) {
      return res.status(400).json({
        error: 'First name, last name, email, and faculty ID are required'
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address'
      });
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM users_info WHERE LOWER(email) = ? LIMIT 1',
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Email already exists. Please use a different email.' 
      });
    }

    // Check if faculty_id already exists
    const [existingFaculty] = await pool.execute(
      'SELECT user_id FROM users_info WHERE faculty_id = ? LIMIT 1',
      [faculty_id]
    );

    if (existingFaculty.length > 0) {
      return res.status(400).json({ 
        error: 'Faculty ID already exists. Please use a different ID.' 
      });
    }

    // Generate password
    const generatedPassword = generatePassword(8);

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Get role_id for Faculty (assuming role_id 3 is Faculty)
    const roleId = await getRoleId('Faculty');

    // Insert faculty into users_info table
    const [result] = await pool.execute(
      'INSERT INTO users_info (firstname, lastname, email, password_hash, role_id, faculty_id) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, lastname, email.toLowerCase(), hashedPassword, roleId, faculty_id]
    );

    // Send email with credentials
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Faculty Account Created - ThesISKO',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Welcome to ThesISKO!</h2>
            <p>Hello ${firstname} ${lastname},</p>
            <p>Your faculty account has been created successfully. Here are your login credentials:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Login Information</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> <code style="background-color: #e9ecef; padding: 2px 4px; border-radius: 3px;">${generatedPassword}</code></p>
              <p><strong>Faculty ID:</strong> ${faculty_id}</p>
            </div>
            
            <p>If you have any questions, please contact the system administrator.</p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">This is an automated message from ThesISKO System. Please do not reply to this email.</p>
          </div>
        `
      });

      console.log(`Faculty account created and email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send faculty credentials email:', emailError);
      // Don't fail the entire operation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Faculty account created successfully',
      data: {
        user_id: result.insertId,
        firstname,
        lastname,
        email,
        faculty_id: faculty_id,
        generated_password: generatedPassword // Include for admin reference
      }
    });

  } catch (error) {
    console.error('Error creating faculty account:', error);
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
  verifyStudentEmail,
  adminCreateFaculty
}
