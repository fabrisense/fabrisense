/**
 * backend/controllers/otp.controller.js
 * Request/response handling for all OTP-related endpoints.
 * Validates HTTP inputs, delegates to services, and formats responses securely.
 * Plaintext OTPs are NEVER logged and NEVER returned in API responses.
 */

import {
  generateOtp,
  verifyOtp,
  consumeResetToken,
  purposeTitle,
} from '../services/otp.service.js';

import {
  sendOtpEmail,
  getEmailServiceStatus,
} from '../services/email.service.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateEmail(email) {
  return email && typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

/**
 * Core: generate an OTP, dispatch through email service, and respond.
 * Shared by both registration and forgot-password send/resend endpoints.
 */
async function handleSendOtp(req, res, purpose) {
  const { email } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'A valid email address is required.',
      code: 'INVALID_EMAIL',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const generated  = generateOtp(cleanEmail, purpose);

  if (!generated.ok) {
    return res.status(429).json({
      success: false,
      error: generated.error,
      cooldownRemaining: generated.cooldownRemaining,
      code: 'RATE_LIMITED',
    });
  }

  // Attempt real email delivery through configured provider (Resend / SMTP)
  const title  = purposeTitle(purpose);
  const result = await sendOtpEmail({ to: cleanEmail, otp: generated.otp, purposeTitle: title });

  if (result.sent) {
    return res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
      cooldown: 60,
      provider: result.provider,
    });
  }

  // Email service not configured
  if (result.error === 'EMAIL_SERVICE_NOT_CONFIGURED') {
    return res.status(503).json({
      success: false,
      error: 'Email delivery service is not configured on the server. Please set RESEND_API_KEY or SMTP credentials in backend/.env.',
      code: 'EMAIL_NOT_CONFIGURED',
    });
  }

  // Provider rejected delivery or threw an error
  return res.status(502).json({
    success: false,
    error: `Failed to deliver verification email: ${result.error}`,
    code: result.code || 'EMAIL_DELIVERY_FAILED',
    provider: result.provider,
  });
}

/**
 * Core: verify a submitted OTP and respond.
 */
function handleVerifyOtp(req, res, purpose) {
  const { email, otp } = req.body;

  if (!validateEmail(email) || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Email and 6-digit verification code are required.',
      code: 'MISSING_FIELDS',
    });
  }

  const result = verifyOtp(email, otp, purpose);

  if (!result.ok) {
    return res.status(result.status || 400).json({
      success: false,
      error: result.error,
      code: result.status === 429 ? 'MAX_ATTEMPTS_EXCEEDED' : 'INVALID_OTP',
    });
  }

  return res.json({
    success: true,
    message: 'Verification code verified successfully.',
    verifiedToken: result.verifiedToken,
  });
}

// ─── Registration endpoints ───────────────────────────────────────────────────

export async function sendRegistrationOtp(req, res) {
  return handleSendOtp(req, res, 'registration');
}

export async function resendRegistrationOtp(req, res) {
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
    return res.status(400).json({
      success: false,
      error: 'Email, token, and new password are required.',
      code: 'MISSING_FIELDS',
    });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long.',
      code: 'WEAK_PASSWORD',
    });
  }

  const result = consumeResetToken(token, email);

  if (!result.ok) {
    return res.status(result.status || 401).json({
      success: false,
      error: result.error,
      code: 'INVALID_RESET_TOKEN',
    });
  }

  return res.json({
    success: true,
    message: 'Password has been successfully updated.',
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────

export function healthCheck(_req, res) {
  const emailStatus = getEmailServiceStatus();
  return res.json({
    status: 'ok',
    service: 'FabriSense OTP Email Service',
    emailService: emailStatus,
    smtpConfigured: emailStatus.configured,
  });
}
