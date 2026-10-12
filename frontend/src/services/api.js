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

const rawApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Detect if we are running inside a Capacitor native app (Android/iOS).
 * Capacitor sets window.Capacitor.isNativePlatform() = true.
 */
function isCapacitorNative() {
  try {
    return !!(window?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/**
 * In browser dev mode, leave API_BASE empty so Vite proxy handles /api → :5000.
 * In Capacitor (Android/iOS), use the explicit VITE_API_BASE_URL (e.g. http://10.0.2.2:5000).
 * In production browser builds, use the explicit URL if set.
 */
const API_BASE = (() => {
  if (!rawApiBase) return ''; // empty → Vite proxy (browser dev)
  if (isCapacitorNative()) return rawApiBase; // native app: always use explicit URL
  // Browser with an explicit URL set: only use it if it doesn't point to Android loopback
  if (rawApiBase.includes('10.0.2.2')) return ''; // strip Android-only URL in browser
  return rawApiBase;
})();

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
      code: data?.code,
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

// ─── Inspection Operations ───────────────────────────────────────────────────

/**
 * Synchronize a completed inspection scan to backend SQLite and Supabase Cloud.
 * @param {object} inspectionData
 * @returns {Promise<{ success: boolean, inspectionId: string, imagePath?: string }>}
 */
export function syncInspectionRecord(inspectionData) {
  return apiFetch('/inspections/sync', {
    method: 'POST',
    body: JSON.stringify(inspectionData),
  });
}

/**
 * Fetch latest inspections list from shared database.
 * @param {object} [params] - Optional filters: limit, page, grade, status, search
 * @returns {Promise<{ success: boolean, data: Array, pagination: object }>}
 */
export function fetchInspectionsList(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  if (params.page) query.set('page', params.page);
  if (params.grade) query.set('grade', params.grade);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  const qStr = query.toString();
  return apiFetch(`/inspections${qStr ? `?${qStr}` : ''}`);
}

/**
 * Fetch live aggregate inspection metrics & KPI statistics.
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export function fetchInspectionStats() {
  return apiFetch('/inspections/stats');
}

/**
 * Send image for AI/YOLO defect detection analysis.
 * Supports File, Blob, or base64 dataUrl string.
 * @param {File|Blob|string} imageInput
 * @param {object} [metadata]
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function analyzeFabricImage(imageInput, metadata = {}) {
  try {
    const formData = new FormData();

    if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
      const [header, base64Data] = imageInput.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const binary = atob(base64Data);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: mime });
      formData.append('image', blob, 'capture.jpg');
    } else if (imageInput instanceof Blob || (typeof File !== 'undefined' && imageInput instanceof File)) {
      formData.append('image', imageInput, imageInput.name || 'fabric.jpg');
    } else if (typeof imageInput === 'string' && imageInput) {
      formData.append('imagePath', imageInput);
    }

    if (metadata.fabricType) formData.append('fabricType', metadata.fabricType);
    if (metadata.fabricName) formData.append('fabricName', metadata.fabricName);

    const url = `${API_BASE}/api/inspections/analyze`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Analysis failed (HTTP ${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error('[FabriSense AI] Analysis request failed:', err.message);
    throw err;
  }
}


