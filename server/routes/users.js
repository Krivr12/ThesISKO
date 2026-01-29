import express from 'express';
import { getAllUsers, signupUser, loginUser, verifyStudentEmail, getUserById, updateUser } from '../controller/userController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authorizationMiddleware.js';

const router = express.Router();

const adminOnly = [requireAuth, requireRole(3, 4, 5)];

// Same user (by id) or admin (role 3, 4, 5)
const requireSelfOrAdmin = (req, res, next) => {
  const userId = req.user?.id ?? req.user?.user_id;
  const requestedId = req.params.id;
  if (userId == requestedId) return next();
  if (req.user?.role_id && [3, 4, 5].includes(req.user.role_id)) return next();
  return res.status(403).json({ error: 'Forbidden', message: 'You can only access your own profile unless you are an admin.' });
};

// GET /users - Get all users (admin only)
router.get('/', adminOnly, getAllUsers);

// POST /users - Create new user (signup) - public
router.post('/', signupUser);

// POST /users/login - Login user (handled by auth routes; keep for backward compat if used)
router.post('/login', loginUser);

// GET /users/verify - Verify student email - public
router.get('/verify', verifyStudentEmail);

// GET /users/:id - Get single user by ID (self or admin)
router.get('/:id', requireAuth, requireSelfOrAdmin, getUserById);

// PUT /users/:id - Update user information (self or admin)
router.put('/:id', requireAuth, requireSelfOrAdmin, updateUser);

export default router;
