/**
 * backend/services/otp.service.js
 * Cryptographically secure OTP generation, hashed storage, attempt limiting,
 * expiration, and single-use password reset token management.
 *
 * Plaintext OTPs are NEVER stored and NEVER leaked in responses or logs.
 */

import crypto from 'crypto';

// Per-process salt for hashing OTPs to prevent precomputed hash lookups
const INSTANCE_SALT = crypto.randomBytes(16).toString('hex');

// In-memory OTP store
// Key: `${email.toLowerCase()}:${purpose}`
// Value: { hash, expiresAt, attempts, lastSentAt }
const otpStore = new Map();

// Single-use password reset session token store
// Key: hex token string
// Value: { email, expiresAt }
const resetTokens = new Map();

// Test hook store for internal unit test inspection only (never exposed over HTTP)
const testOtpCapture = new Map();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of otpStore.entries()) {
    if (now > rec.expiresAt) {
      otpStore.delete(key);
      testOtpCapture.delete(key);
    }
  }
  for (const [tok, dat] of resetTokens.entries()) {
    if (now > dat.expiresAt) {
      resetTokens.delete(tok);
    }
  }
}, 5 * 60 * 1000);

/**
 * SHA-256 hash of `${otp}:${email}:${purpose}:${salt}`
 */
function hashOtp(otp, email, purpose) {
  return crypto
    .createHash('sha256')
    .update(`${String(otp).trim()}:${email.trim().toLowerCase()}:${purpose}:${INSTANCE_SALT}`)
    .digest('hex');
}

/**
 * Canonical purpose label used in email copy
 */
export function purposeTitle(purpose) {
  return purpose === 'forgot_password' ? 'Password Reset' : 'Email Verification';
}

/**
 * Generate a cryptographically secure 6-digit OTP for (email, purpose).
 * Enforces a 60-second cooldown between requests.
 *
 * @param {string} email
 * @param {string} purpose - 'registration' | 'forgot_password'
 * @returns {{
 *   ok: boolean,
 *   otp?: string,              // Plaintext OTP returned ONLY to email service for dispatch
 *   cooldownRemaining?: number,
 *   error?: string
 * }}
 */
export function generateOtp(email, purpose) {
  const cleanEmail = email.trim().toLowerCase();
  const storeKey   = `${cleanEmail}:${purpose}`;
  const now        = Date.now();

  const existing = otpStore.get(storeKey);
  if (existing && now - existing.lastSentAt < 60_000) {
    const cooldownRemaining = Math.ceil((60_000 - (now - existing.lastSentAt)) / 1000);
    return {
      ok: false,
      cooldownRemaining,
      error: `Please wait ${cooldownRemaining}s before requesting a new code.`,
    };
  }

  // Cryptographically secure 6-digit integer in range [100000, 999999]
  const otpNumber = crypto.randomInt(100_000, 1_000_000);
  const otp       = String(otpNumber);
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  // Store ONLY the hash
  otpStore.set(storeKey, {
    hash:       hashOtp(otp, cleanEmail, purpose),
    expiresAt,
    attempts:   0,
    lastSentAt: now,
  });

  // Track in memory for internal unit tests if in test mode
  if (process.env.NODE_ENV === 'test') {
    testOtpCapture.set(storeKey, otp);
  }

  return { ok: true, otp };
}

/**
 * Verify a submitted OTP.
 * Invalidate on success, or upon reaching 5 failed attempts or expiration.
 *
 * @param {string} email
 * @param {string} otp - 6-digit code submitted by user
 * @param {string} purpose
 * @returns {{
 *   ok: boolean,
 *   verifiedToken?: string,
 *   error?: string,
 *   status?: number
 * }}
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
    return { ok: false, status: 400, error: 'No active verification code found for this email. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(storeKey);
    testOtpCapture.delete(storeKey);
    return { ok: false, status: 400, error: 'This verification code has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(storeKey);
    testOtpCapture.delete(storeKey);
    return { ok: false, status: 429, error: 'Maximum attempts exceeded. This code has been invalidated. Please request a new code.' };
  }

  const computedHash = hashOtp(cleanOtp, cleanEmail, purpose);
  if (computedHash !== record.hash) {
    record.attempts += 1;
    const remaining = 5 - record.attempts;

    if (remaining <= 0) {
      otpStore.delete(storeKey);
      testOtpCapture.delete(storeKey);
      return { ok: false, status: 429, error: 'Maximum attempts exceeded. This code has been invalidated. Please request a new code.' };
    }

    return {
      ok: false,
      status: 400,
      error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Verification succeeded — invalidate OTP immediately so it cannot be reused
  otpStore.delete(storeKey);
  testOtpCapture.delete(storeKey);

  // Issue single-use verified session token
  const verifiedToken = crypto.randomBytes(32).toString('hex');
  if (purpose === 'forgot_password') {
    resetTokens.set(verifiedToken, {
      email: cleanEmail,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
  }

  return { ok: true, verifiedToken };
}

/**
 * Validate and consume a single-use password reset token.
 *
 * @param {string} token
 * @param {string} email
 * @returns {{ ok: boolean, email?: string, error?: string, status?: number }}
 */
export function consumeResetToken(token, email) {
  if (!token || !email) {
    return { ok: false, status: 400, error: 'Reset token and email are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const tokenData  = resetTokens.get(token);

  if (!tokenData || tokenData.email !== cleanEmail) {
    return { ok: false, status: 401, error: 'Invalid or expired password reset session. Please verify OTP again.' };
  }

  if (Date.now() > tokenData.expiresAt) {
    resetTokens.delete(token);
    return { ok: false, status: 401, error: 'Password reset session expired. Please verify OTP again.' };
  }

  // Burn immediately — single use only
  resetTokens.delete(token);
  return { ok: true, email: cleanEmail };
}

/**
 * Internal helper for automated tests to obtain captured OTP without HTTP leakage.
 * Only returns a value when NODE_ENV === 'test'.
 */
export function _getTestCapturedOtp(email, purpose) {
  if (process.env.NODE_ENV !== 'test') return null;
  return testOtpCapture.get(`${email.trim().toLowerCase()}:${purpose}`) || null;
}

/**
 * Clear all in-memory stores for clean test runs.
 */
export function _clearAllOtpStores() {
  otpStore.clear();
  resetTokens.clear();
  testOtpCapture.clear();
}
