// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

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

// Debug environment variables in passport.js
console.log('🔍 Passport.js Environment Check:');
console.log('GOOGLE_CLIENT_ID in passport.js:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET in passport.js:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('🔧 Registering Google OAuth strategy...');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5050/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('🔍 Google OAuth Profile:', {
            id: profile.id,
            displayName: profile.displayName,
            emails: profile.emails,
            name: profile.name
          });
          
          const email = profile.emails?.[0]?.value?.trim().toLowerCase() || null
          if (!email) {
            console.error('❌ Google OAuth: No email provided');
            return done(new Error('Google account did not provide an email'));
          }
          
          console.log('✅ Google OAuth: Processing email:', email);

          const firstName = profile.name?.givenName || profile.displayName || ''
          const lastName = profile.name?.familyName || ''
          const status = 'Guest' // Google OAuth only creates Guest users
          const googleId = profile.id
          const photoUrl = profile.photos?.[0]?.value || null

          // Only allow Google OAuth for Guest users (any email domain)
          // Students must use regular signup with @iskolarngbayan.pup.edu.ph email

          // Check if user exists
          const [existingRows] = await pool.execute(`
            SELECT 
              ui.user_id,
              ui.firstname,
              ui.lastname,
              ui.email,
              r.role_name,
              c.course_code,
              d.department_name,
              ui.avatar_url
            FROM users_info ui
            LEFT JOIN roles r ON ui.role_id = r.role_id
            LEFT JOIN courses c ON ui.course_id = c.course_id
            LEFT JOIN departments d ON ui.department_id = d.department_id
            WHERE LOWER(ui.email) = ? LIMIT 1
          `, [email])

          if (existingRows.length > 0) {
            const rawUser = existingRows[0]
            // Map column names to expected format
            const user = {
              StudentID: rawUser.user_id,
              Firstname: rawUser.firstname,
              Lastname: rawUser.lastname,
              Email: rawUser.email,
              Status: rawUser.role_name,
              Course: rawUser.course_code,
              Department: rawUser.department_name,
              AvatarUrl: rawUser.avatar_url
            }
            
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
              ui.user_id,
              ui.firstname,
              ui.lastname,
              ui.email,
              r.role_name,
              c.course_code,
              d.department_name,
              ui.avatar_url
            FROM users_info ui
            LEFT JOIN roles r ON ui.role_id = r.role_id
            LEFT JOIN courses c ON ui.course_id = c.course_id
            LEFT JOIN departments d ON ui.department_id = d.department_id
            WHERE LOWER(ui.email) = ? LIMIT 1
          `, [email])

          const rawCreatedUser = createdRows[0]
          const createdUser = {
            StudentID: rawCreatedUser.user_id,
            Firstname: rawCreatedUser.firstname,
            Lastname: rawCreatedUser.lastname,
            Email: rawCreatedUser.email,
            Status: rawCreatedUser.role_name,
            Course: rawCreatedUser.course_code,
            Department: rawCreatedUser.department_name,
            AvatarUrl: rawCreatedUser.avatar_url
          }
          
          return done(null, createdUser)
        } catch (error) {
          console.error('❌ Google OAuth Error:', error.message);
          console.error('❌ Full Error:', error);
          return done(error)
        }
      }
    )
  );
  console.log('✅ Google OAuth strategy registered successfully');
} else {
  console.warn('❌ Google OAuth strategy NOT registered - missing credentials');
}
// Minimal session serialization
passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

export default passport