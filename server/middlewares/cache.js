/**
 * In-memory response cache for GET endpoints.
 * Cache key: req.originalUrl (includes query string so ?period=this_month and ?period=this_year are separate).
 * TTL in seconds. Only use for endpoints where stale data for TTL is acceptable.
 */

import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * @param {number} ttlSeconds - Cache TTL in seconds (default 300 = 5 min)
 * @returns {function} Express middleware
 */
export function cacheMiddleware(ttlSeconds = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl || req.url;
    const cached = cache.get(key);
    if (cached !== undefined) {
      return res.status(200).json(cached);
    }
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      cache.set(key, data, ttlSeconds);
      return originalJson(data);
    };
    next();
  };
}

export default cacheMiddleware;
