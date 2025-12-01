// Google OAuth success handler
const googleAuthSuccess = async (req, res) => {
  console.log('🚀 Google OAuth Success handler called!');
  console.log('🚀 Request URL:', req.url);
  console.log('🚀 Request method:', req.method);
  console.log('🚀 Request headers:', req.headers);
  try {
    // Google OAuth successful
    const user = req.user;
    console.log('Google OAuth Success - User data:', JSON.stringify(user, null, 2));
    
    // Validate user data from Google
    if (!user) {
      console.error('❌ No user data received from Google OAuth');
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
      return;
    }
    
    if (!user.googleId) {
      console.error('❌ Missing googleId in user data:', user);
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
      return;
    }
    
    if (!user.email) {
      console.error('❌ Missing email in user data:', user);
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
      return;
    }
    
    if (user) {
      // Import database pool
      const { default: pool } = await import('../data/database.js');
      console.log('Database pool imported successfully');
      
      // Check if guest user already exists by Google ID
      console.log('Checking for existing guest user with Google ID:', user.googleId);
      const existingUsers = await pool.query(
        'SELECT * FROM users_info WHERE google_id = $1 AND role_id = (SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($2)) LIMIT 1',
        [user.googleId, 'guest']
      );
      console.log('Existing users query result:', existingUsers.rows);
      
      // Also check if email already exists (regardless of role) - JOIN with roles to get role_name
      const existingEmailUsers = await pool.query(
        `SELECT ui.user_id, ui.email, ui.firstname, ui.lastname, ui.role_id, ui.student_id, 
                ui.course, ui.department, ui.group_id, ui.block_id, ui.avatar_url, 
                r.role_name 
         FROM users_info ui
         LEFT JOIN roles r ON ui.role_id = r.role_id
         WHERE LOWER(ui.email) = LOWER($1) LIMIT 1`,
        [user.email]
      );
      console.log('Existing email users query result:', existingEmailUsers.rows);
      console.log('🔍 group_id from query:', existingEmailUsers.rows[0]?.group_id);
      
      // Get Guest role ID - try both 'guest' and 'Guest' for case sensitivity
      let roleResult = await pool.query('SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($1)', ['guest']);
      let roleId = roleResult.rows[0]?.role_id;
      console.log('Guest role ID (case-insensitive):', roleId);
      
      let guestUser;
      
      if (existingUsers.rows.length > 0) {
        // Update existing guest user with new avatar and Google ID
        const existingUser = existingUsers.rows[0];
        await pool.query(
          'UPDATE users_info SET avatar_url = $1, firstname = $2, lastname = $3, google_id = $4 WHERE user_id = $5',
          [user.avatar, user.firstName, user.lastName, user.googleId, existingUser.user_id]
        );
        
        guestUser = {
          id: existingUser.user_id,
          email: existingUser.email,
          Status: 'guest',
          Firstname: user.firstName,
          Lastname: user.lastName,
          AvatarUrl: user.avatar,
          Email: existingUser.email
        };
        
        console.log('Updated existing guest user:', JSON.stringify(guestUser, null, 2));
      } else if (existingEmailUsers.rows.length > 0) {
        // Email exists - check if it's a registered user (students, faculty, admin)
        const existingUser = existingEmailUsers.rows[0];
        console.log('Email exists, checking role:', existingUser);
        
        // Protected roles: Student (2), Faculty (3), Admin (4), SuperAdmin (5), and combined roles (6, 7, 8)
        // Only role_id = 1 (guest) or null should be converted to guest
        const isRegisteredUser = existingUser.role_id >= 2;
        
        if (isRegisteredUser) {
          // For registered users (students, faculty, admin), link Google account WITHOUT changing role or names
          console.log('🔒 Registered user detected (role_id: ' + existingUser.role_id + '), preserving role and linking Google account');
          await pool.query(
            'UPDATE users_info SET avatar_url = $1, google_id = $2 WHERE user_id = $3',
            [user.avatar, user.googleId, existingUser.user_id]
          );
          
          guestUser = {
            id: existingUser.user_id,
            email: existingUser.email,
            Status: existingUser.role_name, // Preserve original status (student/faculty/admin/etc)
            Firstname: existingUser.firstname, // Use DB firstname, not Google's
            Lastname: existingUser.lastname,   // Use DB lastname, not Google's
            AvatarUrl: user.avatar,
            Email: existingUser.email,
            role_id: existingUser.role_id, // Preserve original role_id
            StudentID: existingUser.student_id, // Include student_id if exists
            Department: existingUser.department,
            Course: existingUser.course,
            group_id: existingUser.group_id // Get group_id directly from users_info table
          };
          
          console.log('🔍 existingUser.group_id:', existingUser.group_id);
          console.log('🔍 guestUser.group_id:', guestUser.group_id);
          console.log('✅ Google account linked to registered user without role change:', JSON.stringify(guestUser, null, 2));
        } else {
          // For true guests (role_id = 1 or null), update their info
          console.log('Guest user detected, updating info:', existingUser);
          await pool.query(
            'UPDATE users_info SET role_id = $1, avatar_url = $2, firstname = $3, lastname = $4, google_id = $5 WHERE user_id = $6',
            [roleId, user.avatar, user.firstName, user.lastName, user.googleId, existingUser.user_id]
          );
          
          guestUser = {
            id: existingUser.user_id,
            email: user.email,
            Status: 'guest',
            Firstname: user.firstName,
            Lastname: user.lastName,
            AvatarUrl: user.avatar,
            Email: user.email,
            role_id: roleId
          };
          
          console.log('Updated existing guest user:', JSON.stringify(guestUser, null, 2));
        }
      } else {
        // Create new guest user
        console.log('Creating new guest user...');
        
        if (!roleId) {
          console.log('Guest role not found, creating it...');
          // Create Guest role if it doesn't exist
          try {
            const createRoleResult = await pool.query(
              'INSERT INTO roles (role_name) VALUES ($1) RETURNING role_id',
              ['guest']
            );
            roleId = createRoleResult.rows[0]?.role_id;
            console.log('Created Guest role with ID:', roleId);
          } catch (createRoleError) {
            console.error('Error creating Guest role:', createRoleError);
            // Try to get role_id = 1 directly (assuming guest is role_id 1)
            const fallbackRoleResult = await pool.query('SELECT role_id FROM roles WHERE role_id = $1', [1]);
            if (fallbackRoleResult.rows.length > 0) {
              roleId = 1;
              console.log('Using fallback role_id = 1 for guest');
            } else {
              throw new Error('Failed to create or find Guest role');
            }
          }
        } else {
          console.log('Found existing Guest role with ID:', roleId);
        }
        
        try {
          // For guest users, we don't need a password, so we'll use a placeholder
          // Also set course and department to NULL since guests don't have these
          // Store Google ID for proper identification
          const insertResult = await pool.query(
            'INSERT INTO users_info (email, firstname, lastname, role_id, avatar_url, password_hash, course, department, google_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id',
            [user.email, user.firstName, user.lastName, roleId, user.avatar, 'guest_no_password', null, null, user.googleId]
          );
          
          console.log('Insert result:', insertResult);
          
          guestUser = {
            id: insertResult.rows[0]?.user_id || `guest-${Date.now()}`,
            email: user.email,
            Status: 'guest',
            Firstname: user.firstName,
            Lastname: user.lastName,
            AvatarUrl: user.avatar,
            Email: user.email,
            role_id: roleId // Add role_id for proper guest identification
          };
          
          console.log('Created new guest user:', JSON.stringify(guestUser, null, 2));
        } catch (insertError) {
          console.error('Error inserting guest user:', insertError);
          res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=insert_failed`);
          return;
        }
      }
      
      // Set auth cookie for the user
      // Extract domain from FRONTEND_URL to set cookie domain correctly
      // Set HttpOnly cookie with user data using centralized security configuration
      const { getAuthCookieConfig, AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
      
      console.log('Setting cookie with domain:', getAuthCookieConfig().domain);
      console.log('Cookie secure setting:', getAuthCookieConfig().secure);
      
      res.cookie(AUTH_COOKIE_NAME, JSON.stringify(guestUser), getAuthCookieConfig());
      
      console.log('Cookie set successfully for user:', guestUser.email);
      
      // Encode user data and redirect to Google callback component
      console.log('About to redirect with guestUser:', JSON.stringify(guestUser, null, 2));
      const userData = { user: guestUser };
      console.log('User data object:', JSON.stringify(userData, null, 2));
      const encodedData = encodeURIComponent(JSON.stringify(userData));
      console.log('Encoded data length:', encodedData.length);
      const redirectUrl = `${frontendUrl}/google-callback?data=${encodedData}`;
      console.log('Redirect URL:', redirectUrl);
      res.redirect(redirectUrl);
    } else {
      console.log('No user data received from Google OAuth');
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
    }
  } catch (error) {
    console.error('❌ Google auth success error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      sqlState: error.code, // PostgreSQL error code
      sqlMessage: error.message
    });
    
    // Log more details for debugging
    if (error.code) {
      console.error('❌ Database error code:', error.code);
    }
    if (error.detail) {
      console.error('❌ Database error detail:', error.detail);
    }
    if (error.hint) {
      console.error('❌ Database error hint:', error.hint);
    }
    
    // Send error details in redirect for debugging (in production, you might want to remove this)
    const errorMessage = encodeURIComponent(error.message || 'Unknown server error');
    res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=server_error&details=${errorMessage}`);
  }
};

// Google OAuth failure handler
const googleAuthFailure = (req, res) => {
  console.log('Google OAuth failed');
  res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/login?error=oauth_failed`);
};

export {
  googleAuthSuccess,
  googleAuthFailure
};
