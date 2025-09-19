// Google OAuth success handler
const googleAuthSuccess = (req, res) => {
  // Redirect back to Angular app with user data
  const userData = encodeURIComponent(JSON.stringify({
    message: 'Google login successful',
    user: req.user
  }));
  res.redirect(`http://localhost:4200/google-callback?data=${userData}`);
}

// Google OAuth failure handler
const googleAuthFailure = (req, res) => {
  res.status(401).json({ error: 'Google authentication failed' })
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