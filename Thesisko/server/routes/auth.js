import express from 'express'
import passport from '../config/passport.js'
import { googleAuthSuccess, googleAuthFailure, getCurrentUser, logoutUser } from '../controller/authController.js'

const router = express.Router()

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }),
  googleAuthSuccess
)

router.get('/google/failure', googleAuthFailure)

// Session helper routes
router.get('/me', getCurrentUser)

router.post('/logout', logoutUser)

export default router