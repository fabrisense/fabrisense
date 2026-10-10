import db from '../database/db.js';

/**
 * GET /api/admin/reports
 * Fetch reports list with filtering
 */
export function getReports(req, res) {
  try {
    const { search = '', dateFrom = '', dateTo = '', fabricType = '', grade = '', inspector = '', user = '' } = req.query;

    const conditions = ['1=1'];
    const params = [];

    if (search.trim()) {
      conditions.push('(r.report_number LIKE ? OR i.inspection_id LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (fabricType && fabricType !== 'all') {
      conditions.push('i.fabric_type = ?');
      params.push(fabricType);
    }

    if (grade && grade !== 'all') {
      conditions.push('i.grade = ?');
      params.push(grade.toUpperCase());
    }

    const targetUser = inspector || user;
    if (targetUser && targetUser !== 'all') {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${targetUser}%`, `%${targetUser}%`);
    }

    if (dateFrom) {
      conditions.push('i.inspection_date >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push('i.inspection_date <= ?');
      params.push(`${dateTo} 23:59:59`);
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT 
        r.id as report_id,
        r.report_number,
        r.report_path,
        COALESCE(r.status, 'Generated') as report_status,
        r.created_at as generated_at,
        i.id as inspection_pk,
        i.inspection_id,
        i.fabric_type,
        i.fabric_name,
        i.image_path,
        i.inspection_date,
        i.defect_count,
        i.grade,
        i.status,
        i.overall_summary,
        i.recommended_action,
        COALESCE(u.name, 'Rajesh Kumar') as inspector_name,
        u.email as inspector_email
      FROM reports r
      JOIN inspections i ON r.inspection_id = i.inspection_id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE ${whereClause}
      ORDER BY r.id DESC
    `;

    const reports = db.prepare(sql).all(...params);

    return res.json({
      success: true,
      data: reports,
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
