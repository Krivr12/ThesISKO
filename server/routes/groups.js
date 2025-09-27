import express from 'express';
import { 
  createStudentGroup, 
  getGroupInfo, 
  deleteStudentGroup, 
  getAllGroups 
} from '../controller/groupController.js';

const router = express.Router();

/**
 * POST /groups/create
 * Create a new student group
 * 
 * Body:
 * {
 *   "group_id": "G001",
 *   "leader_email": "leader@example.com",
 *   "leader_text": "Project Leader",
 *   "members": [
 *     {
 *       "email": "member1@example.com",
 *       "text": "Developer"
 *     },
 *     {
 *       "email": "member2@example.com", 
 *       "text": "Researcher"
 *     }
 *   ]
 * }
 */
router.post('/create', createStudentGroup);

/**
 * GET /groups/:group_id
 * Get detailed information about a specific group
 */
router.get('/:group_id', getGroupInfo);

/**
 * DELETE /groups/:group_id
 * Delete a student group and all related records
 */
router.delete('/:group_id', deleteStudentGroup);

/**
 * GET /groups
 * Get all student groups with basic information
 */
router.get('/', getAllGroups);

export default router;
