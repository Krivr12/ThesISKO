import db from "../databaseConnections/MongoDB/mongodb_connection.js";

/**
 * MongoDB-based error logger middleware.
 * Stores errors in a 'error_logs' collection (temporary),
 * to be uploaded to S3 by a scheduled GitHub Action.
 */

const logsCollection = db.collection("error_logs");

export async function logError(err, context = {}) {
  try {
    const logDoc = {
      message: err.message || "Unknown error",
      stack: err.stack || null,
      route: context.route || null,
      method: context.method || null,
      timestamp: new Date(),
      meta: context.meta || {},
    };

    await logsCollection.insertOne(logDoc);
    console.log("🪵 Logged error to MongoDB.");
  } catch (e) {
    console.error("❌ Failed to log error:", e.message);
  }
}

/**
 * Express middleware to capture thrown route errors.
 */
export function errorLoggerMiddleware(err, req, res, next) {
  logError(err, { route: req.originalUrl, method: req.method });
  res.status(500).json({ error: "Internal server error" });
}
