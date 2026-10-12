/**
 * backend/routes/storage.routes.js
 * Secure storage proxy and signed URL routes for Supabase Storage private bucket 'fabric-images'.
 * Provides authenticated streaming so frontend never requires the Supabase service-role key.
 * Includes local filesystem fallback for offline SQLite operation.
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import {
  isSupabaseConfigured,
  downloadFromSupabaseStorage,
  createSignedUrl,
  uploadToSupabaseStorage,
  STORAGE_BUCKET,
} from '../services/supabase.service.js';
import { uploadInspectionImage } from '../middleware/upload.middleware.js';
import { UPLOADS_DIR } from '../config/env.js';

const router = Router();

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/**
 * GET /api/storage/fabric-images/*
 * Securely stream an image from private Supabase Storage bucket 'fabric-images'.
 * Fallback to local uploads folder if cloud is unreachable or offline.
 */
router.get('/fabric-images/{*filePath}', async (req, res) => {
  try {
    const rawPath = req.params.filePath || req.params[0] || '';
    if (!rawPath) {
      return res.status(400).json({ success: false, error: 'Storage file path is required.' });
    }

    // Sanitize path (prevent directory traversal)
    const normalizedPath = rawPath.replace(/\\/g, '/').replace(/\.\./g, '');
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'image/jpeg';

    // 1. If Supabase is configured, attempt secure cloud stream
    if (isSupabaseConfigured()) {
      try {
        const fileBuffer = await downloadFromSupabaseStorage(normalizedPath);
        if (fileBuffer && fileBuffer.length > 0) {
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', fileBuffer.length);
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
          res.setHeader('X-Storage-Source', 'supabase-private-cloud');
          return res.send(fileBuffer);
        }
      } catch (cloudErr) {
        console.warn(`[Storage Proxy Warning] Cloud fetch failed for '${normalizedPath}':`, cloudErr.message);
      }
    }

    // 2. Fallback to local uploads directory
    const baseFileName = path.basename(normalizedPath);
    const localCandidates = [
      path.join(UPLOADS_DIR, normalizedPath),
      path.join(UPLOADS_DIR, baseFileName),
      path.join(UPLOADS_DIR, 'inspections', baseFileName),
    ];

    for (const candidate of localCandidates) {
      if (fs.existsSync(candidate)) {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-Storage-Source', 'local-sqlite-fallback');
        return res.sendFile(path.resolve(candidate));
      }
    }

    return res.status(404).json({
      success: false,
      error: `Fabric image '${normalizedPath}' not found in Supabase Storage or local fallback.`,
    });
  } catch (error) {
    console.error('[Storage Proxy Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/storage/signed-url
 * Generate a fresh, time-limited signed URL for direct client streaming without service key exposure
 */
router.get('/signed-url', async (req, res) => {
  try {
    const { path: storagePath, expiresIn = 86400 } = req.query;
    if (!storagePath) {
      return res.status(400).json({ success: false, error: 'path query parameter is required.' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Supabase Cloud is not configured. Direct signed URLs unavailable.',
        proxyUrl: `/api/storage/fabric-images/${storagePath}`,
      });
    }

    const signedUrl = await createSignedUrl(String(storagePath), parseInt(expiresIn, 10));
    if (!signedUrl) {
      return res.status(404).json({
        success: false,
        error: `Could not generate signed URL for path '${storagePath}'. File may not exist.`,
      });
    }

    return res.json({
      success: true,
      bucket: STORAGE_BUCKET,
      storagePath,
      signedUrl,
      proxyUrl: `/api/storage/fabric-images/${storagePath}`,
      expiresInSeconds: parseInt(expiresIn, 10),
    });
  } catch (error) {
    console.error('[Storage Signed URL Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/storage/upload
 * Directly upload an image to private bucket 'fabric-images'
 */
router.post('/upload', uploadInspectionImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = path.basename(req.file.path);
    const mimeType = req.file.mimetype || 'image/jpeg';

    let cloudResult = null;
    let cloudError = null;

    if (isSupabaseConfigured()) {
      try {
        cloudResult = await uploadToSupabaseStorage(fileBuffer, fileName, mimeType);
      } catch (err) {
        cloudError = err.message;
        console.warn('[Storage Direct Upload Warning]', err.message);
      }
    }

    const localUrl = `/uploads/inspections/${fileName}`;
    const effectiveUrl = cloudResult?.proxyUrl || cloudResult?.signedUrl || localUrl;

    return res.status(201).json({
      success: true,
      data: {
        effectiveUrl,
        proxyUrl: cloudResult?.proxyUrl || `/api/storage/fabric-images/${fileName}`,
        signedUrl: cloudResult?.signedUrl || null,
        storagePath: cloudResult?.storagePath || fileName,
        bucket: STORAGE_BUCKET,
        sizeBytes: fileBuffer.length,
        mimeType,
        cloudSync: Boolean(cloudResult),
        warning: cloudError,
      },
    });
  } catch (error) {
    console.error('[Storage Upload Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
