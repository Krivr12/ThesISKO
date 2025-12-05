// Google OAuth success handler
const googleAuthSuccess = async (req, res) => {
  try {
    // Google OAuth successful
    const user = req.user;
    
    // Validate user data from Google
    if (!user) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
      return;
    }
    
    if (!user.googleId) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
      return;
    }
    
    if (!user.email) {
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
      return;
    }
    
    if (user) {
      // Import database pool
      const { default: pool } = await import('../data/database.js');
      
      // Check if guest user already exists by Google ID
      const existingUsers = await pool.query(
        'SELECT * FROM users_info WHERE google_id = $1 AND role_id = (SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($2)) LIMIT 1',
        [user.googleId, 'guest']
      );
      
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
      
      // Get Guest role ID - try both 'guest' and 'Guest' for case sensitivity
      let roleResult = await pool.query('SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($1)', ['guest']);
      let roleId = roleResult.rows[0]?.role_id;
      
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
          Email: existingUser.email,
          role_id: existingUser.role_id || roleId || 1 // Include role_id for proper guest identification
        };
      } else if (existingEmailUsers.rows.length > 0) {
        // Email exists - check if it's a registered user (students, faculty, admin)
        const existingUser = existingEmailUsers.rows[0];
        
        // Protected roles: Student (2), Faculty (3), Admin (4), SuperAdmin (5), and combined roles (6, 7, 8)
        // Only role_id = 1 (guest) or null should be converted to guest
        const isRegisteredUser = existingUser.role_id >= 2;
        
        if (isRegisteredUser) {
          // For registered users (students, faculty, admin), link Google account WITHOUT changing role or names
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
        } else {
          // For true guests (role_id = 1 or null), update their info
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
        }
      } else {
        // Create new guest user
        if (!roleId) {
          // Create Guest role if it doesn't exist
          try {
            const createRoleResult = await pool.query(
              'INSERT INTO roles (role_name) VALUES ($1) RETURNING role_id',
              ['guest']
            );
            roleId = createRoleResult.rows[0]?.role_id;
          } catch (createRoleError) {
            // Try to get role_id = 1 directly (assuming guest is role_id 1)
            const fallbackRoleResult = await pool.query('SELECT role_id FROM roles WHERE role_id = $1', [1]);
            if (fallbackRoleResult.rows.length > 0) {
              roleId = 1;
            } else {
              throw new Error('Failed to create or find Guest role');
            }
          }
        }
        
        try {
          // For guest users, we don't need a password, so we'll use a placeholder
          // Also set course and department to NULL since guests don't have these
          // Store Google ID for proper identification
          const insertResult = await pool.query(
            'INSERT INTO users_info (email, firstname, lastname, role_id, avatar_url, password_hash, course, department, google_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id',
            [user.email, user.firstName, user.lastName, roleId, user.avatar, 'guest_no_password', null, null, user.googleId]
          );
          
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
        } catch (insertError) {
          res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=insert_failed`);
          return;
        }
      }
      
      // Set auth cookie for the user
      // Extract domain from FRONTEND_URL to set cookie domain correctly
      // Set HttpOnly cookie with user data using centralized security configuration
      const { getAuthCookieConfig, AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
      
      res.cookie(AUTH_COOKIE_NAME, JSON.stringify(guestUser), getAuthCookieConfig());
      
      // Encode user data and redirect to Google callback component
      const userData = { user: guestUser };
      const encodedData = encodeURIComponent(JSON.stringify(userData));
      const redirectUrl = `${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?data=${encodedData}`;
      res.redirect(redirectUrl);
    } else {
      res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=auth_failed`);
    }
  } catch (error) {
    // Send error details in redirect
    const errorMessage = encodeURIComponent(error.message || 'Unknown server error');
    res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/google-callback?error=server_error&details=${errorMessage}`);
  }
};

// Google OAuth failure handler
const googleAuthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'https://thesisko.online'}/login?error=oauth_failed`);
};

export {
  googleAuthSuccess,
  googleAuthFailure
};
