import express from 'express';
import ActivityLogger from '../utils/activityLogger.js';

const router = express.Router();

/**
 * POST /activity/log - Manual activity logging endpoint
 * For client-side activities that don't involve HTTP requests
 */
router.post('/log', async (req, res) => {
  try {
    const {
      action_type,
      action_description,
      resource_type,
      resource_id,
      additional_data
    } = req.body;

    if (!action_type || !action_description) {
      return res.status(400).json({ 
        error: 'action_type and action_description are required' 
      });
    }

    const userId = req.session?.user?.id || req.session?.user?.user_id || req.user?.id || null;
    const sessionId = req.sessionID || req.session?.id || 'anonymous';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

    await ActivityLogger.logActivity({
      userId,
      sessionId,
      actionType: action_type,
      actionDescription: action_description,
      resourceType: resource_type,
      resourceId: resource_id,
      ipAddress,
      userAgent: req.get('User-Agent') || 'unknown',
      requestMethod: 'CLIENT',
      requestUrl: req.get('Referer') || 'client-side',
      requestBody: null,
      responseStatus: 200,
      additionalData: additional_data
    });

    res.json({ 
      success: true, 
      message: 'Activity logged successfully' 
    });
  } catch (error) {
    console.error('Error logging manual activity:', error);
    res.status(500).json({ 
      error: 'Failed to log activity' 
    });
  }
});

/**
 * POST /activity/batch - Batch activity logging
 * For logging multiple activities at once
 */
router.post('/batch', async (req, res) => {
  try {
    const { activities } = req.body;

    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({ 
        error: 'activities array is required' 
      });
    }

    const userId = req.session?.user?.id || req.session?.user?.user_id || req.user?.id || null;
    const sessionId = req.sessionID || req.session?.id || 'anonymous';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

    const logPromises = activities.map(activity => {
      const {
        action_type,
        action_description,
        resource_type,
        resource_id,
        additional_data
      } = activity;

      if (!action_type || !action_description) {
        throw new Error('Each activity must have action_type and action_description');
      }

      return ActivityLogger.logActivity({
        userId,
        sessionId,
        actionType: action_type,
        actionDescription: action_description,
        resourceType: resource_type,
        resourceId: resource_id,
        ipAddress,
        userAgent: req.get('User-Agent') || 'unknown',
        requestMethod: 'CLIENT_BATCH',
        requestUrl: req.get('Referer') || 'client-side',
        requestBody: null,
        responseStatus: 200,
        additionalData: additional_data
      });
    });

    await Promise.all(logPromises);

    res.json({ 
      success: true, 
      message: `${activities.length} activities logged successfully` 
    });
  } catch (error) {
    console.error('Error logging batch activities:', error);
    res.status(500).json({ 
      error: 'Failed to log batch activities' 
    });
  }
});

/**
 * GET /activity/user - Get current user's activity logs
 */
router.get('/user', async (req, res) => {
  try {
    const userId = req.session?.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated' 
      });
    }

    const {
      limit = 50,
      offset = 0,
      actionType,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      actionType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    const logs = await ActivityLogger.getUserActivityLogs(userId, options);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity logs' 
    });
  }
});

/**
 * GET /activity/user/stats - Get current user's activity statistics
 */
router.get('/user/stats', async (req, res) => {
  try {
    const userId = req.session?.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated' 
      });
    }

    const stats = await ActivityLogger.getUserActivityStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user activity stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity statistics' 
    });
  }
});

/**
 * GET /activity/session - Get current session's activity logs
 */
router.get('/session', async (req, res) => {
  try {
    const sessionId = req.sessionID || req.session?.id;
    
    if (!sessionId) {
      return res.status(400).json({ 
        error: 'No session found' 
      });
    }

    const logs = await ActivityLogger.getSessionActivityLogs(sessionId);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching session activity logs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch session activity logs' 
    });
  }
});

/**
 * GET /activity/admin/user/:userId - Admin endpoint to get any user's activity logs
 */
router.get('/admin/user/:userId', async (req, res) => {
  try {
    // Check if current user is admin
    const currentUserRole = req.session?.user?.Status || req.user?.Status;
    if (currentUserRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    const { userId } = req.params;
    const {
      limit = 100,
      offset = 0,
      actionType,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      actionType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    const logs = await ActivityLogger.getUserActivityLogs(userId, options);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Error fetching user activity logs (admin):', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity logs' 
    });
  }
});

/**
 * GET /activity/admin/stats - Admin endpoint to get system-wide activity statistics
 */
router.get('/admin/stats', async (req, res) => {
  try {
    // Check if current user is admin
    const currentUserRole = req.session?.user?.Status || req.user?.Status;
    if (currentUserRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    // Get system-wide statistics
    const query = `
      SELECT 
        action_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT user_id) as unique_users,
        DATE(created_at) as activity_date,
        MAX(created_at) as last_activity
      FROM activity_log 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY action_type, DATE(created_at)
      ORDER BY activity_date DESC, total_count DESC
    `;

    const pool = (await import('../data/database.js')).default;
    const [rows] = await pool.execute(query);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching system activity stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system statistics' 
    });
  }
});

/**
 * DELETE /activity/admin/cleanup - Admin endpoint to clean up old logs
 */
router.delete('/admin/cleanup', async (req, res) => {
  try {
    // Check if current user is admin
    const currentUserRole = req.session?.user?.Status || req.user?.Status;
    if (currentUserRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }

    const { daysToKeep = 365 } = req.query;
    const deletedCount = await ActivityLogger.cleanupOldLogs(parseInt(daysToKeep));
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old activity log entries`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up activity logs:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup activity logs' 
    });
  }
});

/**
 * DEBUG ENDPOINT - Remove in production
 * GET /activity/debug/session - Check current session data
 */
router.get('/debug/session', (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    user: req.user,
    sessionUser: req.session?.user,
    hasSession: !!req.session,
    hasUser: !!req.user,
    hasSessionUser: !!req.session?.user
  });
});

export default router;
