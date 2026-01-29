import crypto from 'crypto';

/**
 * Centralized cookie configuration for authentication cookies
 * Ensures consistent security settings across all authentication endpoints
 */

const AUTH_COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET || process.env.SESSION_SECRET || '';

/**
 * Sign auth payload for cookie (HMAC-SHA256).
 * Use when setting the auth cookie so it cannot be forged.
 * @param {Object} payload - User object to store in cookie
 * @returns {string} JSON string of { payload, signature } to set as cookie value
 */
export function signAuthPayload(payload) {
  if (!AUTH_COOKIE_SECRET) {
    console.warn('⚠️ AUTH_COOKIE_SECRET (or SESSION_SECRET) not set; cookie will be unsigned');
  }
  const str = JSON.stringify(payload);
  const signature = AUTH_COOKIE_SECRET
    ? crypto.createHmac('sha256', AUTH_COOKIE_SECRET).update(str).digest('hex')
    : '';
  return JSON.stringify({ payload, signature });
}

/**
 * Verify and parse auth cookie value. Returns payload only if signature is valid.
 * @param {string} cookieValue - Raw cookie string
 * @returns {Object|null} Parsed user payload or null if invalid/missing signature
 */
export function verifyAuthPayload(cookieValue) {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(cookieValue);
    if (!parsed.payload) return null;
    if (!AUTH_COOKIE_SECRET) {
      return parsed.signature === '' ? parsed.payload : null;
    }
    if (!parsed.signature) return null;
    const str = JSON.stringify(parsed.payload);
    const expected = crypto.createHmac('sha256', AUTH_COOKIE_SECRET).update(str).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(parsed.signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return parsed.payload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the cookie domain for cross-subdomain cookie sharing
 * Extracts the base domain from FRONTEND_URL (e.g., .thesisko.online)
 * For localhost development, returns undefined (no domain restriction)
 * 
 * @returns {string|undefined} Cookie domain (e.g., '.thesisko.online') or undefined for localhost
 */
export const getCookieDomain = () => {
  // Check if we're in development (localhost)
  const isLocalhost = process.env.NODE_ENV === 'development' || 
                      !process.env.FRONTEND_URL || 
                      process.env.FRONTEND_URL.includes('localhost');
  
  // For localhost development, don't set domain (allows cookie to work on localhost)
  if (isLocalhost) {
    return undefined; // undefined means cookie works for current domain (localhost)
  }
  
  // For production, extract domain from FRONTEND_URL
  const frontendUrl = process.env.FRONTEND_URL || 'https://thesisko.online';
  const urlObj = new URL(frontendUrl);
  const cookieDomain = urlObj.hostname.startsWith('www.') 
    ? urlObj.hostname.substring(4) 
    : urlObj.hostname;
  
  // Use leading dot for subdomain sharing (e.g., .thesisko.online)
  // This allows cookies to be shared between thesisko.online and server.thesisko.online
  const domain = cookieDomain.includes('.') 
    ? `.${cookieDomain.split('.').slice(-2).join('.')}` 
    : cookieDomain;
  
  return domain;
};

/**
 * Determine if cookies should be secure (HTTPS only)
 * Checks multiple indicators to ensure Secure flag is set in production
 */
const shouldUseSecureCookies = () => {
  // Method 1: Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // Method 2: Check if FRONTEND_URL uses HTTPS
  const frontendUrl = process.env.FRONTEND_URL || '';
  if (frontendUrl.startsWith('https://')) {
    return true;
  }
  
  // Method 3: Check FORCE_SECURE_COOKIES environment variable (explicit override)
  if (process.env.FORCE_SECURE_COOKIES === 'true') {
    return true;
  }
  
  // Method 4: Check if domain is production domain (not localhost)
  const domain = getCookieDomain();
  if (domain && !domain.includes('localhost') && domain !== 'localhost') {
    // If domain is set to production domain, assume HTTPS
    return true;
  }
  
  // Default: false for local development
  return false;
};

/**
 * Standard cookie configuration for authentication cookies
 * 
 * Security settings:
 * - httpOnly: true - Prevents JavaScript access (XSS protection)
 * - secure: true in production/HTTPS - Only sent over HTTPS
 * - sameSite: 'lax' - Allows cross-subdomain requests while preventing most CSRF
 *   Note: Using 'lax' instead of 'strict' to support subdomain sharing
 *   (thesisko.online <-> server.thesisko.online). Modern browsers treat
 *   subdomains as same-site, but 'lax' ensures compatibility.
 * - path: '/' - Cookie available for entire domain
 * - maxAge: 24 hours - Session expiration
 * 
 * @param {Object} options - Optional overrides
 * @returns {Object} Cookie configuration object
 */
export const getAuthCookieConfig = (options = {}) => {
  const isSecure = shouldUseSecureCookies();
  const domain = getCookieDomain();
  
  const config = {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isSecure, // Only send over HTTPS in production/HTTPS environments
    sameSite: 'lax', // Allow cross-subdomain (thesisko.online <-> server.thesisko.online)
                     // Prevents most CSRF while maintaining subdomain compatibility
    path: '/', // Available for entire domain
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    ...options // Allow overrides for specific cases
  };
  
  // Only set domain if it's defined (undefined means current domain - works for localhost)
  if (domain !== undefined) {
    config.domain = domain;
  }
  
  return config;
};

/** Cookie name constant */
export const AUTH_COOKIE_NAME = 'auth_user';

