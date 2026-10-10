/**
 * frontend/src/services/adminApi.js
 * Comprehensive API client for FabriSense Admin Portal
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getAdminToken() {
  try {
    return localStorage.getItem('fabrisense_admin_token');
  } catch {
    return null;
  }
}

export function setAdminAuth(token, adminData) {
  try {
    localStorage.setItem('fabrisense_admin_token', token);
    localStorage.setItem('fabrisense_admin_user', JSON.stringify(adminData));
  } catch (e) {
    console.error('Failed to save admin auth session', e);
  }
}

export function clearAdminAuth() {
  try {
    localStorage.removeItem('fabrisense_admin_token');
    localStorage.removeItem('fabrisense_admin_user');
  } catch (e) {
    console.error('Failed to clear admin auth', e);
  }
}

export function getAdminUser() {
  try {
    const raw = localStorage.getItem('fabrisense_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Base fetcher with JWT injection and status handling
 */
async function adminFetch(endpoint, options = {}) {
  const token = getAdminToken();
  const headers = {
    ...(options.headers || {}),
  };

  // Add auth token if available
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Set JSON content-type if body is regular object and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE}/api/admin${endpoint}`;
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    console.error('[Admin API Network Error]', networkError);
    throw new Error('Unable to connect to FabriSense backend server. Please verify port 5000 is active.');
  }

  if (response.status === 401) {
    // If not already on login page, clear token and redirect
    clearAdminAuth();
    if (!window.location.pathname.includes('/admin/login')) {
      window.location.href = '/admin/login?reason=session_expired';
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Authentication required.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ── Authentication ──────────────────────────────────────────────────────────
export async function loginAdmin(email, password) {
  const res = await adminFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.token && res.admin) {
    setAdminAuth(res.token, res.admin);
  }
  return res;
}

export async function fetchAdminMe() {
  return adminFetch('/me');
}

// ── Dashboard Metrics ───────────────────────────────────────────────────────
export async function fetchDashboardMetrics() {
  return adminFetch('/dashboard');
}

// ── Inspections ─────────────────────────────────────────────────────────────
export async function fetchInspections(params = {}) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      query.append(k, v);
    }
  }
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return adminFetch(`/inspections${queryString}`);
}

export async function fetchInspectionById(id) {
  return adminFetch(`/inspections/${id}`);
}

export async function createInspectionApi(formDataOrPayload) {
  const isFormData = formDataOrPayload instanceof FormData;
  return adminFetch('/inspections', {
    method: 'POST',
    body: isFormData ? formDataOrPayload : JSON.stringify(formDataOrPayload),
  });
}

export async function updateInspectionApi(id, payload) {
  return adminFetch(`/inspections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteInspectionApi(id) {
  return adminFetch(`/inspections/${id}`, {
    method: 'DELETE',
  });
}

// ── Defects & Analytics ─────────────────────────────────────────────────────
export async function fetchDefects(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/defects${query ? '?' + query : ''}`);
}

export async function fetchDefectAnalytics() {
  return adminFetch('/defects/analytics');
}

// ── Quality Analytics ───────────────────────────────────────────────────────
export async function fetchQualityAnalytics() {
  return adminFetch('/quality/analytics');
}

// ── User Management ─────────────────────────────────────────────────────────
export async function fetchUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/users${query ? '?' + query : ''}`);
}

export async function fetchUserById(id) {
  return adminFetch(`/users/${id}`);
}

export async function createUserApi(payload) {
  return adminFetch('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUserApi(id, payload) {
  return adminFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatusApi(id, status) {
  return adminFetch(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── Reports ─────────────────────────────────────────────────────────────────
export async function fetchReports(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/reports${query ? '?' + query : ''}`);
}

export async function fetchReportById(id) {
  return adminFetch(`/reports/${id}`);
}

// ── Model / System & Settings ───────────────────────────────────────────────
export async function fetchModelInfo() {
  return adminFetch('/model');
}

export async function fetchSettings() {
  return adminFetch('/settings');
}

export async function updateSettingsApi(payload) {
  return adminFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
