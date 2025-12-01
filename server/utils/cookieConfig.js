/**
 * Centralized cookie configuration for authentication cookies
 * Ensures consistent security settings across all authentication endpoints
 */

/**
 * Get the cookie domain for cross-subdomain cookie sharing
 * Extracts the base domain from FRONTEND_URL (e.g., .thesisko.online)
 * 
 * @returns {string} Cookie domain (e.g., '.thesisko.online')
 */
export const getCookieDomain = () => {
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
  
  return {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isSecure, // Only send over HTTPS in production/HTTPS environments
    sameSite: 'lax', // Allow cross-subdomain (thesisko.online <-> server.thesisko.online)
                     // Prevents most CSRF while maintaining subdomain compatibility
    domain: getCookieDomain(), // Enable cross-subdomain cookie sharing
    path: '/', // Available for entire domain
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    ...options // Allow overrides for specific cases
  };
};

/**
 * Cookie name constant to prevent typos and ensure consistency
 */
export const AUTH_COOKIE_NAME = 'auth_user';

