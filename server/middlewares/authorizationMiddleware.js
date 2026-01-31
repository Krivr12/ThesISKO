/**
 * Authorization Middleware
 * 
 * Provides role-based authorization checks and resource ownership verification.
 * Must be used after requireAuth middleware which sets req.user
 * 
 * Usage:
 *   import { requireRole, requireDeanAccess, requireChairpersonAccess } from '../middlewares/authorizationMiddleware.js';
 *   router.get('/protected', requireAuth, requireRole(4, 5), handler);
 */

import pool from '../data/database.js';

/**
 * Check if user has one of the allowed roles
 * 
 * @param {...number} allowedRoles - Role IDs that are allowed (e.g., 4, 5)
 * @returns {Function} Express middleware function
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_id) {
      return res.status(401).json({ 
        authenticated: false,
        error: 'Unauthorized',
        message: 'User role not found'
      });
    }
    
    if (!allowedRoles.includes(req.user.role_id)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or ')
      });
    }
    
    next();
  };
};

/** Admin role set: Faculty (3), Chairperson (4), Superadmin/Dean (5) */
export const ADMIN_ROLES = [3, 4, 5];

/**
 * Allow access only if user is accessing their own resource (req.params.id matches user) or is admin (role 3, 4, 5).
 * Use after requireAuth. Expects route param :id to be user_id.
 */
export const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }
  const requestedId = req.params.id;
  const userId = String(req.user.id ?? req.user.user_id ?? '');
  if (userId === String(requestedId)) {
    return next();
  }
  if (ADMIN_ROLES.includes(req.user.role_id)) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden', message: 'You can only access your own data' });
};

/**
 * Verify user can only access their own data (email must match)
 * Use this for routes where users should only access their own resources
 * 
 * @returns {Function} Express middleware function
 */
export const requireOwnership = (req, res, next) => {
  const userEmail = req.user?.email || req.user?.Email;
  
  if (!userEmail) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'User email not found'
    });
  }
  
  // If there's an email param, verify it matches
  if (req.params.email) {
    const requestedEmail = req.params.email;
    if (userEmail.toLowerCase() !== requestedEmail.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Cannot access other user data'
      });
    }
  }
  
  next();
};

/**
 * Verify user is a Dean and has department_head assigned
 * Attaches req.deanDepartmentId to request for use in route handlers
 * 
 * Dean (role_id = 5): Manages a department, can access all programs in that department
 * 
 * @returns {Function} Express middleware function
 */
export const requireDeanAccess = async (req, res, next) => {
  try {
    const userEmail = req.user?.email || req.user?.Email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User email not found'
      });
    }
    
    // Check if user is dean (role_id = 5)
    if (req.user.role_id !== 5) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Dean access required (role_id = 5)'
      });
    }
    
    // Verify user is actually a dean with department_head assigned
    const deanResult = await pool.query(
      `SELECT department_head 
       FROM users_info 
       WHERE email = $1 AND role_id = 5`,
      [userEmail]
    );
    
    if (deanResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'User is not a valid dean'
      });
    }
    
    const departmentId = deanResult.rows[0].department_head;
    
    if (!departmentId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Dean does not have a department assigned'
      });
    }
    
    // Attach department ID to request for use in route handlers
    req.deanDepartmentId = departmentId;
    req.deanEmail = userEmail;
    
    next();
  } catch (error) {
    console.error('[authorizationMiddleware] Error in requireDeanAccess:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'An error occurred during authorization'
    });
  }
};

/**
 * Verify user is a Chairperson and has a program assigned
 * Attaches req.chairpersonProgramId to request for use in route handlers
 * 
 * Chairperson (role_id = 4): Manages a specific program, can only access that program's data
 * 
 * @returns {Function} Express middleware function
 */
export const requireChairpersonAccess = async (req, res, next) => {
  try {
    const userEmail = req.user?.email || req.user?.Email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User email not found'
      });
    }
    
    // Check if user is chairperson (role_id = 4)
    if (req.user.role_id !== 4) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Chairperson access required (role_id = 4)'
      });
    }
    
    // Verify user is actually a chairperson of a program
    const { getDb } = await import('../databaseConnections/MongoDB/mongodb_connection.js');
    const programsCollection = getDb().collection('programs');
    const program = await programsCollection.findOne({ 
      chairperson_email: userEmail 
    });
    
    if (!program) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'User is not a chairperson of any program'
      });
    }
    
    // Attach program ID to request for use in route handlers
    req.chairpersonProgramId = program.program_id;
    req.chairpersonEmail = userEmail;
    req.chairpersonProgram = program;
    
    next();
  } catch (error) {
    console.error('[authorizationMiddleware] Error in requireChairpersonAccess:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'An error occurred during authorization'
    });
  }
};

/**
 * Verify user is a Faculty member (role_id = 3)
 * Can be FIC (Faculty-in-Charge) or Panelist
 * 
 * @returns {Function} Express middleware function
 */
export const requireFacultyAccess = async (req, res, next) => {
  try {
    const userEmail = req.user?.email || req.user?.Email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User email not found'
      });
    }
    
    // Check if user is faculty (role_id = 3)
    if (req.user.role_id !== 3) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Faculty access required (role_id = 3)'
      });
    }
    
    // Verify user is actually a faculty member
    const facultyResult = await pool.query(
      `SELECT faculty_id 
       FROM users_info 
       WHERE email = $1 AND role_id = 3`,
      [userEmail]
    );
    
    if (facultyResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'User is not a valid faculty member'
      });
    }
    
    req.facultyEmail = userEmail;
    req.facultyId = facultyResult.rows[0].faculty_id;
    
    next();
  } catch (error) {
    console.error('[authorizationMiddleware] Error in requireFacultyAccess:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'An error occurred during authorization'
    });
  }
};

/**
 * Verify user is a Student (role_id = 2) or Group Leader (role_id = 6)
 * 
 * @returns {Function} Express middleware function
 */
export const requireStudentAccess = (req, res, next) => {
  const userEmail = req.user?.email || req.user?.Email;
  
  if (!userEmail) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'User email not found'
    });
  }
  
  // Check if user is student (role_id = 2) or group leader (role_id = 6)
  if (req.user.role_id !== 2 && req.user.role_id !== 6) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Student or Group Leader access required (role_id = 2 or 6)'
    });
  }
  
  next();
};

/**
 * Verify user owns a submission (submitter_email matches)
 * Use this for routes where students should only access their own submissions
 * 
 * @returns {Function} Express middleware function
 */
export const requireSubmissionOwnership = async (req, res, next) => {
  try {
    const userEmail = req.user?.email || req.user?.Email;
    const { submission_id } = req.params;
    
    if (!userEmail) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User email not found'
      });
    }
    
    if (!submission_id) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Submission ID is required'
      });
    }
    
    const { getDb } = await import('../databaseConnections/MongoDB/mongodb_connection.js');
    const submissionsCollection = getDb().collection('submissions');
    
    const submission = await submissionsCollection.findOne({ 
      submission_id 
    });
    
    if (!submission) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Submission not found'
      });
    }
    
    // Check if user is the submitter
    if (submission.submitter_email?.toLowerCase() !== userEmail.toLowerCase()) {
      // Allow if user is faculty, chairperson, or superadmin (role 3, 4, 5)
      if (![3, 4, 5].includes(req.user.role_id)) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Cannot access submission: not the submitter'
        });
      }
    }
    
    req.submission = submission;
    next();
  } catch (error) {
    console.error('[authorizationMiddleware] Error in requireSubmissionOwnership:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'An error occurred during authorization'
    });
  }
};

/**
 * Verify chairperson can approve/reject a submission
 * Checks that submission belongs to chairperson's program
 * Must be used after requireChairpersonAccess
 * 
 * @returns {Function} Express middleware function
 */
export const requireChairpersonSubmissionAccess = async (req, res, next) => {
  try {
    const { submission_id } = req.params;
    const chairpersonProgramId = req.chairpersonProgramId;
    
    if (!submission_id) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Submission ID is required'
      });
    }
    
    if (!chairpersonProgramId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Chairperson program not found'
      });
    }
    
    const { getDb } = await import('../databaseConnections/MongoDB/mongodb_connection.js');
    const submissionsCollection = getDb().collection('submissions');
    
    const submission = await submissionsCollection.findOne({ 
      submission_id 
    });
    
    if (!submission) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Submission not found'
      });
    }
    
    // Verify submission belongs to chairperson's program
    if (submission.program !== chairpersonProgramId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Submission does not belong to your program'
      });
    }
    
    req.submission = submission;
    next();
  } catch (error) {
    console.error('[authorizationMiddleware] Error in requireChairpersonSubmissionAccess:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'An error occurred during authorization'
    });
  }
};

/**
 * Verify dean can approve/reject a submission
 * Checks that submission belongs to dean's department
 * Must be used after requireDeanAccess
 * 
 * @returns {Function} Express middleware function
 */
export const requireDeanSubmissionAccess = async (req, res, next) => {
  try {
    const { submission_id } = req.params;
    const deanDepartmentId = req.deanDepartmentId;
    
    if (!submission_id) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Submission ID is required'
      });
    }
    
    if (!deanDepartmentId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Dean department not found'
      });
    }
    
    const { getDb } = await import('../databaseConnections/MongoDB/mongodb_connection.js');
    const submissionsCollection = getDb().collection('submissions');
    const programsCollection = getDb().collection('programs');
    
    const submission = await submissionsCollection.findOne({ 
      submission_id 
    });
    
    if (!submission) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Submission not found'
      });
    }
    
    // Get program to check department
    const program = await programsCollection.findOne({ 
      program_id: submission.program 
    });
    
    if (!program) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Program not found for submission'
      });
    }
    
    // Verify submission's program belongs to dean's department
    if (program.department_id !== deanDepartmentId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Submission does not belong to your department'
      });
    }
    
    req.submission = submission;
    next();
  } catch (error) {
    console.error('[authorizationMiddleware] Error in requireDeanSubmissionAccess:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'An error occurred during authorization'
    });
  }
};

