/**
 * backend/services/supabase.service.js
 * Supabase client initialization, storage adapter, and cloud database access.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'inspection-images';

let supabaseAdmin = null;
let supabaseAnon = null;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));
}

/**
 * Get Supabase client with admin privileges (bypasses RLS for secure backend operations)
 */
export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseAdmin) {
    const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    supabaseAdmin = createClient(SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

/**
 * Get Supabase client with anon privileges
 */
export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!supabaseAnon) {
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseAnon;
}

/**
 * Upload an inspection image to Supabase Storage
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export async function uploadToSupabaseStorage(buffer, fileName, mimeType = 'image/jpeg') {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase is not configured on the backend.');
  }

  const cleanName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = `uploads/${cleanName}`;

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error('[Supabase Storage Upload Error]:', error);
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = admin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Add a live diagnostic log entry to Supabase
 */
export async function logToSupabaseDiagnostics(level, prefix, message) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    await admin.from('system_logs').insert({
      level: level.toUpperCase(),
      prefix: prefix || 'fabrisense-engine',
      message,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Log Warning]:', err.message);
  }
}

export default {
  isSupabaseConfigured,
  getSupabaseAdmin,
  getSupabaseClient,
  uploadToSupabaseStorage,
  logToSupabaseDiagnostics,
};
