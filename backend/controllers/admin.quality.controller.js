import db from '../database/db.js';

/**
 * GET /api/admin/quality/analytics
 * Provides comprehensive quality metrics, distribution, trends, and defect frequency
 */
export function getQualityAnalytics(_req, res) {
  try {
    const totalInspections = db.prepare('SELECT COUNT(*) as count FROM inspections').get().count;

    const gradeCounts = db.prepare(`
      SELECT 
        SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as countA,
        SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as countB,
        SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as countC
      FROM inspections
    `).get();

    const countA = gradeCounts.countA || 0;
    const countB = gradeCounts.countB || 0;
    const countC = gradeCounts.countC || 0;

    const ratioA = totalInspections > 0 ? ((countA / totalInspections) * 100).toFixed(1) : '0';
    const ratioB = totalInspections > 0 ? ((countB / totalInspections) * 100).toFixed(1) : '0';
    const ratioC = totalInspections > 0 ? ((countC / totalInspections) * 100).toFixed(1) : '0';

    // Quality Grade Distribution
    const distribution = [
      { grade: 'Grade A', count: countA, ratio: `${ratioA}%`, color: '#10b981', label: 'Premium Export Standard' },
      { grade: 'Grade B', count: countB, ratio: `${ratioB}%`, color: '#f59e0b', label: 'Minor Tolerance / Review' },
      { grade: 'Grade C', count: countC, ratio: `${ratioC}%`, color: '#ef4444', label: 'Critical Flaw / Rejected' },
    ];

    // Quality Trend over time (monthly)
    const trendsRaw = db.prepare(`
      SELECT 
        substr(inspection_date, 1, 7) as month,
        COUNT(*) as total,
        SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as gradeA,
        SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as gradeB,
        SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as gradeC
      FROM inspections
      GROUP BY substr(inspection_date, 1, 7)
      ORDER BY month ASC
      LIMIT 6
    `).all();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const qualityTrends = trendsRaw.map(t => {
      const parts = (t.month || '').split('-');
      const monthIdx = parseInt(parts[1] || '1', 10) - 1;
      const totalInMonth = t.total || 1;
      return {
        month: monthNames[monthIdx] || t.month,
        rawMonth: t.month,
        total: t.total,
        gradeA: t.gradeA,
        gradeB: t.gradeB,
        gradeC: t.gradeC,
        gradeAPercent: Math.round((t.gradeA / totalInMonth) * 100),
        gradeBPercent: Math.round((t.gradeB / totalInMonth) * 100),
        gradeCPercent: Math.round((t.gradeC / totalInMonth) * 100),
      };
    });

    // Defect Frequency vs Quality Grade (average defect count per grade)
    const defectFreqVsGrade = db.prepare(`
      SELECT 
        grade,
        COUNT(*) as inspectionsCount,
        ROUND(AVG(defect_count), 2) as avgDefects,
        MIN(defect_count) as minDefects,
        MAX(defect_count) as maxDefects
      FROM inspections
      GROUP BY grade
      ORDER BY grade ASC
    `).all();

    return res.json({
      success: true,
      data: {
        ratios: {
          gradeA: `${ratioA}%`,
          gradeB: `${ratioB}%`,
          gradeC: `${ratioC}%`,
          totalInspections,
        },
        distribution,
        qualityTrends,
        defectFreqVsGrade,
      },
    });
  } catch (error) {
    console.error('[Quality Analytics Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate quality analytics.' });
  }
}
