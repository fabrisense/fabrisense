import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../database/db.js';
import YoloService from '../services/ai/yolo.service.js';
import DatabaseService from '../services/database.service.js';
import { uploadInspectionImage } from '../middleware/upload.middleware.js';
import { isSupabaseConfigured, uploadToSupabaseStorage } from '../services/supabase.service.js';

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

    if (req.file) {
      imagePath = `/uploads/inspections/${path.basename(req.file.path)}`;

      // If Supabase Storage is configured, upload to cloud bucket
      if (isSupabaseConfigured()) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const cloudUrl = await uploadToSupabaseStorage(
            fileBuffer,
            path.basename(req.file.path),
            req.file.mimetype || 'image/jpeg'
          );
          if (cloudUrl) {
            imagePath = cloudUrl;
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
      inspectorEmail = '',
      modelVersion = 'YOLOv8x-Fabric-v4.2.1',
    } = req.body;

    const inspectionId = id || `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const normalizedDefects = defects.map(d => ({
      defect_type: d.name || d.type || d.defect_type || 'Defect',
      confidence: parseInt(String(d.confidence || 85).replace('%', ''), 10) || 85,
      severity: d.severity || 'Moderate',
      x: parseFloat(d.box?.left || d.x || 20),
      y: parseFloat(d.box?.top || d.y || 20),
      width: parseFloat(d.box?.width || d.width || 30),
      height: parseFloat(d.box?.height || d.height || 30),
      explanation: d.whatIsIt || d.explanation || 'Detected anomaly',
      recommended_action: d.recommendedAction || d.recommended_action || 'Inspect affected area',
    }));

    await DatabaseService.saveInspection({
      inspectionId,
      fabricType,
      fabricName,
      imagePath,
      defectCount: normalizedDefects.length || defectCount || 0,
      grade: (grade || 'B').replace(/GRADE\s*/i, '').trim(),
      status,
      summary: overallSummary || 'Mobile user inspection completed.',
      recommendedAction: recommendedAction || 'Follow standard batch review.',
      modelVersion,
      inspectorEmail,
      defects: normalizedDefects,
    });

    return res.json({
      success: true,
      message: 'Inspection synchronized to shared database.',
      inspectionId,
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
    return res.json({ success: true, data: result.inspections, driver: result.driver });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
