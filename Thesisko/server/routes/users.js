import express from 'express'
import { getAllUsers, signupUser, loginUser, verifyStudentEmail } from '../controller/userController.js'

const router = express.Router()

// Get all users (without passwords)
router.get('/', getAllUsers)

// Signup endpoint
router.post('/', signupUser)

// Login endpoint (requires email, studentID, and password)
router.post('/login', loginUser)

// Verify student email: move from pending to users_info
router.get('/verify-student', verifyStudentEmail)

export default router