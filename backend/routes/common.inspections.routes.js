import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../database/db.js';
import YoloService from '../services/ai/yolo.service.js';
import DatabaseService from '../services/database.service.js';
import { uploadInspectionImage } from '../middleware/upload.middleware.js';
import { isSupabaseConfigured, uploadToSupabaseStorage } from '../services/supabase.service.js';
import { UPLOADS_DIR } from '../config/env.js';

const router = Router();

/**
 * POST /api/inspections/analyze
 * Common endpoint for mobile and web inspection analysis
 * Runs YOLOv8 adapter and uploads to Supabase Storage if configured.
 */
router.post('/analyze', uploadInspectionImage.single('image'), async (req, res) => {
  try {
    const { fabricType = 'Handloom Cotton Blend', fabricName = 'Fabric Sample' } = req.body;
    let imagePath = '/assets/indigo_denim.jpg';
    let imageMetadata = null;

    if (req.file) {
      imagePath = `/uploads/inspections/${path.basename(req.file.path)}`;

      // If Supabase Storage is configured, upload to private bucket 'fabric-images'
      if (isSupabaseConfigured()) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const cloudResult = await uploadToSupabaseStorage(
            fileBuffer,
            path.basename(req.file.path),
            req.file.mimetype || 'image/jpeg'
          );
          if (cloudResult) {
            imagePath = cloudResult.proxyUrl || cloudResult.signedUrl || cloudResult.url;
            imageMetadata = {
              storage_bucket: cloudResult.bucket,
              storage_path: cloudResult.storagePath,
              signed_url: cloudResult.signedUrl,
              proxy_url: cloudResult.proxyUrl,
              mime_type: cloudResult.mimeType,
              size_bytes: cloudResult.sizeBytes,
            };
          }
        } catch (uploadErr) {
          console.warn('[Storage Warning] Cloud upload failed, using local path:', uploadErr.message);
        }
      }
    }

    const fullLocalPath = req.file ? req.file.path : imagePath;
    const aiResult = await YoloService.analyzeFabric(fullLocalPath, { fabricType, fabricName });

    return res.json({
      success: true,
      data: {
        imagePath,
        imageMetadata,
        ...aiResult,
      },
    });
  } catch (error) {
    console.error('[Common Analyze Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inspections/sync
 * Single Source of Truth: Persists mobile and offline inspection scans directly
 * into Supabase Cloud PostgreSQL and maintains dual-resilient SQLite sync.
 */
router.post('/sync', async (req, res) => {
  try {
    const {
      id,
      fabricType = 'Handloom Cotton',
      fabricName = 'Fabric Roll Sample',
      imagePath = '/assets/indigo_denim.jpg',
      defects = [],
      defectCount = 0,
      grade = 'B',
      status = 'Passed',
      overallSummary = '',
      recommendedAction = '',
      inspectorName = 'Ananthi Kumar',
      inspectorEmail = '',
      modelVersion = 'YOLOv8x-Fabric-v4.2.1',
    } = req.body;

    const inspectionId = id || `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let finalImagePath = imagePath;
    let imageMetadata = null;

    // If a base64 data URL is provided, save it as a local JPEG and upload to Supabase Storage if configured
    if (typeof imagePath === 'string' && imagePath.startsWith('data:image/')) {
      try {
        const matches = imagePath.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
          const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          const buffer = Buffer.from(matches[2], 'base64');
          const fileName = `mobile-${Date.now()}.${ext}`;
          const localFilePath = path.join(UPLOADS_DIR, fileName);

          fs.writeFileSync(localFilePath, buffer);
          finalImagePath = `/uploads/inspections/${fileName}`;

          if (isSupabaseConfigured()) {
            try {
              const cloudResult = await uploadToSupabaseStorage(buffer, fileName, mimeType);
              if (cloudResult) {
                finalImagePath = cloudResult.proxyUrl || cloudResult.signedUrl || cloudResult.url;
                imageMetadata = {
                  storage_bucket: cloudResult.bucket,
                  storage_path: cloudResult.storagePath,
                  signed_url: cloudResult.signedUrl,
                  proxy_url: cloudResult.proxyUrl,
                  mime_type: cloudResult.mimeType,
                  size_bytes: cloudResult.sizeBytes,
                };
              }
            } catch (cloudErr) {
              console.warn('[Storage Warning] Cloud upload for base64 failed, using local path:', cloudErr.message);
            }
          }
        }
      } catch (imgErr) {
        console.warn('[Image Process Warning] Failed to process base64 image:', imgErr.message);
      }
    }

    const normalizedDefects = defects.map(d => {
      let severity = d.severity || d.sev || 'Moderate';
      if (severity === 'Minor' || severity === 'low' || severity === 'Low') severity = 'Low';
      else if (severity === 'Critical' || severity === 'High' || severity === 'high') severity = 'Critical';
      else severity = 'Moderate';

      return {
        defect_type: d.name || d.type || d.defect_type || 'Defect',
        confidence: parseInt(String(d.confidence || 85).replace('%', ''), 10) || 85,
        severity,
        x: parseFloat(d.box?.left || d.x || 20),
        y: parseFloat(d.box?.top || d.y || 20),
        width: parseFloat(d.box?.width || d.width || 30),
        height: parseFloat(d.box?.height || d.height || 30),
        explanation: d.whatIsIt || d.explanation || 'Detected anomaly',
        recommended_action: d.recommendedAction || d.recommended_action || 'Inspect affected area',
      };
    });

    const result = await DatabaseService.saveInspection({
      inspectionId,
      fabricType,
      fabricName,
      imagePath: finalImagePath,
      defectCount: normalizedDefects.length || defectCount || 0,
      grade,
      status,
      summary: overallSummary || 'Mobile user inspection completed.',
      recommendedAction: recommendedAction || 'Follow standard batch review.',
      modelVersion,
      inspectorName,
      inspectorEmail,
      defects: normalizedDefects,
      metadata: imageMetadata,
    });

    return res.json({
      success: true,
      message: result.cloudSync
        ? 'Inspection successfully saved to Supabase Cloud and synchronized.'
        : 'Inspection saved to shared database.',
      inspectionId,
      imagePath: finalImagePath,
      imageMetadata,
      driver: result.driver,
      cloudSync: result.cloudSync,
      warning: result.warning,
    });
  } catch (error) {
    console.error('[Sync Inspection Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to sync inspection: ' + error.message });
  }
});

/**
 * GET /api/inspections
 * Fetch shared inspections list (reads from Supabase or fallback SQLite)
 */
router.get('/', async (req, res) => {
  try {
    const result = await DatabaseService.getInspections({ limit: 50 });
    return res.json({
      success: true,
      data: result.inspections,
      pagination: result.pagination,
      driver: result.driver,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
