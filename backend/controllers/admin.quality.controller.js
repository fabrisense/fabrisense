import DatabaseService from '../services/database.service.js';

/**
 * GET /api/admin/quality/analytics
 * Provides comprehensive quality metrics, distribution, trends, and defect frequency
 */
export async function getQualityAnalytics(_req, res) {
  try {
    const analytics = await DatabaseService.getQualityAnalytics();

    return res.json({
      success: true,
      data: analytics,
      driver: analytics.driver,
    });
  } catch (error) {
    console.error('[Quality Analytics Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate quality analytics.' });
  }
}
