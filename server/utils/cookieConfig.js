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
 * Standard cookie configuration for authentication cookies
 * 
 * Security settings:
 * - httpOnly: true - Prevents JavaScript access (XSS protection)
 * - secure: true in production - Only sent over HTTPS
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
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isProduction, // Only send over HTTPS in production
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

