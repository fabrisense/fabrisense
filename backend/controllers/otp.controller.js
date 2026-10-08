/**
 * backend/controllers/otp.controller.js
 * Request/response handling for all OTP-related endpoints.
 * Controllers validate HTTP inputs, delegate to services, and format responses.
 * They contain no business logic themselves.
 */

import {
  generateOtp,
  verifyOtp,
  consumeResetToken,
  purposeTitle,
  testPayload,
} from '../services/otp.service.js';

import { sendOtpEmail } from '../services/email.service.js';
import { smtpConfigured } from '../config/env.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateEmail(email) {
  return email && typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

/**
 * Core: generate an OTP, send the email, and respond.
 * Shared by both registration and forgot-password send/resend endpoints.
 */
async function handleSendOtp(req, res, purpose) {
  const { email } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const generated  = generateOtp(cleanEmail, purpose);

  if (!generated.ok) {
    return res.status(429).json({
      success: false,
      error:   generated.error,
      cooldownRemaining: generated.cooldownRemaining,
    });
  }

  // Attempt email delivery
  const title  = purposeTitle(purpose);
  const result = await sendOtpEmail({ to: cleanEmail, otp: generated.otp, purposeTitle: title });

  if (result.sent) {
    console.log(`[FabriSense] OTP emailed to ${cleanEmail} for ${purpose}`);
    return res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
      cooldown: 60,
      ...testPayload(generated.otp),
    });
  }

  // SMTP not configured — log OTP to terminal for local dev
  if (result.error === 'SMTP_NOT_CONFIGURED') {
    console.warn(`\n⚠️  [FabriSense] SMTP not configured in .env — email NOT sent.`);
    console.warn(`👉  [Server Log] 6-digit OTP for ${cleanEmail} (${title}): ${generated.otp}\n`);
    return res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. (Check server terminal if testing locally without SMTP)`,
      cooldown: 60,
      ...testPayload(generated.otp),
    });
  }

  // Real SMTP error — do not silently swallow it
  console.error(`[FabriSense] SMTP error for ${cleanEmail}:`, result.error);
  return res.status(500).json({
    success: false,
    error:   `Failed to send email: ${result.error}. Check your SMTP configuration in .env.`,
  });
}

/**
 * Core: verify a submitted OTP and respond.
 */
function handleVerifyOtp(req, res, purpose) {
  const { email, otp } = req.body;

  if (!validateEmail(email) || !otp) {
    return res.status(400).json({ success: false, error: 'Email and 6-digit OTP are required.' });
  }

  const result = verifyOtp(email, otp, purpose);

  if (!result.ok) {
    return res.status(result.status || 400).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    message: 'OTP verified successfully.',
    verifiedToken: result.verifiedToken,
  });
}

// ─── Registration endpoints ───────────────────────────────────────────────────

export async function sendRegistrationOtp(req, res) {
  return handleSendOtp(req, res, 'registration');
}

export async function resendRegistrationOtp(req, res) {
  // resend invalidates old OTP automatically via generateOtp()
  return handleSendOtp(req, res, 'registration');
}

export function verifyRegistrationOtp(req, res) {
  return handleVerifyOtp(req, res, 'registration');
}

// ─── Forgot-password endpoints ────────────────────────────────────────────────

export async function sendForgotPasswordOtp(req, res) {
  return handleSendOtp(req, res, 'forgot_password');
}

export async function resendForgotPasswordOtp(req, res) {
  return handleSendOtp(req, res, 'forgot_password');
}

export function verifyForgotPasswordOtp(req, res) {
  return handleVerifyOtp(req, res, 'forgot_password');
}

// ─── Password reset endpoint ──────────────────────────────────────────────────

export function resetPassword(req, res) {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Email, token, and new password are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
  }

  const result = consumeResetToken(token, email);

  if (!result.ok) {
    return res.status(result.status || 401).json({ success: false, error: result.error });
  }

  // NOTE: Without a user database, we can only confirm the reset was authorised.
  // The frontend updates its local user store with the new password.
  console.log(`[FabriSense] Password reset authorised for ${result.email}`);
  return res.json({
    success: true,
    message: 'Password has been successfully updated.',
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────

export function healthCheck(_req, res) {
  return res.json({
    status:         'ok',
    service:        'FabriSense OTP Email Service',
    smtpConfigured: smtpConfigured(),
  });
}
