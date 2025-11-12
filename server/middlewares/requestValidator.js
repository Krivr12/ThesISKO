import validator from "validator";
const { isEmail } = validator;

/**
 * Middleware to validate request payloads for both student and guest users.
 * Updated to accept flattened structure (no requester object).
 */
export function validateRequest(req, res, next) {
  try {
    // Extract flattened structure fields
    const { document_id, user_type, email, chaptersRequested, purpose } = req.body;

    // Validate required MongoDB fields
    if (!document_id || !user_type || !purpose) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Validate email (now at top level, not in requester object)
    if (!email || !isEmail(email)) {
      return res.status(400).json({ error: "Invalid or missing email." });
    }

    // Validate user_type (snake_case, not camelCase)
    if (!["student", "guest"].includes(user_type)) {
      return res.status(400).json({ error: "Invalid user_type. Must be 'student' or 'guest'." });
    }

    // Optional: chaptersRequested validation
    if (chaptersRequested && !Array.isArray(chaptersRequested)) {
      return res.status(400).json({ error: "chaptersRequested must be an array." });
    }

    next(); // ✅ Pass validation
  } catch (err) {
    console.error("❌ Validation error:", err.message);
    return res.status(500).json({ error: "Validation failed." });
  }
}
