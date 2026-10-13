/**
 * frontend/src/services/supabase.js
 * Frontend Supabase Client, Auth, Storage, and Realtime Subscriptions.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/i, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'inspection-images';

let supabaseClient = null;
let _initError = null;

/**
 * Validates that the key is a valid Supabase client key.
 * Supports modern publishable keys ('sb_publishable_*') and legacy JWT keys ('eyJ*').
 */
function isValidSupabaseKey(key) {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  return (
    (trimmed.startsWith('eyJ') && trimmed.length > 50) ||
    (trimmed.startsWith('sb_publishable_') && trimmed.length > 20)
  );
}

/**
 * Returns true if Supabase frontend credentials are present and valid.
 */
export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_URL.includes('.supabase.co') &&
    isValidSupabaseKey(SUPABASE_ANON_KEY)
  );
}

/**
 * Returns singleton Supabase client or null.
 * Never throws — returns null if not configured or on init error.
 */
export function getSupabase() {
  if (!isSupabaseConfigured()) {
    if (SUPABASE_URL || SUPABASE_ANON_KEY) {
      // Credentials were set but are invalid — warn once
      console.warn(
        '[FabriSense] Supabase credentials found but appear invalid.\n' +
        '  VITE_SUPABASE_URL must be https://xxxx.supabase.co\n' +
        '  VITE_SUPABASE_ANON_KEY must be a valid publishable key (sb_publishable_...) or anon JWT (eyJ...)\n' +
        '  Current URL:', SUPABASE_URL || '(empty)',
        '  Key prefix:', SUPABASE_ANON_KEY.slice(0, 15) || '(empty)'
      );
    }
    return null;
  }
  if (!supabaseClient && !_initError) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      _initError = err;
      console.error('[FabriSense] Failed to initialise Supabase client:', err.message);
      return null;
    }
  }
  return _initError ? null : supabaseClient;
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    const envFile = import.meta.env.MODE === 'android' ? 'frontend/.env.android' : 'frontend/.env';
    const nextStep = import.meta.env.MODE === 'android'
      ? 'then rebuild and reinstall the Android app'
      : 'then restart the dev server';
    throw new Error(
      `Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in ${envFile}, ${nextStep}.`,
    );
  }
  return supabase;
}

export function getProfileFromUser(user) {
  const email = user.email || '';
  return {
    name: user.user_metadata?.full_name || email.split('@')[0] || 'User',
    email,
    role: user.app_metadata?.role === 'admin' ? 'Admin' : 'User',
  };
}

export async function signInWithPassword(email, password) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email, password, fullName) {
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function verifySignupOtp(email, token) {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
  if (error) {
    // If 'signup' verification type fails, try 'email' type (used when project OTP template or signInWithOtp is used)
    const fallback = await requireSupabase().auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (!fallback.error && fallback.data?.user) {
      return fallback.data;
    }
    throw error;
  }
  return data;
}

export async function resendSignupOtp(email) {
  const { error } = await requireSupabase().auth.resend({ email, type: 'signup' });
  if (error) {
    // If type 'signup' resend fails, try resending without type or type 'signup'
    throw error;
  }
}

export async function sendPasswordRecoveryOtp(email) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email);
  if (error) throw error;
  return { cooldown: 60 };
}

export async function verifyPasswordRecoveryOtp(email, token) {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(password) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

/**
 * Subscribe to realtime inspection updates across mobile and web
 * @param {Function} onRecordChange - Callback invoked when an inspection is inserted/updated/deleted
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToInspections(onRecordChange) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('realtime:inspections')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inspections' },
      (payload) => {
        console.log('[Supabase Realtime] Inspection event:', payload.eventType, payload.new?.inspection_id);
        if (typeof onRecordChange === 'function') {
          onRecordChange(payload);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase Realtime] Subscribed to inspections channel.');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to realtime defect updates
 * @param {Function} onDefectChange
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToDefects(onDefectChange) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('realtime:defects')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'defects' },
      (payload) => {
        if (typeof onDefectChange === 'function') {
          onDefectChange(payload);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Upload a fabric inspection image to Supabase Storage
 * @param {File|Blob} file
 * @param {string} customName
 * @returns {Promise<string>} Public image URL
 */
export async function uploadImageToSupabase(file, customName) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured in frontend environment.');
  }

  const extension = file.name ? file.name.split('.').pop() : 'jpg';
  const fileName = `${Date.now()}-${(customName || 'scan').replace(/[^a-zA-Z0-9_-]/g, '')}.${extension}`;
  const filePath = `mobile-scans/${fileName}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (error) {
    console.error('[Supabase Storage] Upload failed:', error);
    throw error;
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

export default {
  isSupabaseConfigured,
  getSupabase,
  getProfileFromUser,
  signInWithPassword,
  signUpWithPassword,
  verifySignupOtp,
  resendSignupOtp,
  sendPasswordRecoveryOtp,
  verifyPasswordRecoveryOtp,
  updatePassword,
  signOut,
  subscribeToInspections,
  subscribeToDefects,
  uploadImageToSupabase,
};
