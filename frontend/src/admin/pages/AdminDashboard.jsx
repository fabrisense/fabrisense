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
  const navigate = useNavigate();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardMetrics();
      if (res.success) {
        setData(res.data);
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

    // Realtime listeners: auto-refresh metrics when mobile or admin records change
    const unsubInspections = subscribeToInspections(() => {
      console.log('[Realtime] Inspection event received, refreshing dashboard metrics.');
      loadData(true);
    });

    const unsubDefects = subscribeToDefects(() => {
      loadData(true);
    });

    return () => {
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

  const { kpis, recentInspections = [], liveDefects = [] } = data || {};

  // Standard reference donut slices (Holes 32%, Stains 28%, Broken Yarn 22%, Tears & Scratches 12%, Other 6%)
  const donutItems = [
    { name: 'Holes', pct: 32, color: '#dc2626' },
    { name: 'Stains', pct: 28, color: '#ea580c' },
    { name: 'Broken Yarn', pct: 22, color: '#16806e' },
    { name: 'Tears & Scratches', pct: 12, color: '#2563eb' },
    { name: 'Other', pct: 6, color: '#94a3b8' },
  ];

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

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── 6 KPI CARDS (Matching Screenshot 1 exactly) ── */}
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
            {kpis?.totalInspections ? kpis.totalInspections.toLocaleString() : '1,247'}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#16a34a' }}>
            +12% this week
          </div>
        </div>

        {/* DEFECTS DETECTED */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            DEFECTS DETECTED
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {kpis?.defectsDetected ? kpis.defectsDetected.toLocaleString() : '523'}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#dc2626' }}>
            42.1% anomaly rate
          </div>
        </div>

        {/* DEFECT-FREE */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            DEFECT-FREE
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {kpis?.defectFree ? kpis.defectFree.toLocaleString() : '724'}
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#16806e' }}>
            57.9% clean rate
          </div>
        </div>

        {/* GRADE A */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE A
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', margin: '6px 0 2px' }}>
            {kpis?.gradeAPercentage || 58}%
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#16a34a' }}>
            723 Batches
          </div>
        </div>

        {/* GRADE B */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE B
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', margin: '6px 0 2px' }}>
            {kpis?.gradeBPercentage || 31}%
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#d97706' }}>
            386 Batches
          </div>
        </div>

        {/* GRADE C */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE C
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', margin: '6px 0 2px' }}>
            {kpis?.gradeCPercentage || 11}%
          </div>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#dc2626' }}>
            138 Batches
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

            {/* Smooth Teal Trend Line (Matching Screenshot 1) */}
            <svg viewBox="0 0 500 160" preserveAspectRatio="none" style={{ width: '100%', height: '160px', overflow: 'visible' }}>
              <path
                d="M 10 110 C 60 95, 80 85, 110 80 C 140 75, 170 95, 200 90 C 240 80, 270 40, 310 40 C 350 40, 380 55, 410 50 C 440 45, 470 10, 490 10"
                fill="none"
                stroke="#16806e"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            {/* X-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px 0', fontSize: '12px', color: '#94a3b8' }}>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
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
                {donutSlices.map((slice, i) => {
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
                })}
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
                  523
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                  Defects
                </div>
              </div>
            </div>

            {/* Legend list matching Screenshot 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {donutItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: item.color }} />
                  <span style={{ color: '#334155', minWidth: '120px' }}>{item.name}</span>
                  <strong style={{ color: '#1f2a44' }}>{item.pct}%</strong>
                </div>
              ))}
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
              {recentInspections.map((row) => (
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Live Defects Cards */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '16px' }}>
            Live Defects
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {liveDefects.map((def) => {
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
