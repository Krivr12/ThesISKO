import pool from '../data/database.js';

class ActivityLogger {
  /**
   * Log user activity to the database
   * @param {Object} logData - Activity log data
   * @param {number|null} logData.userId - User ID (null for anonymous users)
   * @param {string} logData.sessionId - Session ID
   * @param {string} logData.actionType - Type of action performed
   * @param {string} logData.actionDescription - Human-readable description
   * @param {string} logData.resourceType - Type of resource (thesis, user, etc.)
   * @param {string} logData.resourceId - ID of the resource
   * @param {string} logData.ipAddress - User's IP address
   * @param {string} logData.userAgent - User's browser/client info
   * @param {string} logData.requestMethod - HTTP method
   * @param {string} logData.requestUrl - Request URL
   * @param {Object} logData.requestBody - Request body data
   * @param {number} logData.responseStatus - HTTP response status
   * @param {Object} logData.additionalData - Extra metadata
   */
  static async logActivity(logData) {
    try {
      const {
        userId = null,
        sessionId,
        actionType,
        actionDescription,
        resourceType = null,
        resourceId = null,
        ipAddress,
        userAgent,
        requestMethod,
        requestUrl,
        requestBody = null,
        responseStatus = null,
        additionalData = null
      } = logData;

      const query = `
        INSERT INTO activity_log (
          user_id, session_id, action_type, action_description,
          resource_type, resource_id, ip_address, user_agent,
          request_method, request_url, request_body, response_status,
          additional_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        userId,
        sessionId,
        actionType,
        actionDescription,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        requestMethod,
        requestUrl,
        requestBody ? JSON.stringify(requestBody) : null,
        responseStatus,
        additionalData ? JSON.stringify(additionalData) : null
      ];

      await pool.execute(query, values);
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }

  /**
   * Get activity logs for a specific user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.actionType - Filter by action type
   * @param {Date} options.startDate - Filter from this date
   * @param {Date} options.endDate - Filter to this date
   */
  static async getUserActivityLogs(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        actionType = null,
        startDate = null,
        endDate = null
      } = options;

      let query = `
        SELECT 
          log_id, user_id, session_id, action_type, action_description,
          resource_type, resource_id, ip_address, request_method,
          request_url, response_status, created_at, additional_data
        FROM activity_log 
        WHERE user_id = ?
      `;
      
      const values = [userId];

      if (actionType) {
        query += ' AND action_type = ?';
        values.push(actionType);
      }

      if (startDate) {
        query += ' AND created_at >= ?';
        values.push(startDate);
      }

      if (endDate) {
        query += ' AND created_at <= ?';
        values.push(endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      values.push(limit, offset);

      const [rows] = await pool.execute(query, values);
      return rows;
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      throw error;
    }
  }

  /**
   * Get activity logs for a specific session
   * @param {string} sessionId - Session ID
   */
  static async getSessionActivityLogs(sessionId) {
    try {
      const query = `
        SELECT 
          log_id, user_id, session_id, action_type, action_description,
          resource_type, resource_id, ip_address, request_method,
          request_url, response_status, created_at, additional_data
        FROM activity_log 
        WHERE session_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await pool.execute(query, [sessionId]);
      return rows;
    } catch (error) {
      console.error('Error fetching session activity logs:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics for a user
   * @param {number} userId - User ID
   */
  static async getUserActivityStats(userId) {
    try {
      const query = `
        SELECT 
          action_type,
          COUNT(*) as count,
          MAX(created_at) as last_activity
        FROM activity_log 
        WHERE user_id = ?
        GROUP BY action_type
        ORDER BY count DESC
      `;

      const [rows] = await pool.execute(query, [userId]);
      return rows;
    } catch (error) {
      console.error('Error fetching user activity stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old activity logs (for maintenance)
   * @param {number} daysToKeep - Number of days to keep logs
   */
  static async cleanupOldLogs(daysToKeep = 365) {
    try {
      const query = `
        DELETE FROM activity_log 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `;

      const [result] = await pool.execute(query, [daysToKeep]);
      console.log(`Cleaned up ${result.affectedRows} old activity log entries`);
      return result.affectedRows;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      throw error;
    }
  }
}

export default ActivityLogger;
