/**
 * Authentication Middleware
 * 
 * Validates authentication cookies and attaches user to request object.
 * Reuses logic from getCurrentUser for consistency.
 * 
 * Usage:
 *   import { requireAuth } from '../middlewares/authMiddleware.js';
 *   router.get('/protected', requireAuth, handler);
 */

/**
 * Main authentication middleware
 * Validates auth cookie and attaches user to req.user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requireAuth = async (req, res, next) => {
  try {
    // Import cookie configuration
    const { AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
    
    // Debug: Log all cookies (only in dev)
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
      console.log(`[authMiddleware] 🔍 Checking cookies for ${req.method} ${req.originalUrl}`);
      console.log(`[authMiddleware] 🔍 Cookie name: ${AUTH_COOKIE_NAME}`);
      console.log(`[authMiddleware] 🔍 All cookies:`, Object.keys(req.cookies || {}));
      console.log(`[authMiddleware] 🔍 Auth cookie exists:`, !!req.cookies[AUTH_COOKIE_NAME]);
    }
    
    // Get auth cookie from request
    const authCookie = req.cookies[AUTH_COOKIE_NAME];
    
    // Check if cookie exists
    if (!authCookie) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log(`[authMiddleware] ❌ No authentication cookie found for ${req.method} ${req.originalUrl}`);
      }
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Authentication required',
        message: 'No authentication cookie found'
      });
    }
    
    // Parse cookie JSON safely
    let user;
    try {
      user = JSON.parse(authCookie);
    } catch (parseError) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.error(`[authMiddleware] ❌ Invalid JSON in auth cookie for ${req.method} ${req.originalUrl}:`, parseError.message);
      }
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Invalid authentication token',
        message: 'Authentication cookie is malformed'
      });
    }
    
    // Validate required user fields
    if (!user || typeof user !== 'object') {
      if (process.env.DEBUG_AUTH === 'true') {
        console.error(`[authMiddleware] ❌ Invalid user object structure for ${req.method} ${req.originalUrl}`);
      }
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Invalid user data',
        message: 'User data is missing or invalid'
      });
    }
    
    // Check for required fields (id or user_id, and email)
    const userId = user.id || user.user_id;
    if (!userId) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.error(`[authMiddleware] ❌ Missing user ID in cookie for ${req.method} ${req.originalUrl}`);
      }
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Invalid user data',
        message: 'User ID is missing'
      });
    }
    
    if (!user.email && !user.Email) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.error(`[authMiddleware] ❌ Missing email in cookie for ${req.method} ${req.originalUrl}`);
      }
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Invalid user data',
        message: 'User email is missing'
      });
    }
    
    // Attach user to request object for use in route handlers
    req.user = user;
    
    // Log successful authentication (only in dev or with debug flag)
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
      console.log(`[authMiddleware] ✅ Authenticated user: ${user.email || user.Email} (ID: ${userId}) for ${req.method} ${req.originalUrl}`);
      console.log(`[authMiddleware] 🔍 Full user object:`, JSON.stringify(user, null, 2));
    }
    
    // Continue to next middleware/route handler
    next();
    
  } catch (error) {
    // Handle unexpected errors
    if (process.env.DEBUG_AUTH === 'true') {
      console.error(`[authMiddleware] ❌ Unexpected error during authentication for ${req.method} ${req.originalUrl}:`, error);
    }
    return res.status(500).json({ 
      authenticated: false, 
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to req.user if cookie exists, but doesn't fail if missing
 * Useful for routes that work for both authenticated and unauthenticated users
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const { AUTH_COOKIE_NAME } = await import('../utils/cookieConfig.js');
    const authCookie = req.cookies[AUTH_COOKIE_NAME];
    
    if (authCookie) {
      try {
        const user = JSON.parse(authCookie);
        if (user && (user.id || user.user_id) && (user.email || user.Email)) {
          req.user = user;
          if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
            console.log(`[authMiddleware] ✅ Optional auth: User attached for ${req.method} ${req.originalUrl}`);
          }
        }
      } catch (parseError) {
        // Silently ignore parse errors for optional auth
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
          console.log(`[authMiddleware] ⚠️ Optional auth: Invalid cookie, continuing without user`);
        }
      }
    }
    
    next();
  } catch (error) {
    // Don't block request on optional auth errors
    if (process.env.DEBUG_AUTH === 'true') {
      console.error(`[authMiddleware] ⚠️ Optional auth error:`, error);
    }
    next();
  }
};

