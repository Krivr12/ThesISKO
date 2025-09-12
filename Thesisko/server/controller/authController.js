// Google OAuth success handler
const googleAuthSuccess = (req, res) => {
  res.json({ message: 'Google login successful', user: req.user })
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