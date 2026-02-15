import express from 'express';
import { getAllUsers, signupUser, loginUser, verifyStudentEmail, getUserById, updateUser } from '../controller/userController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole, requireSelfOrAdmin } from '../middlewares/authorizationMiddleware.js';

const router = express.Router();

// GET /users - Get all users (admin only: role 3, 4, 5)
router.get('/', requireAuth, requireRole(3, 4, 5), getAllUsers);

// POST /users - Create new user (signup) - public
router.post('/', signupUser);

// POST /users/login - Login user - public
router.post('/login', loginUser);

// GET /users/verify - Verify student email (used by email link) - public
router.get('/verify', verifyStudentEmail);

// GET /users/:id - Get single user (self or admin)
router.get('/:id', requireAuth, requireSelfOrAdmin, getUserById);

// PUT /users/:id - Update user (self or admin)
router.put('/:id', requireAuth, requireSelfOrAdmin, updateUser);

export default router;
