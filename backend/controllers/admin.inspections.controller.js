import fs from 'fs';
import path from 'path';
import db from '../database/db.js';
import YoloService from '../services/ai/yolo.service.js';
import DatabaseService from '../services/database.service.js';
import { isSupabaseConfigured, uploadToSupabaseStorage, getSupabaseAdmin } from '../services/supabase.service.js';

/**
 * GET /api/admin/inspections
 * List with search, filtering, and pagination via DatabaseService
 */
export async function getInspections(req, res) {
  try {
    const {
      search = '',
      grade = '',
      status = '',
      userId = '',
      dateFrom = '',
      dateTo = '',
      page = 1,
      limit = 10,
    } = req.query;

    const result = await DatabaseService.getInspections({
      search,
      grade,
      status,
      userId,
      dateFrom,
      dateTo,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.inspections,
      pagination: result.pagination,
      driver: result.driver,
    });
  } catch (error) {
    console.error('[Get Inspections Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve inspections.' });
  }
}

/**
 * GET /api/admin/inspections/:id
 * Retrieve single inspection with defects and audit data
 */
export async function getInspectionById(req, res) {
  try {
    const { id } = req.params;
    const inspection = await DatabaseService.getInspectionById(id);

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection record not found.' });
    }

    return res.json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    console.error('[Get Inspection Detail Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve inspection details.' });
  }
}

/**
 * Helper to generate next unique inspection ID: INS-2024-XXXX
 */
function generateNextInspectionId() {
  const year = new Date().getFullYear();
  let candidate;
  let counter = 1;

  // Find all inspection IDs matching pattern INS-{year}-XXXX
  const rows = db.prepare(`
    SELECT inspection_id
    FROM inspections
    WHERE inspection_id LIKE ?
  `).all(`INS-${year}-%`);

  let maxNum = 47;
  for (const r of rows) {
    const parts = r.inspection_id.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  counter = maxNum + 1;
  while (true) {
    const padded = String(counter).padStart(4, '0');
    candidate = `INS-${year}-${padded}`;
    const exists = db.prepare('SELECT 1 FROM inspections WHERE inspection_id = ?').get(candidate);
    if (!exists) break;
    counter++;
  }

  return candidate;
}

/**
 * POST /api/admin/inspections
 * Analyze image using YOLO adapter and save new inspection to Supabase Cloud & SQLite
 */
export async function createInspection(req, res) {
  try {
    const {
      fabricType = 'Handloom Cotton Blend',
      fabricName = 'Cotton Weave Sample',
      userId = null,
      customImage = null,
    } = req.body;

    let imagePath = '/assets/indigo_denim.jpg';

    // If an image was uploaded via Multer
    if (req.file) {
      imagePath = `/uploads/inspections/${path.basename(req.file.path)}`;

      // Upload to Supabase Storage bucket 'inspection-images' if configured
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
    } else if (customImage) {
      imagePath = customImage;
    }

    // Run YOLO / AI analysis
    const fullLocalPath = req.file ? req.file.path : imagePath;
    const aiResult = await YoloService.analyzeFabric(fullLocalPath, { fabricType, fabricName });

    const inspectionId = generateNextInspectionId();
    const assignedUserId = userId ? parseInt(userId, 10) : (req.admin?.id || 1);

    // Save inspection across Supabase Cloud & SQLite
    await DatabaseService.saveInspection({
      inspectionId,
      fabricType,
      fabricName,
      imagePath,
      defectCount: aiResult.defectCount,
      grade: aiResult.grade,
      status: aiResult.status,
      summary: aiResult.summary,
      recommendedAction: aiResult.recommendedAction,
      modelVersion: aiResult.modelVersion || 'FabriSense YOLOv8',
      defects: aiResult.defects,
    });

    const created = await DatabaseService.getInspectionById(inspectionId);

    return res.status(201).json({
      success: true,
      message: 'Inspection successfully analyzed and recorded.',
      data: created,
    });
  } catch (error) {
    console.error('[Create Inspection Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to create inspection: ' + error.message });
  }
}

/**
 * PUT /api/admin/inspections/:id
 */
export async function updateInspection(req, res) {
  try {
    const { id } = req.params;
    const { grade, status, overall_summary, recommended_action, fabric_name, fabric_type } = req.body;

    const existing = db.prepare('SELECT * FROM inspections WHERE inspection_id = ? OR id = ?').get(id, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Inspection not found.' });
    }

    const now = new Date().toISOString();

    // If cloud is enabled, update Supabase
    if (DatabaseService.isCloud()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('inspections').update({
          grade: grade || existing.grade,
          status: status || existing.status,
          overall_summary: overall_summary || existing.overall_summary,
          recommended_action: recommended_action || existing.recommended_action,
          fabric_name: fabric_name || existing.fabric_name,
          fabric_type: fabric_type || existing.fabric_type,
          updated_at: now,
        }).eq('inspection_id', existing.inspection_id);
      } catch (cloudErr) {
        console.warn('[Update Inspection Cloud Warning]', cloudErr.message);
      }
    }

    db.prepare(`
      UPDATE inspections
      SET 
        grade = COALESCE(?, grade),
        status = COALESCE(?, status),
        overall_summary = COALESCE(?, overall_summary),
        recommended_action = COALESCE(?, recommended_action),
        fabric_name = COALESCE(?, fabric_name),
        fabric_type = COALESCE(?, fabric_type),
        updated_at = ?
      WHERE id = ?
    `).run(
      grade || null,
      status || null,
      overall_summary || null,
      recommended_action || null,
      fabric_name || null,
      fabric_type || null,
      now,
      existing.id
    );

    const updated = await DatabaseService.getInspectionById(existing.inspection_id);

    return res.json({
      success: true,
      message: 'Inspection updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('[Update Inspection Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to update inspection.' });
  }
}

/**
 * DELETE /api/admin/inspections/:id
 */
export async function deleteInspection(req, res) {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM inspections WHERE inspection_id = ? OR id = ?').get(id, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Inspection not found.' });
    }

    // If cloud is enabled, delete from Supabase
    if (DatabaseService.isCloud()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('defects').delete().eq('inspection_id', existing.inspection_id);
        await supabase.from('reports').delete().eq('inspection_id', existing.inspection_id);
        await supabase.from('inspections').delete().eq('inspection_id', existing.inspection_id);
      } catch (cloudErr) {
        console.warn('[Delete Inspection Cloud Warning]', cloudErr.message);
      }
    }

    db.prepare('DELETE FROM defects WHERE inspection_id = ?').run(existing.inspection_id);
    db.prepare('DELETE FROM reports WHERE inspection_id = ?').run(existing.inspection_id);
    db.prepare('DELETE FROM inspections WHERE id = ?').run(existing.id);

    return res.json({
      success: true,
      message: `Inspection ${existing.inspection_id} removed successfully.`,
    });
  } catch (error) {
    console.error('[Delete Inspection Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to delete inspection.' });
  }
}

