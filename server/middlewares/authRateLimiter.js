/**
 * In-memory rate limiter for auth endpoints (login, admin-login, resend-verification).
 * Limits: 10 requests per 15 minutes per IP to mitigate brute force and enumeration.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;
const store = new Map(); // key: ip, value: { count, resetAt }

function getKey(req) {
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

export default function authRateLimiter(req, res, next) {
  const key = getKey(req);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  } else {
    if (now >= entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + WINDOW_MS;
    } else {
      entry.count++;
    }
  }

  res.set('X-RateLimit-Limit', MAX_REQUESTS);
  res.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - entry.count));

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many attempts',
      message: `Rate limit exceeded. Try again after ${Math.ceil((entry.resetAt - now) / 60000)} minutes.`,
    });
  }

  next();
}
