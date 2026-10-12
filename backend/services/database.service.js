/**
 * backend/services/database.service.js
 * Unified Database Provider with intelligent Dual-Driver architecture.
 *
 * Primary Driver:  Supabase Cloud PostgreSQL (when SUPABASE_URL & keys configured)
 * Fallback Driver: Local SQLite via better-sqlite3 (ensures zero downtime & test stability)
 */

import sqliteDb from '../database/db.js';
import { getSupabaseAdmin, isSupabaseConfigured, uploadToSupabaseStorage } from './supabase.service.js';

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs)) return 'Recently';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch (_e) {
    return 'Recently';
  }
}

export class DatabaseService {
  /**
   * Returns true if Supabase Cloud is currently active
   */
  static isCloud() {
    return isSupabaseConfigured() && getSupabaseAdmin() !== null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DASHBOARD METRICS
  // ───────────────────────────────────────────────────────────────────────────
  static async getDashboardMetrics() {
    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        const { data: allInspections, error: inspErr } = await supabase
          .from('inspections')
          .select('id, inspection_id, grade, status, defect_count, inspection_date, fabric_name, fabric_type, inspector_name, user_id, created_at')
          .order('inspection_date', { ascending: false });

        if (!inspErr && allInspections) {
          const totalInspections = allInspections.length;
          const defectFree = allInspections.filter(i => (i.defect_count || 0) === 0).length;
          const gradeA = allInspections.filter(i => i.grade === 'A').length;
          const gradeB = allInspections.filter(i => i.grade === 'B').length;
          const gradeC = allInspections.filter(i => i.grade === 'C').length;

          const { data: defectsData } = await supabase.from('defects').select('id, defect_type, severity, confidence, inspection_id, created_at');
          const totalDefects = defectsData ? defectsData.length : allInspections.reduce((sum, i) => sum + (i.defect_count || 0), 0);

          const pctA = totalInspections > 0 ? Math.round((gradeA / totalInspections) * 100) : 0;
          const pctB = totalInspections > 0 ? Math.round((gradeB / totalInspections) * 100) : 0;
          const pctC = totalInspections > 0 ? Math.round((gradeC / totalInspections) * 100) : 0;

          // Recent 5 inspections
          const recentInspections = allInspections.slice(0, 5).map(r => ({
            id: r.id,
            inspection_id: r.inspection_id,
            fabric_name: r.fabric_name || r.fabric_type || 'Fabric Roll',
            fabric_type: r.fabric_type || 'Textile',
            defect_count: r.defect_count || 0,
            grade: r.grade,
            status: r.status,
            inspector_name: r.inspector_name || 'Inspector',
            inspection_date: r.inspection_date,
            time: r.inspection_date ? r.inspection_date.replace('T', ' ').slice(0, 16) : 'Just now',
          }));

          // Live latest defects from Supabase
          const inspMap = {};
          allInspections.forEach(i => { inspMap[i.inspection_id] = i; });

          const liveDefects = (defectsData || []).slice(0, 5).map((d, idx) => {
            const insp = inspMap[d.inspection_id] || {};
            return {
              id: d.id || idx + 1,
              defect_type: d.defect_type || 'Defect',
              fabric_name: insp.fabric_name || insp.fabric_type || 'Fabric Roll',
              fabric_type: insp.fabric_type || 'Textile',
              inspection_id: d.inspection_id,
              severity: d.severity || 'Low',
              confidence: Math.round(d.confidence || 0),
              time_ago: formatRelativeTime(d.created_at || insp.inspection_date),
            };
          });

          // Defect categories
          let holesCount = 0, stainsCount = 0, brokenYarnCount = 0, tearsScratchesCount = 0, otherCount = 0;
          (defectsData || []).forEach(d => {
            const t = (d.defect_type || '').toLowerCase();
            if (t.includes('hole')) holesCount++;
            else if (t.includes('stain')) stainsCount++;
            else if (t.includes('broken') || t.includes('yarn') || t.includes('thread') || t.includes('knot')) brokenYarnCount++;
            else if (t.includes('tear') || t.includes('scratch') || t.includes('weft')) tearsScratchesCount++;
            else otherCount++;
          });

          const defectDistribution = [
            { name: 'Holes', count: holesCount, color: '#dc2626' },
            { name: 'Stains', count: stainsCount, color: '#ea580c' },
            { name: 'Broken Yarn', count: brokenYarnCount, color: '#16806e' },
            { name: 'Tears & Scratches', count: tearsScratchesCount, color: '#2563eb' },
            { name: 'Other', count: otherCount, color: '#64748b' },
          ];

          // Compute real monthly trends from actual inspection timestamps
          const now = new Date();
          const monthMap = {};
          const monthKeys = [];
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          for (let m = 5; m >= 0; m--) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${yyyy}-${mm}`;
            monthKeys.push(key);
            monthMap[key] = { month: monthNames[d.getMonth()], rawMonth: key, total: 0, gradeA: 0, gradeB: 0, gradeC: 0 };
          }

          allInspections.forEach(i => {
            const dateStr = (i.inspection_date || i.created_at || '').slice(0, 7);
            if (monthMap[dateStr]) {
              monthMap[dateStr].total++;
              if (i.grade === 'A') monthMap[dateStr].gradeA++;
              else if (i.grade === 'B') monthMap[dateStr].gradeB++;
              else if (i.grade === 'C') monthMap[dateStr].gradeC++;
            }
          });
          const trends = monthKeys.map(k => monthMap[k]);

          return {
            kpis: {
              totalInspections,
              defectsDetected: totalDefects,
              defectFree,
              gradeAPercentage: pctA,
              gradeBPercentage: pctB,
              gradeCPercentage: pctC,
              gradeACount: gradeA,
              gradeBCount: gradeB,
              gradeCCount: gradeC,
            },
            trends,
            defectDistribution,
            recentInspections,
            liveDefects,
            driver: 'supabase',
          };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase metrics error, falling back to SQLite:', err.message);
      }
    }

    // ── SQLite Fallback ──
    const totalInspections = sqliteDb.prepare('SELECT COUNT(*) as count FROM inspections').get().count;
    const defectsDetected = sqliteDb.prepare('SELECT COUNT(*) as count FROM defects').get().count;
    const defectFree = sqliteDb.prepare('SELECT COUNT(*) as count FROM inspections WHERE defect_count = 0').get().count;

    const gradeCounts = sqliteDb.prepare(`
      SELECT
        SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as gradeA,
        SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as gradeB,
        SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as gradeC
      FROM inspections
    `).get();

    const countA = gradeCounts?.gradeA || 0;
    const countB = gradeCounts?.gradeB || 0;
    const countC = gradeCounts?.gradeC || 0;

    const gradeA = totalInspections > 0 ? Math.round((countA / totalInspections) * 100) : 0;
    const gradeB = totalInspections > 0 ? Math.round((countB / totalInspections) * 100) : 0;
    const gradeC = totalInspections > 0 ? Math.round((countC / totalInspections) * 100) : 0;

    const trendsRaw = sqliteDb.prepare(`
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
    const trends = trendsRaw.map(t => {
      const parts = (t.month || '').split('-');
      const monthIdx = parseInt(parts[1] || '1', 10) - 1;
      const monthLabel = monthNames[monthIdx] || t.month;
      return {
        month: monthLabel,
        rawMonth: t.month,
        total: t.total,
        gradeA: t.gradeA || 0,
        gradeB: t.gradeB || 0,
        gradeC: t.gradeC || 0,
      };
    });

    const defectCategoriesRaw = sqliteDb.prepare(`
      SELECT defect_type, COUNT(*) as count
      FROM defects
      GROUP BY defect_type
      ORDER BY count DESC
    `).all();

    let holesCount = 0;
    let stainsCount = 0;
    let brokenYarnCount = 0;
    let tearsScratchesCount = 0;
    let otherCount = 0;

    defectCategoriesRaw.forEach(item => {
      const type = (item.defect_type || '').toLowerCase();
      if (type.includes('hole')) holesCount += item.count;
      else if (type.includes('stain')) stainsCount += item.count;
      else if (type.includes('broken') || type.includes('yarn') || type.includes('thread') || type.includes('knot')) brokenYarnCount += item.count;
      else if (type.includes('tear') || type.includes('scratch') || type.includes('weft')) tearsScratchesCount += item.count;
      else otherCount += item.count;
    });

    const defectDistribution = [
      { name: 'Holes', count: holesCount, color: '#dc2626' },
      { name: 'Stains', count: stainsCount, color: '#ea580c' },
      { name: 'Broken Yarn', count: brokenYarnCount, color: '#16806e' },
      { name: 'Tears & Scratches', count: tearsScratchesCount, color: '#2563eb' },
      { name: 'Other', count: otherCount, color: '#64748b' },
    ];

    const recentRows = sqliteDb.prepare(`
      SELECT
        i.id,
        i.inspection_id,
        i.fabric_type,
        i.fabric_name,
        i.defect_count,
        i.grade,
        i.status,
        i.inspection_date,
        COALESCE(u.name, 'Rajesh Kumar') as inspector_name
      FROM inspections i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY i.id DESC
      LIMIT 5
    `).all();

    // Query real live defects from SQLite
    const liveDefectsRows = sqliteDb.prepare(`
      SELECT
        d.id,
        d.defect_type,
        d.severity,
        d.confidence,
        d.inspection_id,
        d.created_at,
        i.fabric_name,
        i.fabric_type,
        i.inspection_date
      FROM defects d
      JOIN inspections i ON d.inspection_id = i.inspection_id
      ORDER BY d.id DESC
      LIMIT 5
    `).all();

    const liveDefects = liveDefectsRows.map(d => ({
      id: d.id,
      defect_type: d.defect_type,
      fabric_name: d.fabric_name || d.fabric_type || 'Fabric Roll',
      fabric_type: d.fabric_type || 'Textile',
      inspection_id: d.inspection_id,
      severity: d.severity,
      confidence: Math.round(d.confidence || 0),
      time_ago: formatRelativeTime(d.created_at || d.inspection_date),
    }));

    return {
      kpis: {
        totalInspections,
        defectsDetected,
        defectFree,
        gradeAPercentage: gradeA,
        gradeBPercentage: gradeB,
        gradeCPercentage: gradeC,
        gradeACount: countA,
        gradeBCount: countB,
        gradeCCount: countC,
      },
      trends,
      defectDistribution,
      recentInspections: recentRows,
      liveDefects,
      driver: 'sqlite',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INSPECTIONS
  // ───────────────────────────────────────────────────────────────────────────
  static async getInspections({
    search = '',
    grade = '',
    status = '',
    userId = '',
    dateFrom = '',
    dateTo = '',
    page = 1,
    limit = 10,
  }) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        let query = supabase.from('inspections').select('*', { count: 'exact' });

        if (search.trim()) {
          query = query.or(`inspection_id.ilike.%${search.trim()}%,fabric_name.ilike.%${search.trim()}%,fabric_type.ilike.%${search.trim()}%`);
        }
        if (grade && grade !== 'all') {
          query = query.eq('grade', grade.toUpperCase());
        }
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        if (userId && userId !== 'all') {
          query = query.eq('user_id', userId);
        }
        if (dateFrom) {
          query = query.gte('inspection_date', dateFrom);
        }
        if (dateTo) {
          query = query.lte('inspection_date', `${dateTo} 23:59:59`);
        }

        const { data, count, error } = await query
          .order('inspection_date', { ascending: false })
          .range(offset, offset + limitNum - 1);

        if (!error && data) {
          return {
            inspections: data.map(r => ({
              id: r.id,
              inspection_id: r.inspection_id,
              fabric_name: r.fabric_name,
              fabric_type: r.fabric_type,
              defect_count: r.defect_count,
              grade: r.grade,
              status: r.status,
              inspection_date: r.inspection_date,
              inspector_name: r.inspector_name || 'Rajesh Kumar',
              image_path: r.image_url || r.image_path,
              image_url: r.image_url || r.image_path,
              metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {}),
              overall_summary: r.overall_summary,
              recommended_action: r.recommended_action,
              model_version: r.model_version,
            })),
            pagination: {
              total: count || 0,
              page: pageNum,
              limit: limitNum,
              totalPages: Math.ceil((count || 0) / limitNum) || 1,
            },
            driver: 'supabase',
          };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase getInspections fallback:', err.message);
      }
    }

    // ── SQLite Fallback ──
    const conditions = ['1=1'];
    const params = [];

    if (search.trim()) {
      conditions.push('(i.inspection_id LIKE ? OR i.fabric_name LIKE ? OR i.fabric_type LIKE ? OR u.name LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }
    if (grade && grade !== 'all') {
      conditions.push('i.grade = ?');
      params.push(grade.toUpperCase());
    }
    if (status && status !== 'all') {
      conditions.push('i.status = ?');
      params.push(status);
    }
    if (userId && userId !== 'all') {
      conditions.push('i.user_id = ?');
      params.push(parseInt(userId, 10));
    }
    if (dateFrom) {
      conditions.push('i.inspection_date >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('i.inspection_date <= ?');
      params.push(`${dateTo} 23:59:59`);
    }

    const where = conditions.join(' AND ');
    const countSql = `
      SELECT COUNT(*) as total
      FROM inspections i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE ${where}
    `;
    const total = sqliteDb.prepare(countSql).get(...params).total;

    const selectSql = `
      SELECT
        i.id,
        i.inspection_id,
        i.user_id,
        i.fabric_type,
        i.fabric_name,
        i.image_path,
        i.inspection_date,
        i.defect_count,
        i.grade,
        i.status,
        i.overall_summary,
        i.recommended_action,
        i.model_version,
        i.metadata,
        i.created_at,
        COALESCE(u.name, 'Rajesh Kumar') as inspector_name,
        u.email as inspector_email
      FROM inspections i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE ${where}
      ORDER BY i.inspection_date DESC, i.id DESC
      LIMIT ? OFFSET ?
    `;
    const rows = sqliteDb.prepare(selectSql).all(...params, limitNum, offset);

    return {
      inspections: rows.map(r => ({
        ...r,
        image_url: r.image_path,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {}),
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      driver: 'sqlite',
    };
  }

  static async getInspectionById(inspectionId) {
    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        const { data: insp, error } = await supabase
          .from('inspections')
          .select('*')
          .eq('inspection_id', inspectionId)
          .single();

        if (!error && insp) {
          const { data: defects } = await supabase
            .from('defects')
            .select('*')
            .eq('inspection_id', inspectionId);

          return {
            ...insp,
            image_path: insp.image_url || insp.image_path,
            image_url: insp.image_url || insp.image_path,
            metadata: typeof insp.metadata === 'string' ? JSON.parse(insp.metadata || '{}') : (insp.metadata || {}),
            defects: defects || [],
            driver: 'supabase',
          };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase inspection detail fallback:', err.message);
      }
    }

    // SQLite Fallback
    const insp = sqliteDb.prepare(`
      SELECT i.*, COALESCE(u.name, 'Rajesh Kumar') as inspector_name, u.email as inspector_email
      FROM inspections i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.inspection_id = ?
    `).get(inspectionId);

    if (!insp) return null;

    const defects = sqliteDb.prepare('SELECT * FROM defects WHERE inspection_id = ?').all(inspectionId);
    return {
      ...insp,
      image_path: insp.image_path,
      image_url: insp.image_path,
      metadata: typeof insp.metadata === 'string' ? JSON.parse(insp.metadata || '{}') : (insp.metadata || {}),
      defects,
      driver: 'sqlite',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  static getDriver() {
    return this.isCloud() ? 'supabase' : 'sqlite';
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MOBILE & ADMIN INSPECTION PERSISTENCE (Single Source of Truth)
  // ───────────────────────────────────────────────────────────────────────────
  static async saveInspection({
    inspectionId,
    fabricType,
    fabricName,
    imagePath,
    defectCount = 0,
    grade = 'B',
    status = 'Passed',
    summary = '',
    recommendedAction = '',
    modelVersion = 'YOLOv8x-Fabric-v4.2.1',
    inspectorName = 'Ananthi Kumar',
    inspectorEmail = '',
    defects = [],
    metadata = null,
  }) {
    const now = new Date().toISOString();
    const cleanGrade = ['A', 'B', 'C'].includes(String(grade).toUpperCase()) ? String(grade).toUpperCase() : 'B';
    const cleanStatus = ['Passed', 'Review', 'Failed'].includes(status) ? status : (cleanGrade === 'A' ? 'Passed' : cleanGrade === 'B' ? 'Review' : 'Failed');

    // Build rich storage and inspection metadata
    const cleanMetadata = {
      storage_bucket: metadata?.storage_bucket || 'fabric-images',
      storage_path: metadata?.storage_path || (typeof imagePath === 'string' && imagePath.includes('/fabric-images/') ? imagePath.split('/fabric-images/')[1] : null),
      signed_url: metadata?.signed_url || (typeof imagePath === 'string' && imagePath.startsWith('http') ? imagePath : null),
      proxy_url: metadata?.proxy_url || (typeof imagePath === 'string' && imagePath.startsWith('/api/storage') ? imagePath : null),
      mime_type: metadata?.mime_type || 'image/jpeg',
      size_bytes: metadata?.size_bytes || null,
      yolo_annotated: true,
      uploaded_at: now,
      ...(metadata || {}),
    };

    let savedToCloud = false;
    let cloudError = null;

    // 1. Try Supabase Cloud
    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        // Resolve profile UUID if inspector email given
        let userId = null;
        if (inspectorEmail) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', inspectorEmail.toLowerCase())
            .single();
          if (prof) userId = prof.id;
        }

        // Upsert inspection with cloud image_url and jsonb metadata
        const { data: savedInsp, error: inspErr } = await supabase
          .from('inspections')
          .upsert({
            inspection_id: inspectionId,
            user_id: userId,
            inspector_name: inspectorName || 'Ananthi Kumar',
            inspector_email: inspectorEmail || null,
            fabric_type: fabricType,
            fabric_name: fabricName,
            image_url: imagePath,
            defect_count: defectCount,
            grade: cleanGrade,
            status: cleanStatus,
            overall_summary: summary,
            recommended_action: recommendedAction,
            model_version: modelVersion,
            metadata: cleanMetadata,
            updated_at: now,
          }, { onConflict: 'inspection_id' })
          .select()
          .single();

        if (inspErr) {
          cloudError = inspErr.message;
          console.warn('[DatabaseService] Supabase inspection upsert error:', inspErr.message);
        } else if (savedInsp) {
          savedToCloud = true;

          // Delete old defects for this ID to prevent duplicates
          await supabase.from('defects').delete().eq('inspection_id', inspectionId);

          // Insert defects
          if (defects.length > 0) {
            const defectRows = defects.map(d => {
              let sev = d.severity || d.sev || 'Moderate';
              if (sev === 'Minor' || sev === 'low' || sev === 'Low') sev = 'Low';
              else if (sev === 'Critical' || sev === 'High' || sev === 'high') sev = 'Critical';
              else sev = 'Moderate';

              return {
                inspection_id: inspectionId,
                defect_type: d.defect_type || d.type || d.name || 'Other',
                confidence: Number(String(d.confidence || d.conf || 85).replace('%', '')) || 85,
                severity: sev,
                x: Number(d.x || d.box?.left || 0),
                y: Number(d.y || d.box?.top || 0),
                width: Number(d.width || d.box?.width || 20),
                height: Number(d.height || d.box?.height || 20),
                explanation: d.explanation || d.exp || d.whatIsIt || '',
                recommended_action: d.recommended_action || d.act || d.recommendedAction || '',
                created_at: now,
              };
            });
            await supabase.from('defects').insert(defectRows);
          }

          // Register report
          await supabase.from('reports').upsert({
            inspection_id: inspectionId,
            report_number: `REP-${inspectionId}`,
            report_path: `/reports/${inspectionId}.pdf`,
            status: 'Generated',
            created_at: now,
          }, { onConflict: 'report_number' });

          console.log(`[DatabaseService] Inspection ${inspectionId} persisted to Supabase Cloud.`);
        }
      } catch (err) {
        cloudError = err.message;
        console.warn('[DatabaseService] Supabase save inspection failed, maintaining SQLite sync:', err.message);
      }
    }

    // 2. Always maintain local SQLite sync as dual-resilience backup
    const existing = sqliteDb.prepare('SELECT id FROM inspections WHERE inspection_id = ?').get(inspectionId);
    let userId = 1;
    if (inspectorEmail) {
      const u = sqliteDb.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(inspectorEmail.toLowerCase());
      if (u) userId = u.id;
    }

    const metadataStr = JSON.stringify(cleanMetadata);

    if (!existing) {
      sqliteDb.prepare(`
        INSERT INTO inspections (
          inspection_id, user_id, fabric_type, fabric_name, image_path,
          inspection_date, defect_count, grade, status, overall_summary,
          recommended_action, model_version, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        inspectionId, userId, fabricType, fabricName, imagePath,
        now, defectCount, cleanGrade, cleanStatus, summary,
        recommendedAction, modelVersion, metadataStr, now, now
      );

      // Defects
      const insertDefect = sqliteDb.prepare(`
        INSERT INTO defects (
          inspection_id, defect_type, confidence, severity, x, y, width, height,
          explanation, recommended_action, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const d of defects) {
        insertDefect.run(
          inspectionId,
          d.defect_type || d.type || d.name || 'Other',
          Number(String(d.confidence || d.conf || 85).replace('%', '')) || 85,
          d.severity || d.sev || 'Moderate',
          Number(d.x || d.box?.left || 0),
          Number(d.y || d.box?.top || 0),
          Number(d.width || d.box?.width || 20),
          Number(d.height || d.box?.height || 20),
          d.explanation || d.exp || d.whatIsIt || '',
          d.recommended_action || d.act || d.recommendedAction || '',
          now
        );
      }

      // Report
      sqliteDb.prepare(`
        INSERT OR IGNORE INTO reports (inspection_id, report_number, report_path, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        inspectionId,
        `REP-${inspectionId}`,
        `/reports/${inspectionId}.pdf`,
        'Generated',
        now
      );
    } else {
      sqliteDb.prepare(`
        UPDATE inspections SET
          fabric_type = ?, fabric_name = ?, image_path = ?, defect_count = ?,
          grade = ?, status = ?, overall_summary = ?, recommended_action = ?,
          model_version = ?, metadata = ?, updated_at = ?
        WHERE inspection_id = ?
      `).run(
        fabricType, fabricName, imagePath, defectCount,
        cleanGrade, cleanStatus, summary, recommendedAction,
        modelVersion, metadataStr, now, inspectionId
      );
    }

    return {
      success: true,
      inspection_id: inspectionId,
      inspectionId,
      grade: cleanGrade,
      status: cleanStatus,
      defect_count: defectCount,
      driver: savedToCloud ? 'supabase' : 'sqlite',
      cloudSync: savedToCloud,
      warning: cloudError,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DEFECTS
  // ───────────────────────────────────────────────────────────────────────────
  static async getDefects({ defectType = '', severity = '', page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        let query = supabase.from('defects').select('*, inspections!inner(fabric_type, fabric_name, grade, status, inspection_date)', { count: 'exact' });

        if (defectType && defectType !== 'all') {
          query = query.eq('defect_type', defectType);
        }
        if (severity && severity !== 'all') {
          query = query.eq('severity', severity);
        }

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limitNum - 1);

        if (!error && data) {
          const records = data.map(d => ({
            id: d.id,
            inspection_id: d.inspection_id,
            defect_type: d.defect_type,
            confidence: Number(d.confidence),
            severity: d.severity,
            x: Number(d.x),
            y: Number(d.y),
            width: Number(d.width),
            height: Number(d.height),
            explanation: d.explanation,
            recommended_action: d.recommended_action,
            created_at: d.created_at,
            fabric_type: d.inspections?.fabric_type,
            fabric_name: d.inspections?.fabric_name,
            grade: d.inspections?.grade,
            inspection_status: d.inspections?.status,
            inspection_date: d.inspections?.inspection_date,
          }));

          return {
            data: records,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: count || 0,
              totalPages: Math.ceil((count || 0) / limitNum) || 1,
            },
            driver: 'supabase',
          };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase getDefects fallback:', err.message);
      }
    }

    // SQLite Fallback
    const conditions = ['1=1'];
    const params = [];
    if (defectType && defectType !== 'all') {
      conditions.push('d.defect_type = ?');
      params.push(defectType);
    }
    if (severity && severity !== 'all') {
      conditions.push('d.severity = ?');
      params.push(severity);
    }
    const whereClause = conditions.join(' AND ');
    const countSql = `SELECT COUNT(*) as total FROM defects d WHERE ${whereClause}`;
    const total = sqliteDb.prepare(countSql).get(...params).total;

    const listSql = `
      SELECT
        d.*,
        i.fabric_type,
        i.fabric_name,
        i.grade,
        i.status as inspection_status,
        i.inspection_date
      FROM defects d
      JOIN inspections i ON d.inspection_id = i.inspection_id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT ? OFFSET ?
    `;
    const records = sqliteDb.prepare(listSql).all(...params, limitNum, offset);

    return {
      data: records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      driver: 'sqlite',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REPORTS
  // ───────────────────────────────────────────────────────────────────────────
  static async getReports(filters = {}) {
    const { search = '', dateFrom = '', dateTo = '', fabricType = '', grade = '', inspector = '', user = '' } = filters;

    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        let query = supabase.from('reports').select('*, inspections!inner(*)', { count: 'exact' });
        if (search.trim()) {
          query = query.or(`report_number.ilike.%${search.trim()}%,inspection_id.ilike.%${search.trim()}%`);
        }
        if (grade && grade !== 'all') {
          query = query.eq('inspections.grade', grade.toUpperCase());
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          const mapped = data.map(r => ({
            report_id: r.id,
            report_number: r.report_number,
            report_path: r.report_path,
            report_status: r.status,
            generated_at: r.created_at,
            inspection_pk: r.inspections?.id,
            inspection_id: r.inspection_id,
            fabric_type: r.inspections?.fabric_type,
            fabric_name: r.inspections?.fabric_name,
            image_path: r.inspections?.image_url,
            inspection_date: r.inspections?.inspection_date,
            defect_count: r.inspections?.defect_count,
            grade: r.inspections?.grade,
            status: r.inspections?.status,
            inspector_name: r.inspections?.inspector_name || 'Rajesh Kumar',
            inspector_email: r.inspections?.inspector_email || '',
          }));
          return { data: mapped, driver: 'supabase' };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase getReports fallback:', err.message);
      }
    }

    // SQLite Fallback
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
        COALESCE(u.name, 'Rajesh Kumar') as inspector_name,
        u.email as inspector_email
      FROM reports r
      JOIN inspections i ON r.inspection_id = i.inspection_id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC, r.id DESC
    `;
    const reports = sqliteDb.prepare(sql).all(...params);
    return { data: reports, driver: 'sqlite' };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // USERS & PROFILES
  // ───────────────────────────────────────────────────────────────────────────
  static async getUsers({ search = '', role = '', status = '' }) {
    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        let query = supabase.from('profiles').select('*');
        if (search.trim()) {
          query = query.or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
        }
        if (role && role !== 'all') {
          query = query.eq('role', role.toLowerCase());
        }
        if (status && status !== 'all') {
          const normStatus = status.toLowerCase().includes('active') && !status.toLowerCase().includes('inactive') ? 'active' : status.toLowerCase();
          query = query.eq('status', normStatus);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          return { users: data, driver: 'supabase' };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase getUsers fallback:', err.message);
      }
    }

    // SQLite Fallback
    const conditions = ['1=1'];
    const params = [];
    if (search.trim()) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (role && role !== 'all') {
      conditions.push('LOWER(u.role) = LOWER(?)');
      params.push(role);
    }
    if (status && status !== 'all') {
      const normStatus = status.toLowerCase().includes('active') && !status.toLowerCase().includes('inactive') ? 'active' : status.toLowerCase();
      conditions.push('LOWER(u.status) = LOWER(?)');
      params.push(normStatus);
    }

    const sql = `
      SELECT u.*, COUNT(i.id) as inspection_count
      FROM users u
      LEFT JOIN inspections i ON u.id = i.user_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY u.id
      ORDER BY
        CASE LOWER(u.email)
          WHEN 'aarav.sharma@petrosoft.in' THEN 1
          WHEN 'priya.patel@petrosoft.in' THEN 2
          WHEN 'amit.kumar@petrosoft.in' THEN 3
          WHEN 'kiran.rao@petrosoft.in' THEN 4
          WHEN 'vikram.m@petrosoft.in' THEN 5
          WHEN 'sunita.reddy@petrosoft.in' THEN 6
          ELSE 7
        END,
        u.id ASC
    `;
    const users = sqliteDb.prepare(sql).all(...params);
    return { users, driver: 'sqlite' };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DEFECT ANALYTICS
  // ───────────────────────────────────────────────────────────────────────────
  static async getDefectAnalytics() {
    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        const { data: defects, error: defErr } = await supabase
          .from('defects')
          .select('id, defect_type, severity, confidence, inspection_id, created_at');

        const { data: inspections, error: inspErr } = await supabase
          .from('inspections')
          .select('id, inspection_id, fabric_name, fabric_type, grade, status');

        if (!defErr && defects && !inspErr && inspections) {
          const totalAnomalies = defects.length;
          const totalInspections = inspections.length;

          const typeCounts = {};
          defects.forEach(d => {
            const t = d.defect_type || 'Other';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
          });

          const colors = ['#dc2626', '#ea580c', '#16806e', '#2563eb', '#9333ea', '#64748b'];
          const occurrencesByType = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count], idx) => ({
              type,
              count,
              color: colors[idx % colors.length],
              pct: totalAnomalies > 0 ? Math.round((count / totalAnomalies) * 100) : 0,
            }));

          const sevCounts = { 'Critical': 0, 'Moderate': 0, 'Low': 0 };
          defects.forEach(d => {
            const s = d.severity === 'Critical' ? 'Critical' : (d.severity === 'Moderate' ? 'Moderate' : 'Low');
            sevCounts[s] = (sevCounts[s] || 0) + 1;
          });

          const severityClassification = [
            { severity: 'High / Critical', count: sevCounts['Critical'], percentage: totalAnomalies > 0 ? `${Math.round((sevCounts['Critical'] / totalAnomalies) * 100)}%` : '0%', color: '#dc2626' },
            { severity: 'Moderate', count: sevCounts['Moderate'], percentage: totalAnomalies > 0 ? `${Math.round((sevCounts['Moderate'] / totalAnomalies) * 100)}%` : '0%', color: '#ea580c' },
            { severity: 'Minor anomalies', count: sevCounts['Low'], percentage: totalAnomalies > 0 ? `${Math.round((sevCounts['Low'] / totalAnomalies) * 100)}%` : '0%', color: '#16806e' },
          ];

          const topType = occurrencesByType[0] || { type: 'None', count: 0, pct: 0 };
          const avgConf = totalAnomalies > 0
            ? (defects.reduce((acc, d) => acc + (d.confidence || 0), 0) / totalAnomalies).toFixed(1)
            : '0';

          const inspMap = {};
          inspections.forEach(i => { inspMap[i.inspection_id] = i; });

          const categoryDetails = occurrencesByType.map(t => {
            const matchingDefects = defects.filter(d => (d.defect_type || '') === t.type);
            const fabricCount = {};
            let worstGrade = 'A';
            matchingDefects.forEach(d => {
              const i = inspMap[d.inspection_id];
              if (i) {
                const fName = i.fabric_name || i.fabric_type || 'Standard Weave';
                fabricCount[fName] = (fabricCount[fName] || 0) + 1;
                if (i.grade === 'C') worstGrade = 'C';
                else if (i.grade === 'B' && worstGrade !== 'C') worstGrade = 'B';
              }
            });
            const topFabric = Object.entries(fabricCount).sort((a,b) => b[1]-a[1])[0]?.[0] || 'Handloom Weave';

            return {
              category: t.type,
              occurrences: t.count,
              shareRate: `${t.pct}%`,
              commonFabricType: topFabric,
              qualityImpact: worstGrade === 'C' ? 'Grade C downgrade' : (worstGrade === 'B' ? 'Grade B downgrade' : 'Minimal impact'),
              impactColor: worstGrade === 'C' ? '#dc2626' : (worstGrade === 'B' ? '#ea580c' : '#16806e'),
            };
          });

          return {
            kpis: {
              totalAnomalies,
              totalInspections,
              classificationCategories: occurrencesByType.length,
              primaryContributor: topType.type,
              primaryContributorSub: `${topType.pct}% of all defect occurrences`,
              averageSeverity: sevCounts['Critical'] > sevCounts['Moderate'] ? 'Critical' : (sevCounts['Moderate'] > 0 ? 'Moderate' : 'Low'),
              averageSeveritySub: `Avg confidence of ${avgConf}%`,
            },
            occurrencesByType,
            severityClassification,
            categoryDetails,
            driver: 'supabase',
          };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase defect analytics fallback:', err.message);
      }
    }

    // SQLite Fallback
    const totalAnomalies = sqliteDb.prepare('SELECT COUNT(*) as count FROM defects').get().count;
    const totalInspections = sqliteDb.prepare('SELECT COUNT(*) as count FROM inspections').get().count;

    const occurrencesRaw = sqliteDb.prepare(`
      SELECT defect_type as type, COUNT(*) as count
      FROM defects
      GROUP BY defect_type
      ORDER BY count DESC
    `).all();

    const colors = ['#dc2626', '#ea580c', '#16806e', '#2563eb', '#9333ea', '#64748b'];
    const occurrencesByType = occurrencesRaw.map((o, idx) => ({
      type: o.type,
      count: o.count,
      color: colors[idx % colors.length],
      pct: totalAnomalies > 0 ? Math.round((o.count / totalAnomalies) * 100) : 0,
    }));

    const sevCountsRaw = sqliteDb.prepare(`
      SELECT
        SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'Moderate' THEN 1 ELSE 0 END) as moderate,
        SUM(CASE WHEN severity NOT IN ('Critical', 'Moderate') THEN 1 ELSE 0 END) as low
      FROM defects
    `).get();

    const critCount = sevCountsRaw?.critical || 0;
    const modCount = sevCountsRaw?.moderate || 0;
    const lowCount = sevCountsRaw?.low || 0;

    const severityClassification = [
      { severity: 'High / Critical', count: critCount, percentage: totalAnomalies > 0 ? `${Math.round((critCount / totalAnomalies) * 100)}%` : '0%', color: '#dc2626' },
      { severity: 'Moderate', count: modCount, percentage: totalAnomalies > 0 ? `${Math.round((modCount / totalAnomalies) * 100)}%` : '0%', color: '#ea580c' },
      { severity: 'Minor anomalies', count: lowCount, percentage: totalAnomalies > 0 ? `${Math.round((lowCount / totalAnomalies) * 100)}%` : '0%', color: '#16806e' },
    ];

    const topType = occurrencesByType[0] || { type: 'None', count: 0, pct: 0 };
    const avgConf = sqliteDb.prepare('SELECT ROUND(AVG(confidence), 1) as avg FROM defects').get()?.avg || '0';

    const categoryDetailsRaw = sqliteDb.prepare(`
      SELECT
        d.defect_type as category,
        COUNT(d.id) as occurrences,
        ROUND((COUNT(d.id) * 100.0) / ?, 1) as shareRateNum,
        (
          SELECT COALESCE(i2.fabric_name, i2.fabric_type)
          FROM defects d2
          JOIN inspections i2 ON d2.inspection_id = i2.inspection_id
          WHERE d2.defect_type = d.defect_type
          GROUP BY COALESCE(i2.fabric_name, i2.fabric_type)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as commonFabricType,
        CASE
          WHEN SUM(CASE WHEN d.severity = 'Critical' THEN 1 ELSE 0 END) > 0 THEN 'Grade C downgrade'
          WHEN SUM(CASE WHEN d.severity = 'Moderate' THEN 1 ELSE 0 END) > 0 THEN 'Grade B downgrade'
          ELSE 'Minimal impact'
        END as qualityImpact,
        CASE
          WHEN SUM(CASE WHEN d.severity = 'Critical' THEN 1 ELSE 0 END) > 0 THEN '#dc2626'
          WHEN SUM(CASE WHEN d.severity = 'Moderate' THEN 1 ELSE 0 END) > 0 THEN '#ea580c'
          ELSE '#16806e'
        END as impactColor
      FROM defects d
      GROUP BY d.defect_type
      ORDER BY occurrences DESC
    `).all(totalAnomalies || 1);

    const categoryDetails = categoryDetailsRaw.map(c => ({
      ...c,
      shareRate: `${c.shareRateNum}%`,
    }));

    return {
      kpis: {
        totalAnomalies,
        totalInspections,
        classificationCategories: occurrencesByType.length,
        primaryContributor: topType.type,
        primaryContributorSub: `${topType.pct}% of all defect occurrences`,
        averageSeverity: critCount > modCount ? 'Critical' : (modCount > 0 ? 'Moderate' : 'Low'),
        averageSeveritySub: `Avg confidence of ${avgConf}%`,
      },
      occurrencesByType,
      severityClassification,
      categoryDetails,
      driver: 'sqlite',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // QUALITY ANALYTICS
  // ───────────────────────────────────────────────────────────────────────────
  static async getQualityAnalytics() {
    if (this.isCloud()) {
      const supabase = getSupabaseAdmin();
      try {
        const { data: allInspections, error } = await supabase
          .from('inspections')
          .select('id, inspection_id, grade, status, defect_count, inspection_date, created_at')
          .order('inspection_date', { ascending: false });

        if (!error && allInspections) {
          const totalInspections = allInspections.length;
          const countA = allInspections.filter(i => i.grade === 'A').length;
          const countB = allInspections.filter(i => i.grade === 'B').length;
          const countC = allInspections.filter(i => i.grade === 'C').length;

          const ratioA = totalInspections > 0 ? Math.round((countA / totalInspections) * 100) : 0;
          const ratioB = totalInspections > 0 ? Math.round((countB / totalInspections) * 100) : 0;
          const ratioC = totalInspections > 0 ? Math.round((countC / totalInspections) * 100) : 0;

          const distribution = [
            { grade: 'Grade A', count: countA, ratio: `${ratioA}%`, color: '#16806e', label: 'Premium Export Standard' },
            { grade: 'Grade B', count: countB, ratio: `${ratioB}%`, color: '#d97706', label: 'Minor Tolerance / Review' },
            { grade: 'Grade C', count: countC, ratio: `${ratioC}%`, color: '#dc2626', label: 'Critical Flaw / Rejected' },
          ];

          const now = new Date();
          const monthKeys = [];
          const monthMap = {};
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          for (let m = 5; m >= 0; m--) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${yyyy}-${mm}`;
            monthKeys.push(key);
            monthMap[key] = { month: monthNames[d.getMonth()], rawMonth: key, total: 0, gradeA: 0, gradeB: 0, gradeC: 0 };
          }

          allInspections.forEach(i => {
            const dateStr = (i.inspection_date || i.created_at || '').slice(0, 7);
            if (monthMap[dateStr]) {
              monthMap[dateStr].total++;
              if (i.grade === 'A') monthMap[dateStr].gradeA++;
              else if (i.grade === 'B') monthMap[dateStr].gradeB++;
              else if (i.grade === 'C') monthMap[dateStr].gradeC++;
            }
          });

          const qualityTrends = monthKeys.map(k => {
            const t = monthMap[k];
            const tot = t.total || 1;
            return {
              ...t,
              gradeAPercent: t.total > 0 ? Math.round((t.gradeA / tot) * 100) : 0,
              gradeBPercent: t.total > 0 ? Math.round((t.gradeB / tot) * 100) : 0,
              gradeCPercent: t.total > 0 ? Math.round((t.gradeC / tot) * 100) : 0,
            };
          });

          const defectFreqVsGrade = ['A', 'B', 'C'].map(g => {
            const matches = allInspections.filter(i => i.grade === g);
            const cnt = matches.length;
            const sumDef = matches.reduce((acc, i) => acc + (i.defect_count || 0), 0);
            return {
              grade: g,
              inspectionsCount: cnt,
              avgDefects: cnt > 0 ? Number((sumDef / cnt).toFixed(2)) : 0,
              minDefects: cnt > 0 ? Math.min(...matches.map(i => i.defect_count || 0)) : 0,
              maxDefects: cnt > 0 ? Math.max(...matches.map(i => i.defect_count || 0)) : 0,
            };
          });

          return {
            ratios: {
              gradeA: `${ratioA}%`,
              gradeB: `${ratioB}%`,
              gradeC: `${ratioC}%`,
              gradeAPercent: ratioA,
              gradeBPercent: ratioB,
              gradeCPercent: ratioC,
              gradeACount: countA,
              gradeBCount: countB,
              gradeCCount: countC,
              totalInspections,
            },
            distribution,
            qualityTrends,
            defectFreqVsGrade,
            driver: 'supabase',
          };
        }
      } catch (err) {
        console.warn('[DatabaseService] Supabase quality analytics fallback:', err.message);
      }
    }

    // SQLite Fallback
    const totalInspections = sqliteDb.prepare('SELECT COUNT(*) as count FROM inspections').get().count;
    const gradeCounts = sqliteDb.prepare(`
      SELECT
        SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as countA,
        SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as countB,
        SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as countC
      FROM inspections
    `).get();

    const countA = gradeCounts?.countA || 0;
    const countB = gradeCounts?.countB || 0;
    const countC = gradeCounts?.countC || 0;

    const ratioA = totalInspections > 0 ? Math.round((countA / totalInspections) * 100) : 0;
    const ratioB = totalInspections > 0 ? Math.round((countB / totalInspections) * 100) : 0;
    const ratioC = totalInspections > 0 ? Math.round((countC / totalInspections) * 100) : 0;

    const distribution = [
      { grade: 'Grade A', count: countA, ratio: `${ratioA}%`, color: '#16806e', label: 'Premium Export Standard' },
      { grade: 'Grade B', count: countB, ratio: `${ratioB}%`, color: '#d97706', label: 'Minor Tolerance / Review' },
      { grade: 'Grade C', count: countC, ratio: `${ratioC}%`, color: '#dc2626', label: 'Critical Flaw / Rejected' },
    ];

    const trendsRaw = sqliteDb.prepare(`
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
      const tot = t.total || 1;
      return {
        month: monthNames[monthIdx] || t.month,
        rawMonth: t.month,
        total: t.total,
        gradeA: t.gradeA,
        gradeB: t.gradeB,
        gradeC: t.gradeC,
        gradeAPercent: Math.round((t.gradeA / tot) * 100),
        gradeBPercent: Math.round((t.gradeB / tot) * 100),
        gradeCPercent: Math.round((t.gradeC / tot) * 100),
      };
    });

    const defectFreqVsGrade = sqliteDb.prepare(`
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

    return {
      ratios: {
        gradeA: `${ratioA}%`,
        gradeB: `${ratioB}%`,
        gradeC: `${ratioC}%`,
        gradeAPercent: ratioA,
        gradeBPercent: ratioB,
        gradeCPercent: ratioC,
        gradeACount: countA,
        gradeBCount: countB,
        gradeCCount: countC,
        totalInspections,
      },
      distribution,
      qualityTrends,
      defectFreqVsGrade,
      driver: 'sqlite',
    };
  }
}

export default DatabaseService;
