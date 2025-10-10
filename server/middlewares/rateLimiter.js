// server/middlewares/rateLimiter.js
import db from "../databaseConnections/MongoDB/mongodb_connection.js";

const LIMIT = Number(process.env.RATE_LIMIT_PER_DAY) || 10;
const COLLECTION = db.collection("rate_limits");

// Auto-cleanup: remove docs older than 2 days
async function cleanupOldRecords() {
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days old
  try {
    const result = await COLLECTION.deleteMany({ createdAt: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      console.log(`[rateLimiter] 🧹 Cleaned ${result.deletedCount} old records`);
    }
  } catch (err) {
    console.error("[rateLimiter] Cleanup error:", err.message);
  }
}

/**
 * Mongo-backed rate limiter.
 * Key: requester.email (lowercased) or req.ip fallback.
 * Window: UTC day (yyyy-mm-dd).
 */
export default async function rateLimiter(req, res, next) {
  try {
    const email = req.body?.requester?.email;
    const key = email ? `email:${String(email).toLowerCase()}` : `ip:${req.ip || req.connection?.remoteAddress}`;

    // Window key using UTC date string (simple daily window)
    const windowKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Atomic upsert: increment count, set createdAt on insert, set lastUpdated
    const result = await COLLECTION.findOneAndUpdate(
      { key, windowKey },
      {
        $inc: { count: 1 },
        $setOnInsert: { createdAt: new Date() },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, returnDocument: "after" }
    );

    // Ensure we re-fetch if result.value is null (newly inserted doc)
    let currentCount;
    if (!result.value) {
      const insertedDoc = await COLLECTION.findOne({ key, windowKey });
      currentCount = insertedDoc?.count || 1;
    } else {
      currentCount = result.value.count;
    }

    // Attach rate-limit info for debugging/logging
    req.rateLimit = { key, windowKey, count: currentCount, limit: LIMIT };

    // Set standard rate-limit headers
    res.set({
      "X-RateLimit-Limit": LIMIT,
      "X-RateLimit-Remaining": Math.max(0, LIMIT - currentCount),
      "X-RateLimit-Reset": new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString() // Next midnight UTC
    });

    console.log(`[rateLimiter] ${key} -> count: ${currentCount}/${LIMIT}`);

    if (currentCount > LIMIT) {
      return res.status(429).json({
        ok: false,
        message: `Rate limit exceeded. Allowed ${LIMIT} requests per 24 hours.`,
      });
    }

    // Occasional cleanup (only once every 50 requests to reduce overhead)
    if (Math.random() < 0.02) cleanupOldRecords();

    next();
  } catch (err) {
    // If limiter fails, do not block the request — allow but log
    console.error("Rate limiter error:", err);
    next();
  }
}
