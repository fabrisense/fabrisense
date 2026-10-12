import db from '../database/db.js';
import DatabaseService from '../services/database.service.js';

/**
 * GET /api/admin/defects
 * Get list of all defects with optional filtering
 */
export async function getDefects(req, res) {
  try {
    const { defectType = '', severity = '', page = 1, limit = 20 } = req.query;
    const result = await DatabaseService.getDefects({ defectType, severity, page, limit });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      driver: result.driver,
    });
  } catch (error) {
    console.error('[Get Defects Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve defects.' });
  }
}

/**
 * GET /api/admin/defects/analytics
 * Provides aggregated analytics for Defect Analytics page
 */
export async function getDefectAnalytics(_req, res) {
  try {
    const analytics = await DatabaseService.getDefectAnalytics();

    return res.json({
      success: true,
      data: analytics,
      driver: analytics.driver,
    });
  } catch (error) {
    console.error('[Defect Analytics Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate defect analytics.' });
  }
}
