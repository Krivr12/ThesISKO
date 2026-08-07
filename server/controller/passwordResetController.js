/**
 * Password Reset Controller
 *
 * POST /auth/forgot-password  → requestPasswordReset
 * GET  /auth/reset-password   → validateResetTokenEndpoint  (frontend polls before showing form)
 * POST /auth/reset-password   → executePasswordReset
 */

import bcrypt from 'bcrypt';
import { sendEmail } from '../services/emailService.js';
import {
  generateResetToken,
  validateResetToken,
  consumeResetToken,
  getUserByEmail,
} from '../services/passwordResetService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://thesisko.online';

// ─────────────────────────────────────────────────────────
// POST /auth/forgot-password
// ─────────────────────────────────────────────────────────
export async function requestPasswordReset(req, res) {
  try {
    const rawEmail = req.body.email ?? '';
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Always return the same generic message to prevent email enumeration
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    };

    const user = await getUserByEmail(email);
    if (!user) {
      // Deliberate: return 200 with generic message even when email not found
      return res.status(200).json(genericResponse);
    }

    const requestIp = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const plainToken = await generateResetToken(user.user_id, email, requestIp, userAgent);

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${plainToken}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: 'Reset Your Password – ThesISKO',
      template: 'password-reset',
      data: {
        firstname: user.firstname || 'User',
        resetUrl,
        expiryMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '20', 10)
      }
    });

    console.log(`✅ Password reset email sent to: ${email}`);
    return res.status(200).json(genericResponse);

  } catch (error) {
    console.error('❌ requestPasswordReset error:', error.message);
    return res.status(500).json({
      error: 'Failed to process password reset request. Please try again later.'
    });
  }
}

// ─────────────────────────────────────────────────────────
// GET /auth/reset-password?token=xxx&email=xxx
// Frontend calls this to validate token before showing the form.
// ─────────────────────────────────────────────────────────
export async function validateResetTokenEndpoint(req, res) {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({ valid: false, error: 'Token and email are required' });
    }

    const tokenRow = await validateResetToken(decodeURIComponent(email), token);
    if (!tokenRow) {
      return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired.' });
    }

    return res.status(200).json({ valid: true });

  } catch (error) {
    console.error('❌ validateResetTokenEndpoint error:', error.message);
    return res.status(500).json({ valid: false, error: 'Server error during token validation.' });
  }
}

// ─────────────────────────────────────────────────────────
// POST /auth/reset-password
// ─────────────────────────────────────────────────────────
export async function executePasswordReset(req, res) {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!token || !email || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const tokenRow = await validateResetToken(email.toLowerCase(), token);
    if (!tokenRow) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    const requestIp = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    await consumeResetToken(tokenRow.reset_id, tokenRow.user_id, newPasswordHash, requestIp, userAgent);

    console.log(`✅ Password reset completed for user_id: ${tokenRow.user_id}`);

    // Send confirmation email (fire-and-forget – don't block the response)
    getUserByEmail(email.toLowerCase()).then(user => {
      if (user) {
        sendEmail({
          to: email.toLowerCase(),
          subject: 'Your Password Has Been Changed – ThesISKO',
          template: 'password-changed',
          data: {
            firstname: user.firstname || 'User',
            loginUrl: `${FRONTEND_URL}/login`
          }
        }).catch(err => console.warn('⚠️ Could not send password-changed confirmation:', err.message));
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.'
    });

  } catch (error) {
    console.error('❌ executePasswordReset error:', error.message);
    return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
}
