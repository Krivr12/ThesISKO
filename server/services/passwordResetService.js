/**
 * Password Reset Service
 * 
 * Handles token lifecycle:
 *   generate  → stores hashed token in password_reset_tokens
 *   validate  → checks token validity (not expired, not used)
 *   consume   → marks token as used and updates password_hash
 * 
 * Security:
 *   - Plain token travels only in the email link
 *   - DB stores bcrypt hash of the token (not plain text)
 *   - Any existing unused tokens for the same user are invalidated on new request
 *   - Token expires in TOKEN_EXPIRY_MINUTES (default: 20)
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../data/database.js';

const TOKEN_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '20', 10);
// Lower bcrypt rounds for token hashing (speed matters here; security comes from token length)
const TOKEN_HASH_ROUNDS = 8;

/**
 * Generate a secure reset token, store its hash, and return the plain token.
 * Any previously unused tokens for this user are voided first.
 *
 * @param {number} userId
 * @param {string} email
 * @param {string} requestIp
 * @param {string} userAgent
 * @returns {Promise<string>} plainToken – sent in the email link
 */
export async function generateResetToken(userId, email, requestIp = null, userAgent = null) {
  const plainToken = crypto.randomBytes(32).toString('hex'); // 64-char hex
  const tokenHash = await bcrypt.hash(plainToken, TOKEN_HASH_ROUNDS);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing unused tokens for this user (one active token at a time)
  await pool.query(
    `UPDATE password_reset_tokens
       SET is_used = TRUE, used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND is_used = FALSE`,
    [userId]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens
       (user_id, email, reset_token_hash, expires_at, request_ip, request_user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, email.toLowerCase(), tokenHash, expiresAt, requestIp, userAgent]
  );

  return plainToken;
}

/**
 * Validate a plain token against stored hashes for a given email.
 * Returns the matching token row if valid, null otherwise.
 *
 * @param {string} email
 * @param {string} plainToken
 * @returns {Promise<object|null>} tokenRow or null
 */
export async function validateResetToken(email, plainToken) {
  // Fetch all unused, non-expired tokens for this email (usually just 1)
  const result = await pool.query(
    `SELECT reset_id, user_id, reset_token_hash, expires_at
       FROM password_reset_tokens
      WHERE email = $1
        AND is_used = FALSE
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC`,
    [email.toLowerCase()]
  );

  for (const row of result.rows) {
    const match = await bcrypt.compare(plainToken, row.reset_token_hash);
    if (match) return row;
  }

  return null;
}

/**
 * Consume a token: update the password hash and mark the token as used.
 * Also logs the change to password_change_audit and updates users_info.
 *
 * @param {string} resetId         - UUID of the token row
 * @param {number} userId
 * @param {string} newPasswordHash - Already-hashed new password (bcrypt, 12 rounds)
 * @param {string} usedByIp
 * @param {string} userAgent
 */
export async function consumeResetToken(resetId, userId, newPasswordHash, usedByIp = null, userAgent = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Mark token as used
    await client.query(
      `UPDATE password_reset_tokens
          SET is_used = TRUE, used_at = CURRENT_TIMESTAMP, used_by_ip = $1
        WHERE reset_id = $2`,
      [usedByIp, resetId]
    );

    // 2. Update password and timestamp in users_info
    await client.query(
      `UPDATE users_info
          SET password_hash = $1, last_password_change = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    // 3. Append to audit log
    await client.query(
      `INSERT INTO password_change_audit
         (user_id, change_type, changed_by, ip_address, user_agent, success)
       VALUES ($1, 'password_reset', 'user_self', $2, $3, TRUE)`,
      [userId, usedByIp, userAgent]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Look up a user by email. Returns { user_id, email, firstname, lastname } or null.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function getUserByEmail(email) {
  const result = await pool.query(
    `SELECT user_id, email, firstname, lastname
       FROM users_info
      WHERE LOWER(email) = $1
      LIMIT 1`,
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
}

/**
 * Cleanup helper – delete expired/used tokens older than 7 days.
 * Safe to call periodically.
 */
export async function cleanupExpiredTokens() {
  await pool.query(
    `DELETE FROM password_reset_tokens
      WHERE (expires_at < CURRENT_TIMESTAMP OR is_used = TRUE)
        AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'`
  );
}
