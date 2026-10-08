/**
 * backend/services/otp.service.js
 * Core OTP business logic: generation, storage, rate-limiting, verification,
 * and password-reset token management.
 *
 * Uses in-memory Maps for storage.
 * In a production deployment these should be replaced with Redis / a database
 * so that state survives server restarts.
 */

import crypto from 'crypto';
import { NODE_ENV } from '../config/env.js';

// ─── In-memory stores ───────────────────────────────────────────────────────

/**
 * OTP store.
 * Key: `${email.toLowerCase()}:${purpose}`
 * Value: { hash, expiresAt, attempts, lastSentAt }
 */
const otpStore = new Map();

/**
 * Password-reset verified-token store.
 * Key: hex token string
 * Value: { email, expiresAt }
 */
const resetTokens = new Map();

// Cleanup expired entries every 5 minutes to prevent memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of otpStore.entries())    if (now > rec.expiresAt)    otpStore.delete(key);
  for (const [tok, dat] of resetTokens.entries()) if (now > dat.expiresAt)   resetTokens.delete(tok);
}, 5 * 60 * 1000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** SHA-256 hash of `${otp}:${email}` — avoids storing plaintext OTPs */
function hashOtp(otp, email) {
  return crypto
    .createHash('sha256')
    .update(`${String(otp).trim()}:${email.trim().toLowerCase()}`)
    .digest('hex');
}

/** Canonical purpose label used in email copy */
export function purposeTitle(purpose) {
  return purpose === 'forgot_password' ? 'Password Reset' : 'Email Verification';
}

// ─── OTP generation ──────────────────────────────────────────────────────────

/**
 * Attempt to generate and store a new OTP for (email, purpose).
 *
 * @returns {
 *   ok: boolean,
 *   otp?: string,          // plaintext — only returned for sending; never stored
 *   cooldownRemaining?: number,
 *   error?: string
 * }
 */
export function generateOtp(email, purpose) {
  const cleanEmail = email.trim().toLowerCase();
  const storeKey   = `${cleanEmail}:${purpose}`;
  const now        = Date.now();

  // 60-second cooldown per (email, purpose) pair
  const existing = otpStore.get(storeKey);
  if (existing && now - existing.lastSentAt < 60_000) {
    const cooldownRemaining = Math.ceil((60_000 - (now - existing.lastSentAt)) / 1000);
    return {
      ok: false,
      cooldownRemaining,
      error: `Please wait ${cooldownRemaining}s before requesting a new OTP.`,
    };
  }

  // Cryptographically secure 6-digit OTP
  const otp       = String(crypto.randomInt(100_000, 1_000_000));
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  otpStore.set(storeKey, {
    hash:       hashOtp(otp, cleanEmail),
    expiresAt,
    attempts:   0,
    lastSentAt: now,
  });

  return { ok: true, otp };
}

// ─── OTP verification ────────────────────────────────────────────────────────

/**
 * Verify a submitted OTP for (email, purpose).
 *
 * @returns {
 *   ok: boolean,
 *   verifiedToken?: string,   // issued for forgot_password on success
 *   error?: string,
 *   status?: number           // suggested HTTP status code
 * }
 */
export function verifyOtp(email, otp, purpose) {
  if (!email || !otp) {
    return { ok: false, status: 400, error: 'Email and 6-digit OTP are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp   = String(otp).trim();
  const storeKey   = `${cleanEmail}:${purpose}`;
  const record     = otpStore.get(storeKey);

  if (!record) {
    return { ok: false, status: 400, error: 'No active OTP found for this email. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(storeKey);
    return { ok: false, status: 400, error: 'This OTP has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(storeKey);
    return { ok: false, status: 429, error: 'Maximum attempts exceeded. This OTP has been invalidated. Please request a new code.' };
  }

  if (hashOtp(cleanOtp, cleanEmail) !== record.hash) {
    record.attempts += 1;
    const remaining = 5 - record.attempts;

    if (remaining <= 0) {
      otpStore.delete(storeKey);
      return { ok: false, status: 429, error: 'Maximum attempts exceeded. This OTP has been invalidated. Please request a new code.' };
    }

    return {
      ok: false,
      status: 400,
      error: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // ✅ Correct — delete so it cannot be reused
  otpStore.delete(storeKey);

  // Issue a single-use, short-lived token for password-reset flows
  let verifiedToken;
  if (purpose === 'forgot_password') {
    verifiedToken = crypto.randomBytes(32).toString('hex');
    resetTokens.set(verifiedToken, {
      email:     cleanEmail,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
  } else {
    // For registration, also issue a token so the frontend can confirm verification
    verifiedToken = crypto.randomBytes(32).toString('hex');
  }

  console.log(`[FabriSense] Verified ${purpose} OTP for ${cleanEmail}`);
  return { ok: true, verifiedToken };
}

// ─── Password-reset token validation ─────────────────────────────────────────

/**
 * Validate a password-reset token and (if valid) burn it.
 *
 * @returns { ok: boolean, email?: string, error?: string, status?: number }
 */
export function consumeResetToken(token, email) {
  const cleanEmail = email.trim().toLowerCase();
  const tokenData  = resetTokens.get(token);

  if (!tokenData || tokenData.email !== cleanEmail) {
    return { ok: false, status: 401, error: 'Invalid or expired password reset session. Please verify OTP again.' };
  }

  if (Date.now() > tokenData.expiresAt) {
    resetTokens.delete(token);
    return { ok: false, status: 401, error: 'Password reset session expired. Please verify OTP again.' };
  }

  resetTokens.delete(token); // single-use: burn immediately
  return { ok: true, email: cleanEmail };
}

// ─── Debug helper ─────────────────────────────────────────────────────────────

/**
 * In NODE_ENV=test, expose the plaintext OTP in the response body
 * so automated tests can verify the full flow without real email delivery.
 */
export function testPayload(otp) {
  return NODE_ENV === 'test' ? { _testOtp: otp } : {};
}
