/**
 * Centralized cookie configuration for authentication cookies
 * Ensures consistent security settings across all authentication endpoints.
 * Auth cookie payload is signed (HMAC-SHA256) so it cannot be forged.
 */

import crypto from 'crypto';

const SIGNATURE_ALGORITHM = 'sha256';
const SIGNATURE_SEPARATOR = '.';

/**
 * Get the secret used for signing auth cookie (must match SESSION_SECRET in production).
 * @returns {string}
 */
export const getCookieSigningSecret = () => {
  const secret = process.env.COOKIE_SIGNING_SECRET || process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('COOKIE_SIGNING_SECRET or SESSION_SECRET must be set in production');
  }
  return secret || 'fallback-signing-secret';
};

/**
 * Sign a payload (JSON string) with HMAC-SHA256.
 * @param {string} payload - Raw string to sign (e.g. JSON.stringify(user))
 * @returns {string} payload + '.' + hex signature
 */
export const signAuthPayload = (payload) => {
  const secret = getCookieSigningSecret();
  const signature = crypto.createHmac(SIGNATURE_ALGORITHM, secret).update(payload).digest('hex');
  return payload + SIGNATURE_SEPARATOR + signature;
};

/**
 * Verify and parse a signed auth cookie value.
 * @param {string} signedValue - Value from cookie (payload + '.' + signature)
 * @returns {{ valid: boolean, payload?: object, error?: string }}
 */
export const verifyAuthPayload = (signedValue) => {
  if (!signedValue || typeof signedValue !== 'string') {
    return { valid: false, error: 'Missing or invalid cookie value' };
  }
  const lastSep = signedValue.lastIndexOf(SIGNATURE_SEPARATOR);
  if (lastSep === -1) {
    return { valid: false, error: 'No signature in cookie' };
  }
  const payloadStr = signedValue.slice(0, lastSep);
  const receivedSig = signedValue.slice(lastSep + 1);
  const secret = getCookieSigningSecret();
  const expectedSig = crypto.createHmac(SIGNATURE_ALGORITHM, secret).update(payloadStr).digest('hex');
  if (crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expectedSig, 'hex')) === false) {
    return { valid: false, error: 'Invalid signature' };
  }
  try {
    const payload = JSON.parse(payloadStr);
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON in payload' };
  }
};

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
 * - secure: true in production/HTTPS - Only sent over HTTPS (required when sameSite is 'none')
 * - sameSite: 'none' in production - Required so the cookie is sent on cross-origin requests
 *   (thesisko.online -> server.thesisko.online). Browsers do not send SameSite=Lax cookies
 *   on cross-origin subresource requests (XHR/fetch). SameSite=Lax is used in development.
 * - path: '/' - Cookie available for entire domain
 * - maxAge: 24 hours - Session expiration
 * 
 * @param {Object} options - Optional overrides
 * @returns {Object} Cookie configuration object
 */
export const getAuthCookieConfig = (options = {}) => {
  const isSecure = shouldUseSecureCookies();
  const domain = getCookieDomain();
  // Production (cross-origin: thesisko.online vs server.thesisko.online) requires SameSite=None
  // so the browser sends the cookie on fetch/XHR. SameSite=Lax would not be sent on cross-origin requests.
  const sameSite = domain ? 'none' : 'lax'; // 'none' for production (has domain), 'lax' for localhost
  if (sameSite === 'none' && !isSecure) {
    throw new Error('SameSite=None requires Secure=true');
  }
  const config = {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isSecure, // Only send over HTTPS in production/HTTPS environments
    sameSite, // 'none' for cross-origin in prod, 'lax' for localhost
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

/**
 * Cookie name constant to prevent typos and ensure consistency
 */
export const AUTH_COOKIE_NAME = 'auth_user';

