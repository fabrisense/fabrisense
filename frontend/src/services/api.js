/**
 * src/services/api.js
 * Centralised API client for FabriSense frontend ↔ backend communication.
 *
 * API base URL resolution:
 * ┌─────────────────────────────┬────────────────────────────────────────────────────┐
 * │ Environment                 │ VITE_API_BASE_URL value                            │
 * ├─────────────────────────────┼────────────────────────────────────────────────────┤
 * │ Browser dev (npm run dev)   │ (leave empty) — Vite proxy handles /api → :5000   │
 * │ Android emulator            │ http://10.0.2.2:5000  (Android loopback to host)  │
 * │ Android device (LAN)        │ http://192.168.x.x:5000 (your machine's LAN IP)   │
 * │ Production / deployed       │ https://api.fabrisense.com  (your deployed URL)   │
 * └─────────────────────────────┴────────────────────────────────────────────────────┘
 *
 * Set VITE_API_BASE_URL in .env (or .env.local for overrides not committed to git).
 * Never put secrets here — this file is bundled into the client.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Low-level fetch wrapper.
 * Always sends / expects JSON.
 * Throws a structured error { message, status } on non-OK responses.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}/api${path}`;
  console.log('[FabriSense API] Calling:', url);
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (networkError) {
    // "Failed to fetch" lands here — backend is not reachable.
    console.error('[FabriSense API] Network error:', { url, error: networkError });
    throw {
      message: 'Cannot reach the server. Make sure the backend is running on port 5000.',
      status: 0,
    };
  }

  const rawText = await res.text();
  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('[FabriSense API] Non-JSON response:', {
      url,
      status: res.status,
      contentType: res.headers.get('content-type'),
      body: rawText,
    });

    throw {
      message: `Server returned a non-JSON response (HTTP ${res.status}).`,
      status: res.status,
    };
  }

  if (!res.ok) {
    throw {
      message: data?.error || `Request failed (HTTP ${res.status})`,
      status: res.status,
      cooldownRemaining: data?.cooldownRemaining,
    };
  }

  return data;
}

// ─── Registration OTP ─────────────────────────────────────────────────────────

/**
 * Request a 6-digit OTP for new account email verification.
 * @param {string} email
 * @returns {Promise<{ success: boolean, message: string, cooldown: number }>}
 */
export function sendRegistrationOtp(email) {
  return apiFetch('/otp/send-registration', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Resend the registration OTP (invalidates the previous one).
 * @param {string} email
 */
export function resendRegistrationOtp(email) {
  return apiFetch('/otp/resend-registration', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify a registration OTP.
 * @param {string} email
 * @param {string} otp   - 6-digit code
 * @returns {Promise<{ success: boolean, message: string, verifiedToken: string }>}
 */
export function verifyRegistrationOtp(email, otp) {
  return apiFetch('/otp/verify-registration', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

// ─── Forgot-password OTP ──────────────────────────────────────────────────────

/**
 * Request a 6-digit OTP for password recovery.
 * @param {string} email
 */
export function sendForgotPasswordOtp(email) {
  return apiFetch('/otp/send-forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Resend the forgot-password OTP.
 * @param {string} email
 */
export function resendForgotPasswordOtp(email) {
  return apiFetch('/otp/resend-forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify a forgot-password OTP.
 * @returns {Promise<{ success: boolean, message: string, verifiedToken: string }>}
 */
export function verifyForgotPasswordOtp(email, otp) {
  return apiFetch('/otp/verify-forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

// ─── Password reset ───────────────────────────────────────────────────────────

/**
 * Submit the new password using the token issued after OTP verification.
 * @param {string} email
 * @param {string} token        - verifiedToken from verifyForgotPasswordOtp
 * @param {string} newPassword
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export function resetPassword(email, token, newPassword) {
  return apiFetch('/otp/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Ping the backend health endpoint.
 * Useful for checking connectivity before performing OTP operations.
 */
export function checkHealth() {
  return apiFetch('/health');
}
