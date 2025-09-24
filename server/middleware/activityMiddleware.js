import ActivityLogger from '../utils/activityLogger.js';

/**
 * Middleware to automatically log all HTTP requests
 * This captures basic request information for every API call
 */
const activityLoggingMiddleware = (req, res, next) => {
  // Store original res.json to capture response
  const originalJson = res.json;
  let responseBody = null;
  let responseStatus = null;

  // Override res.json to capture response data
  res.json = function(body) {
    responseBody = body;
    responseStatus = res.statusCode;
    return originalJson.call(this, body);
  };

  // Store original res.end to ensure we log even for non-JSON responses
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    responseStatus = res.statusCode;
    return originalEnd.call(this, chunk, encoding);
  };

  // Log the activity after response is sent
  res.on('finish', async () => {
    try {
      // Extract user information from session or request
      const userId = req.session?.user?.id || req.session?.user?.user_id || req.user?.id || null;
      const sessionId = req.sessionID || req.session?.id || 'anonymous';
      
      // Get client IP address
      const ipAddress = req.ip || 
                       req.connection?.remoteAddress || 
                       req.socket?.remoteAddress ||
                       req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                       'unknown';

      // Determine action type based on request
      const actionType = determineActionType(req);
      
      // Create action description
      const actionDescription = createActionDescription(req, actionType);

      // Extract resource information
      const { resourceType, resourceId } = extractResourceInfo(req);

      // Prepare request body (exclude sensitive data)
      const sanitizedBody = sanitizeRequestBody(req.body);

      // Log the activity
      await ActivityLogger.logActivity({
        userId,
        sessionId,
        actionType,
        actionDescription,
        resourceType,
        resourceId,
        ipAddress,
        userAgent: req.get('User-Agent') || 'unknown',
        requestMethod: req.method,
        requestUrl: req.originalUrl || req.url,
        requestBody: sanitizedBody,
        responseStatus,
        additionalData: {
          referer: req.get('Referer'),
          timestamp: new Date().toISOString(),
          responseSize: res.get('Content-Length')
        }
      });
    } catch (error) {
      console.error('Error in activity logging middleware:', error);
      // Don't break the application flow
    }
  });

  next();
};

/**
 * Determine action type based on request method and URL
 */
function determineActionType(req) {
  const { method, originalUrl } = req;
  const url = originalUrl.toLowerCase();
  
  // Get user role from session
  const userRole = req.session?.user?.Status || req.user?.Status || 'guest';
  const isGuest = !req.session?.user && !req.user;

  // Authentication actions with role-specific prefixes
  if (url.includes('/auth/login')) {
    if (userRole.toLowerCase() === 'admin') return 'admin_login';
    if (userRole.toLowerCase() === 'faculty') {
      // Check if FIC or Panelist (you may need to add more specific role detection)
      return 'fic_login'; // Default to FIC, can be enhanced with more specific role detection
    }
    return isGuest ? 'guest_login' : 'student_login';
  }
  
  if (url.includes('/auth/logout')) {
    if (userRole.toLowerCase() === 'admin') return 'admin_logout';
    if (userRole.toLowerCase() === 'faculty') return 'fic_logout'; // Can be enhanced for panelist
    return isGuest ? 'guest_logout' : 'student_logout';
  }
  
  if (url.includes('/auth/register') || url.includes('/users') && method === 'POST') {
    return 'student_signup';
  }
  
  if (url.includes('/auth/google')) {
    return isGuest ? 'guest_google_signin' : 'google_login';
  }

  // Thesis-related actions with role-specific handling
  if (url.includes('/thesis') || url.includes('/records')) {
    if (method === 'GET' && url.includes('/search')) {
      return isGuest ? 'guest_search' : 'search_thesis';
    }
    if (method === 'GET' && url.includes('/request')) {
      return isGuest ? 'guest_request_thesis' : 'request_thesis';
    }
    if (method === 'GET') {
      return isGuest ? 'guest_view_thesis' : 'view_thesis';
    }
    if (method === 'POST' && url.includes('/submit')) {
      return 'submit_thesis';
    }
    if (method === 'POST') return 'upload_thesis';
    if (method === 'PUT') return 'update_thesis';
    if (method === 'DELETE') return 'delete_thesis';
  }

  // Faculty-specific actions
  if (url.includes('/faculty')) {
    if (url.includes('/approve') && userRole.toLowerCase() === 'faculty') {
      // Detect if it's FIC or Panelist based on URL or user data
      return url.includes('/request') ? 'fic_approve_request' : 'panelist_approve_request';
    }
    if (url.includes('/reject') && userRole.toLowerCase() === 'faculty') {
      return url.includes('/request') ? 'fic_reject_request' : 'panelist_reject_request';
    }
    if (url.includes('/groups') && method === 'POST') return 'fic_add_groups';
    if (url.includes('/comment') && method === 'POST') return 'panelist_comment';
    if (method === 'GET') return 'faculty_view';
    if (method === 'POST') return 'faculty_action';
  }

  // Admin actions
  if (url.includes('/admin')) {
    if (url.includes('/faculty') && method === 'POST') return 'admin_create_faculty';
    if (url.includes('/capstone/approve')) return 'admin_approve_capstone';
    if (url.includes('/capstone/reject')) return 'admin_reject_capstone';
    if (url.includes('/request/approve')) return 'admin_approve_request';
    if (url.includes('/request/reject')) return 'admin_reject_request';
    if (method === 'GET') return 'admin_view';
    if (method === 'POST') return 'admin_action';
    if (method === 'PUT') return 'admin_update';
    if (method === 'DELETE') return 'admin_delete';
  }

  // User profile actions
  if (url.includes('/profile') || url.includes('/user')) {
    if (method === 'GET') return 'view_profile';
    if (method === 'PUT') return 'update_profile';
  }

  // Admin actions
  if (url.includes('/admin')) {
    if (method === 'GET') return 'admin_view';
    if (method === 'POST') return 'admin_action';
    if (method === 'PUT') return 'admin_update';
    if (method === 'DELETE') return 'admin_delete';
  }

  // Faculty actions
  if (url.includes('/faculty')) {
    if (url.includes('/approve')) return 'approve_thesis';
    if (url.includes('/reject')) return 'reject_thesis';
    if (method === 'GET') return 'faculty_view';
    if (method === 'POST') return 'faculty_action';
  }

  // Generic actions based on HTTP method
  switch (method) {
    case 'GET': return 'view';
    case 'POST': return 'create';
    case 'PUT': return 'update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

/**
 * Create human-readable action description
 */
function createActionDescription(req, actionType) {
  const { method, originalUrl } = req;
  const userEmail = req.session?.user?.email || req.user?.email || 'Anonymous user';
  const userRole = req.session?.user?.Status || req.user?.Status || 'guest';
  
  const baseDescription = `${userEmail} (${userRole}) performed ${actionType}`;
  
  // Add specific context based on action type
  switch (actionType) {
    // Student activities
    case 'student_login':
      return `Student ${userEmail} logged into the system`;
    case 'student_signup':
      return `New student registered: ${req.body?.email || 'unknown'}`;
    case 'student_logout':
      return `Student ${userEmail} logged out of the system`;
    case 'submit_thesis':
      return `Student ${userEmail} submitted a thesis`;
    case 'request_thesis':
      return `Student ${userEmail} requested access to thesis`;
    
    // Guest activities
    case 'guest_google_signin':
      return `Guest user signed in with Google OAuth`;
    case 'guest_search':
      return `Guest user searched for thesis with query: ${req.query?.q || req.query?.search || 'unknown'}`;
    case 'guest_view_thesis':
      return `Guest user viewed thesis details`;
    case 'guest_request_thesis':
      return `Guest user requested access to thesis`;
    case 'guest_logout':
      return `Guest user logged out`;
    
    // Faculty activities - FIC
    case 'fic_login':
      return `FIC ${userEmail} logged into the system`;
    case 'fic_logout':
      return `FIC ${userEmail} logged out of the system`;
    case 'fic_approve_request':
      return `FIC ${userEmail} approved a thesis request`;
    case 'fic_reject_request':
      return `FIC ${userEmail} rejected a thesis request`;
    case 'fic_add_groups':
      return `FIC ${userEmail} added new groups`;
    
    // Faculty activities - Panelist
    case 'panelist_login':
      return `Panelist ${userEmail} logged into the system`;
    case 'panelist_logout':
      return `Panelist ${userEmail} logged out of the system`;
    case 'panelist_approve_request':
      return `Panelist ${userEmail} approved a thesis request`;
    case 'panelist_reject_request':
      return `Panelist ${userEmail} rejected a thesis request`;
    case 'panelist_comment':
      return `Panelist ${userEmail} added a comment`;
    
    // Admin activities
    case 'admin_login':
      return `Admin ${userEmail} logged into the system`;
    case 'admin_logout':
      return `Admin ${userEmail} logged out of the system`;
    case 'admin_create_faculty':
      return `Admin ${userEmail} created a new faculty account`;
    case 'admin_approve_capstone':
      return `Admin ${userEmail} approved a capstone project`;
    case 'admin_reject_capstone':
      return `Admin ${userEmail} rejected a capstone project`;
    case 'admin_approve_request':
      return `Admin ${userEmail} approved a request`;
    case 'admin_reject_request':
      return `Admin ${userEmail} rejected a request`;
    
    // General activities
    case 'search_thesis':
      return `${userEmail} searched for thesis with query: ${req.query?.q || req.query?.search || 'unknown'}`;
    case 'view_thesis':
      return `${userEmail} viewed thesis details`;
    case 'download_thesis':
      return `${userEmail} downloaded thesis document`;
    case 'upload_thesis':
      return `${userEmail} uploaded a new thesis`;
    
    default:
      return `${baseDescription} on ${originalUrl}`;
  }
}

/**
 * Extract resource type and ID from request
 */
function extractResourceInfo(req) {
  const url = req.originalUrl.toLowerCase();
  
  // Extract thesis ID
  const thesisMatch = url.match(/\/(?:thesis|records)\/(\d+)/);
  if (thesisMatch) {
    return { resourceType: 'thesis', resourceId: thesisMatch[1] };
  }
  
  // Extract user ID
  const userMatch = url.match(/\/(?:user|profile)\/(\d+)/);
  if (userMatch) {
    return { resourceType: 'user', resourceId: userMatch[1] };
  }
  
  // Check for search queries
  if (req.query?.q || req.query?.search) {
    return { resourceType: 'search', resourceId: req.query.q || req.query.search };
  }
  
  return { resourceType: null, resourceId: null };
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...body };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Middleware specifically for manual activity logging
 * Use this for specific actions that need custom logging
 */
const logSpecificActivity = (actionType, actionDescription, resourceType = null, resourceId = null) => {
  return async (req, res, next) => {
    try {
    const userId = req.session?.user?.id || req.session?.user?.user_id || req.user?.id || null;
    const sessionId = req.sessionID || req.session?.id || 'anonymous';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

      await ActivityLogger.logActivity({
        userId,
        sessionId,
        actionType,
        actionDescription: actionDescription || `User performed ${actionType}`,
        resourceType,
        resourceId,
        ipAddress,
        userAgent: req.get('User-Agent') || 'unknown',
        requestMethod: req.method,
        requestUrl: req.originalUrl || req.url,
        requestBody: sanitizeRequestBody(req.body),
        responseStatus: null, // Will be updated later
        additionalData: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in specific activity logging:', error);
    }
    next();
  };
};

export {
  activityLoggingMiddleware,
  logSpecificActivity
};
