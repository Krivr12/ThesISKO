// Google OAuth success handler
const googleAuthSuccess = (req, res) => {
  try {
    if (!req.user) {
      console.error('Google OAuth: No user data received');
      return res.redirect(`http://localhost:4200/google-callback?error=no_user_data`);
    }

    // Store user data in server session for activity logging
    req.session.user = {
      id: req.user.StudentID,
      user_id: req.user.StudentID,
      email: req.user.Email,
      Status: req.user.Status || 'Guest',
      Firstname: req.user.Firstname,
      Lastname: req.user.Lastname
    };

    console.log('Google OAuth Success - User:', req.user.Email, 'Role:', req.user.Status);

    // Redirect back to Angular app with user data
    const userData = encodeURIComponent(JSON.stringify({
      message: 'Google login successful',
      user: req.user
    }));
    res.redirect(`http://localhost:4200/google-callback?data=${userData}`);
  } catch (error) {
    console.error('Google OAuth Success Handler Error:', error);
    res.redirect(`http://localhost:4200/google-callback?error=auth_failed`);
  }
}

// Google OAuth failure handler
const googleAuthFailure = (req, res) => {
  console.error('Google OAuth Failed');
  res.redirect(`http://localhost:4200/google-callback?error=auth_failed`);
}

// Get current user session
const getCurrentUser = (req, res) => {
  if (!req.user) return res.status(401).json({ authenticated: false })
  res.json({ authenticated: true, user: req.user })
}

// Logout user
const logoutUser = (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ message: 'Logged out' })
    })
  })
}

export {
  googleAuthSuccess,
  googleAuthFailure,
  getCurrentUser,
  logoutUser
}