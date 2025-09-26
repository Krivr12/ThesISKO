import express from 'express';
import { getAllUsers, signupUser, loginUser, verifyStudentEmail, getUserById, updateUser } from '../controller/userController.js';

const router = express.Router();

// GET /users - Get all users
router.get('/', getAllUsers);

// POST /users - Create new user (signup)
router.post('/', signupUser);

// POST /users/login - Login user
router.post('/login', loginUser);

// GET /users/verify - Verify student email
router.get('/verify', verifyStudentEmail);

// GET /users/:id - Get single user by ID
router.get('/:id', getUserById);

// PUT /users/:id - Update user information
router.put('/:id', updateUser);

export default router;
