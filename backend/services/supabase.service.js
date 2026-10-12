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
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'fabric-images';

let supabaseAdmin = null;
let supabaseAnon = null;
let bucketEnsured = false;

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
 * Ensure private Supabase Storage bucket 'fabric-images' exists
 */
export async function ensureStorageBucket() {
  if (bucketEnsured) return true;
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  try {
    const { data: buckets, error } = await admin.storage.listBuckets();
    if (error) {
      console.warn('[Supabase Storage] List buckets warning:', error.message);
      return false;
    }
    const exists = (buckets || []).some(b => b.name === STORAGE_BUCKET || b.id === STORAGE_BUCKET);
    if (!exists) {
      const { data: created, error: createErr } = await admin.storage.createBucket(STORAGE_BUCKET, {
        public: false,
        fileSizeLimit: 15728640,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      });
      if (createErr) {
        console.warn(`[Supabase Storage] Could not create bucket ${STORAGE_BUCKET}:`, createErr.message);
        return false;
      }
      console.log(`[Supabase Storage] Successfully created private bucket: ${STORAGE_BUCKET}`);
    }
    bucketEnsured = true;
    return true;
  } catch (err) {
    console.warn('[Supabase Storage] ensureStorageBucket error:', err.message);
    return false;
  }
}

/**
 * Upload an inspection fabric image to private Supabase Storage bucket 'fabric-images'
 * @param {Buffer} buffer - Raw image bytes
 * @param {string} fileName - File name
 * @param {string} mimeType - Image MIME type (e.g. image/jpeg)
 * @param {object} [options] - Optional upload parameters
 * @returns {Promise<{ url: string, signedUrl: string, proxyUrl: string, storagePath: string, fullPath: string, bucket: string }>}
 */
export async function uploadToSupabaseStorage(buffer, fileName, mimeType = 'image/jpeg', options = {}) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase is not configured on the backend.');
  }

  await ensureStorageBucket();

  const cleanName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const folder = options.folder || 'uploads';
  const filePath = `${folder}/${cleanName}`;

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error(`[Supabase Storage Upload Error in bucket '${STORAGE_BUCKET}']`, error);
    throw error;
  }

  // Generate a secure, time-limited signed URL (valid for 7 days)
  const expiresInSeconds = options.expiresIn || 60 * 60 * 24 * 7; // 7 days
  const { data: signedData, error: signErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(data.path, expiresInSeconds);

  if (signErr) {
    console.warn('[Supabase Storage Signed URL Warning]:', signErr.message);
  }

  const signedUrl = signedData?.signedUrl || null;
  const proxyUrl = `/api/storage/fabric-images/${data.path}`;
  const effectiveUrl = signedUrl || proxyUrl;

  // Build a dual-nature result: works both as a string (primitive conversion) and as rich object
  const result = Object.assign(new String(effectiveUrl), {
    url: effectiveUrl,
    signedUrl,
    proxyUrl,
    storagePath: data.path,
    fullPath: `${STORAGE_BUCKET}/${data.path}`,
    bucket: STORAGE_BUCKET,
    sizeBytes: buffer.length,
    mimeType,
  });

  return result;
}

/**
 * Create a fresh signed URL for an image in private storage
 * @param {string} storagePath - Relative path inside fabric-images bucket
 * @param {number} [expiresInSeconds=86400] - Expiration duration in seconds (default 24h)
 * @returns {Promise<string|null>}
 */
export async function createSignedUrl(storagePath, expiresInSeconds = 86400) {
  const admin = getSupabaseAdmin();
  if (!admin || !storagePath) return null;
  const cleanPath = storagePath.replace(/^fabric-images\//, '');
  try {
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, expiresInSeconds);
    if (error) {
      console.warn('[Supabase Storage] createSignedUrl error:', error.message);
      return null;
    }
    return data?.signedUrl || null;
  } catch (err) {
    console.warn('[Supabase Storage] createSignedUrl exception:', err.message);
    return null;
  }
}

/**
 * Download an image buffer securely from private Supabase Storage
 * @param {string} storagePath - Relative path in fabric-images
 * @returns {Promise<Buffer>}
 */
export async function downloadFromSupabaseStorage(storagePath) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase is not configured.');
  const cleanPath = storagePath.replace(/^fabric-images\//, '');
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(cleanPath);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
  ensureStorageBucket,
  createSignedUrl,
  downloadFromSupabaseStorage,
  logToSupabaseDiagnostics,
  STORAGE_BUCKET,
};
