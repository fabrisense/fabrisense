import db from '../database/db.js';
import DatabaseService from '../services/database.service.js';

/**
 * GET /api/admin/reports
 * Fetch reports list with filtering
 */
export async function getReports(req, res) {
  try {
    const result = await DatabaseService.getReports(req.query);

    return res.json({
      success: true,
      data: result.data,
      driver: result.driver,
    });
  } catch (error) {
    console.error('[Get Reports Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve reports.' });
  }
}

/**
 * GET /api/admin/reports/:id
 */
export function getReportById(req, res) {
  try {
    const { id } = req.params;

    const report = db.prepare(`
      SELECT 
        r.id as report_id,
        r.report_number,
        r.report_path,
        r.created_at as generated_at,
        i.*,
        u.name as inspector_name,
        u.email as inspector_email
      FROM reports r
      JOIN inspections i ON r.inspection_id = i.inspection_id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE r.id = ? OR r.report_number = ? OR r.inspection_id = ?
    `).get(id, id, id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    const defects = db.prepare('SELECT * FROM defects WHERE inspection_id = ?').all(report.inspection_id);

    return res.json({
      success: true,
      data: {
        ...report,
        defects,
      },
    });
  } catch (error) {
    console.error('[Get Report By Id Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve report details.' });
  }
}
