import DatabaseService from '../services/database.service.js';

/**
 * GET /api/admin/dashboard
 * Computes all live KPI metrics, 6-month trends, defect distribution,
 * recent inspections, and live defect anomalies via DatabaseService
 * (Supabase Cloud PostgreSQL when active, local SQLite as resilient fallback).
 */
export async function getDashboardMetrics(_req, res) {
  try {
    const data = await DatabaseService.getDashboardMetrics();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Dashboard Metrics Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate dashboard metrics.',
    });
  }
}

