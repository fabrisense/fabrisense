import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { fetchDashboardMetrics } from '../../services/adminApi';
import { subscribeToInspections, subscribeToDefects } from '../../services/supabase';

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());
  const navigate = useNavigate();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardMetrics();
      if (res.success) {
        setData(res.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      if (!silent) {
        setError(err.message || 'Unable to retrieve dashboard metrics from server.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 5-second polling fallback ensures rapid live data synchronization even if Realtime WebSockets are reconnecting
    const pollInterval = setInterval(() => {
      loadData(true);
    }, 5000);

    // Refresh immediately when window or tab regains focus
    const handleFocus = () => loadData(true);
    const handleVisibility = () => {
      if (!document.hidden) loadData(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // Realtime listeners: auto-refresh metrics when mobile or admin records change
    const unsubInspections = subscribeToInspections(() => {
      console.log('[Realtime] Inspection event received, refreshing dashboard metrics.');
      loadData(true);
    });

    const unsubDefects = subscribeToDefects(() => {
      loadData(true);
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubInspections();
      unsubDefects();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-box">
        <RefreshCw size={36} className="animate-spin" color="#208c7d" />
        <div>Loading operations overview and real-time statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        <span>{error}</span>
        <button onClick={loadData} className="btn-secondary" style={{ padding: '4px 10px' }}>
          Retry
        </button>
      </div>
    );
  }

  const { kpis, recentInspections = [], liveDefects = [], trends = [], defectDistribution = [] } = data || {};

  const totalInspectionsCount = kpis?.totalInspections || 0;
  const totalDefectsCount = kpis?.defectsDetected || 0;
  const defectFreeCount = kpis?.defectFree || 0;

  // Real Donut Slices calculated dynamically from defectDistribution
  const donutItems = (defectDistribution || [])
    .map((item) => {
      const count = item.count || 0;
      const pct = totalDefectsCount > 0 ? Math.round((count / totalDefectsCount) * 100) : 0;
      return {
        name: item.name,
        count,
        pct,
        color: item.color || '#64748b',
      };
    })
    .filter((item) => item.count > 0);

  let accPct = 0;
  const donutSlices = donutItems.map((item) => {
    const start = accPct;
    accPct += item.pct;
    return {
      ...item,
      startAngle: (start / 100) * 360,
      angle: (item.pct / 100) * 360,
    };
  });

  // Dynamic 6-Month Inspection Trend Line
  const trendMonths = (trends && trends.length > 0) ? trends : [
    { month: 'Apr', total: 0 },
    { month: 'May', total: 0 },
    { month: 'Jun', total: 0 },
    { month: 'Jul', total: 0 },
    { month: 'Aug', total: 0 },
    { month: 'Sep', total: 0 },
  ];
  const maxTrendTotal = Math.max(...trendMonths.map((t) => t.total || 0), 1);
  const trendPoints = trendMonths.map((t, idx) => {
    const x = 25 + idx * ((480 - 50) / Math.max(trendMonths.length - 1, 1));
    const y = 140 - Math.round(((t.total || 0) / maxTrendTotal) * 110);
    return { x, y, total: t.total || 0, month: t.month };
  });

  let trendPathD = '';
  if (trendPoints.length > 0) {
    trendPathD = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    for (let i = 1; i < trendPoints.length; i++) {
      const prev = trendPoints[i - 1];
      const curr = trendPoints[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      trendPathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── REALTIME & AUTO-SYNC STATUS BAR ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: data?.driver === 'supabase' ? '#ecfdf5' : '#f0f9ff',
              color: data?.driver === 'supabase' ? '#059669' : '#0284c7',
              fontSize: '12px',
              fontWeight: '700',
              border: `1px solid ${data?.driver === 'supabase' ? '#a7f3d0' : '#bae6fd'}`,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: data?.driver === 'supabase' ? '#10b981' : '#0ea5e9',
                boxShadow: '0 0 6px rgba(16,185,129,0.5)',
              }}
            />
            <span>
              {data?.driver === 'supabase'
                ? 'Supabase Cloud PostgreSQL • Realtime Active'
                : 'Local SQLite Fallback • Auto-Polling Active'}
            </span>
          </div>

          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Last synchronized: <strong style={{ color: '#1e293b' }}>{lastUpdated}</strong>
          </span>

          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
            Today: <strong style={{ color: '#1f2a44' }}>{kpis?.inspectionsToday ?? 0}</strong> new inspections completed
          </span>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: '12.5px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          title="Force refresh live metrics from database"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* ── 6 KPI CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* TOTAL INSPECTIONS */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            TOTAL INSPECTIONS
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {totalInspectionsCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#16a34a' }}>
            {kpis?.inspectionsToday ? `${kpis.inspectionsToday} today` : '0 today'} • {totalInspectionsCount > 0 ? 'Live synced' : 'No records'}
          </div>
        </div>

        {/* DEFECTS DETECTED */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            DEFECTS DETECTED
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {totalDefectsCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#dc2626' }}>
            {totalInspectionsCount > 0 ? `${((totalDefectsCount / totalInspectionsCount) * 100).toFixed(1)}% anomaly rate` : '0% anomaly rate'}
          </div>
        </div>

        {/* DEFECT-FREE */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            DEFECT-FREE
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {defectFreeCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#16806e' }}>
            {totalInspectionsCount > 0 ? `${((defectFreeCount / totalInspectionsCount) * 100).toFixed(1)}% clean rate` : '0% clean rate'}
          </div>
        </div>

        {/* GRADE A */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE A
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', margin: '6px 0 2px' }}>
            {kpis?.gradeAPercentage ?? 0}%
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#16a34a' }}>
            {kpis?.gradeACount ?? 0} Batches
          </div>
        </div>

        {/* GRADE B */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE B
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', margin: '6px 0 2px' }}>
            {kpis?.gradeBPercentage ?? 0}%
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#d97706' }}>
            {kpis?.gradeBCount ?? 0} Batches
          </div>
        </div>

        {/* GRADE C */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE C
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', margin: '6px 0 2px' }}>
            {kpis?.gradeCPercentage ?? 0}%
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#dc2626' }}>
            {kpis?.gradeCCount ?? 0} Batches
          </div>
        </div>
      </div>

      {/* ── ROW 2: INSPECTION TRENDS & DEFECT DISTRIBUTION ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        {/* Inspection Trends (6 Months) Line Chart */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '20px' }}>
            Inspection Trends (6 Months)
          </div>

          <div style={{ height: '200px', position: 'relative', width: '100%' }}>
            {/* Horizontal dashed grid lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <div style={{ borderBottom: '1px dashed #e2e8f0', width: '100%' }} />
              <div style={{ borderBottom: '1px dashed #e2e8f0', width: '100%' }} />
              <div style={{ borderBottom: '1px dashed #e2e8f0', width: '100%' }} />
              <div style={{ borderBottom: '1px solid #e2e8f0', width: '100%' }} />
            </div>

            {/* Dynamic Trend Line */}
            <svg viewBox="0 0 500 160" preserveAspectRatio="none" style={{ width: '100%', height: '160px', overflow: 'visible' }}>
              {trendPathD && (
                <path
                  d={trendPathD}
                  fill="none"
                  stroke="#16806e"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
              {trendPoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#16806e"
                  strokeWidth="2.5"
                />
              ))}
            </svg>

            {/* Dynamic X-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px 0', fontSize: '12px', color: '#94a3b8' }}>
              {trendMonths.map((m, idx) => (
                <span key={idx}>{m.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Defect Distribution Donut Chart */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '20px' }}>
            Defect Distribution
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
            {/* Donut graphic */}
            <div style={{ position: 'relative', width: '170px', height: '170px' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {donutSlices.length === 0 ? (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="15"
                  />
                ) : (
                  donutSlices.map((slice, i) => {
                    const strokeDasharray = `${(slice.pct / 100) * 251.2} 251.2`;
                    const strokeDashoffset = -((slice.startAngle / 360) * 251.2);
                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="15"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                  })
                )}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#1f2a44', lineHeight: 1 }}>
                  {totalDefectsCount.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                  Defects
                </div>
              </div>
            </div>

            {/* Dynamic Legend list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {donutItems.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  No defects recorded yet
                </div>
              ) : (
                donutItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: item.color }} />
                    <span style={{ color: '#334155', minWidth: '120px' }}>{item.name}</span>
                    <strong style={{ color: '#1f2a44' }}>{item.pct}%</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: RECENT INSPECTIONS & LIVE DEFECTS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '24px',
        }}
      >
        {/* Recent Inspections Table */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', margin: 0 }}>
              Recent Inspections
            </h3>
            <Link
              to="/admin/inspections"
              style={{ fontSize: '12.5px', fontWeight: '600', color: '#16806e', textDecoration: 'none' }}
            >
              View All
            </Link>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Inspection ID</th>
                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Fabric Type</th>
                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Defects</th>
                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {recentInspections.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                    No recent inspections recorded.
                  </td>
                </tr>
              ) : (
                recentInspections.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '700', color: '#1f2a44' }}>
                      <Link
                        to={`/admin/inspections/${row.inspection_id}`}
                        style={{ color: '#1f2a44', textDecoration: 'none' }}
                      >
                        {row.inspection_id}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#475569' }}>
                      {row.fabric_name || row.fabric_type}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#475569' }}>
                      {row.defect_count}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          backgroundColor:
                            row.grade === 'A' ? '#ecfdf5' : row.grade === 'B' ? '#fffbeb' : '#fef2f2',
                          color:
                            row.grade === 'A' ? '#059669' : row.grade === 'B' ? '#d97706' : '#dc2626',
                        }}
                      >
                        Grade {row.grade}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Live Defects Cards */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '16px' }}>
            Live Defects
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {liveDefects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                No recent defects recorded.
              </div>
            ) : (
              liveDefects.map((def) => {
                const badgeBg =
                  def.severity === 'Critical' ? '#fee2e2' : def.severity === 'Moderate' ? '#fef3c7' : '#fef9c3';
                const badgeColor =
                  def.severity === 'Critical' ? '#dc2626' : def.severity === 'Moderate' ? '#d97706' : '#ca8a04';

                return (
                  <div
                    key={def.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13.5px', color: '#1f2a44' }}>
                        {def.defect_type}
                      </strong>
                      <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                        {def.time_ago}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', margin: '4px 0 8px' }}>
                      <MapPin size={12} color="#94a3b8" />
                      <span>{def.fabric_name}</span>
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: badgeBg,
                          color: badgeColor,
                        }}
                      >
                        {def.severity}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
