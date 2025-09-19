import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import bcrypt from 'bcrypt'
import pool from '../data/database.js'

// Helper function to get role_id by role name
const getRoleId = async (roleName) => {
  try {
    const [rows] = await pool.execute(
      'SELECT role_id FROM roles WHERE role_name = ? LIMIT 1',
      [roleName]
    )
    if (rows.length === 0) {
      // If role doesn't exist, create it
      const [result] = await pool.execute(
        'INSERT INTO roles (role_name) VALUES (?)',
        [roleName]
      )
      return result.insertId
    }
    return rows[0].role_id
  } catch (error) {
    console.error('Error getting role_id:', error)
    return 1 // Default to guest role
  }
}

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5050/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.trim().toLowerCase() || null
          if (!email) return done(new Error('Google account did not provide an email'))

          const firstName = profile.name?.givenName || profile.displayName || ''
          const lastName = profile.name?.familyName || ''
          const status = 'Guest'
          const googleId = profile.id
          const photoUrl = profile.photos?.[0]?.value || null

          // Check if user exists
          const [existingRows] = await pool.execute(`
            SELECT 
              ui.user_id AS StudentID,
              ui.firstname AS Firstname,
              ui.lastname AS Lastname,
              ui.email AS Email,
              r.role_name AS Status,
              c.course_code AS Course,
              d.department_name AS Department,
              ui.avatar_url AS AvatarUrl
            FROM users_info ui
            LEFT JOIN roles r ON ui.role_id = r.role_id
            LEFT JOIN courses c ON ui.course_id = c.course_id
            LEFT JOIN departments d ON ui.department_id = d.department_id
            WHERE LOWER(ui.email) = ? LIMIT 1
          `, [email])

          if (existingRows.length > 0) {
            const user = existingRows[0]
            // Update if info changed
            const needsUpdate = (user.Firstname !== firstName) || (user.Lastname !== lastName) || (user.AvatarUrl !== photoUrl)
            if (needsUpdate) {
              const roleId = await getRoleId(user.Status || status)
              await pool.execute(
                'UPDATE users_info SET google_id = ?, firstname = ?, lastname = ?, avatar_url = ?, role_id = ? WHERE LOWER(email) = ?',
                [googleId, firstName, lastName, photoUrl, roleId, email]
              )
            }
            return done(null, user)
          }

          // Create new user
          const placeholderHash = await bcrypt.hash(`google:${profile.id}:${Date.now()}`, await bcrypt.genSalt())
          const roleId = await getRoleId(status)

          await pool.execute(
            'INSERT INTO users_info (email, password_hash, google_id, role_id, firstname, lastname, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [email, placeholderHash, googleId, roleId, firstName, lastName, photoUrl]
          )

          const [createdRows] = await pool.execute(`
            SELECT 
              ui.user_id AS StudentID,
              ui.firstname AS Firstname,
              ui.lastname AS Lastname,
              ui.email AS Email,
              r.role_name AS Status,
              c.course_code AS Course,
              d.department_name AS Department,
              ui.avatar_url AS AvatarUrl
            FROM users_info ui
            LEFT JOIN roles r ON ui.role_id = r.role_id
            LEFT JOIN courses c ON ui.course_id = c.course_id
            LEFT JOIN departments d ON ui.department_id = d.department_id
            WHERE LOWER(ui.email) = ? LIMIT 1
          `, [email])

          return done(null, createdRows[0])
        } catch (error) {
          return done(error)
        }
      }
    )
  )
} else {
  console.warn('⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in config.env')
}
// Minimal session serialization
passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

export default passport