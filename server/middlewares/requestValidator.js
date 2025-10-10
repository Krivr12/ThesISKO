import validator from "validator";
const { isEmail } = validator;

/**
 * Middleware to validate request payloads for both student and guest users.
 */
export function validateRequest(req, res, next) {
  try {
    const { docId, userType, requester, chaptersRequested, purpose } = req.body;

    if (!docId || !userType || !requester || !purpose) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (!requester.email || !isEmail(requester.email)) {
      return res.status(400).json({ error: "Invalid or missing email." });
    }

    // Validate userType
    if (!["student", "guest"].includes(userType)) {
      return res.status(400).json({ error: "Invalid userType. Must be 'student' or 'guest'." });
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
