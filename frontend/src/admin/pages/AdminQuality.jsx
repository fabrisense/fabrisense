import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchQualityAnalytics } from '../../services/adminApi';

export function AdminQuality() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchQualityAnalytics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load quality analytics:', err);
      setError(err.message || 'Unable to retrieve quality analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="loading-box">
        <RefreshCw size={36} className="animate-spin" color="#208c7d" />
        <div>Computing fabric quality grade distribution and yield metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        <span>{error}</span>
        <button onClick={loadData} className="btn-secondary">Retry</button>
      </div>
    );
  }

  const {
    ratios,
    distribution = [],
    qualityTrends = [],
    defectFreqVsGrade = [],
  } = data || {};

  const totalInspections = ratios?.totalInspections || 0;

  // Compute donut slices dynamically from distribution
  let distAccPct = 0;
  const distSlices = (distribution || [])
    .map((d) => {
      const pct = parseFloat(String(d.ratio || '0').replace('%', '')) || 0;
      const start = distAccPct;
      distAccPct += pct;
      return {
        ...d,
        pct,
        startAngle: (start / 100) * 360,
      };
    })
    .filter((d) => d.pct > 0);

  // Dynamic Multi-line Quality Trends (Grade A & Grade B percentages)
  const trendsList = qualityTrends.length > 0 ? qualityTrends : [
    { month: 'Apr', gradeAPercent: 0, gradeBPercent: 0, gradeCPercent: 0 },
    { month: 'May', gradeAPercent: 0, gradeBPercent: 0, gradeCPercent: 0 },
    { month: 'Jun', gradeAPercent: 0, gradeBPercent: 0, gradeCPercent: 0 },
    { month: 'Jul', gradeAPercent: 0, gradeBPercent: 0, gradeCPercent: 0 },
    { month: 'Aug', gradeAPercent: 0, gradeBPercent: 0, gradeCPercent: 0 },
    { month: 'Sep', gradeAPercent: 0, gradeBPercent: 0, gradeCPercent: 0 },
  ];

  const pointsGradeA = trendsList.map((t, idx) => {
    const x = 25 + idx * ((480 - 50) / Math.max(trendsList.length - 1, 1));
    const y = 145 - Math.round(((t.gradeAPercent || 0) / 100) * 115);
    return `${x},${y}`;
  }).join(' ');

  const pointsGradeB = trendsList.map((t, idx) => {
    const x = 25 + idx * ((480 - 50) / Math.max(trendsList.length - 1, 1));
    const y = 145 - Math.round(((t.gradeBPercent || 0) / 100) * 115);
    return `${x},${y}`;
  }).join(' ');

  // Dynamic Scatter Points for Defect Frequency vs Quality Grade
  const scatterPoints = (defectFreqVsGrade || []).map((df) => {
    let x = 300;
    let color = '#16806e';
    if (df.grade === 'C') {
      x = 100 + Math.min(df.avgDefects * 10, 80);
      color = '#dc2626';
    } else if (df.grade === 'B') {
      x = 280 + Math.min(df.avgDefects * 15, 80);
      color = '#d97706';
    } else if (df.grade === 'A') {
      x = 480 + Math.min(df.avgDefects * 10, 80);
      color = '#16806e';
    }
    const y = Math.max(30, Math.min(120, 130 - Math.round((df.avgDefects || 0) * 20)));
    return { ...df, cx: x, cy: y, color };
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── TOP 3 KPI CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* GRADE A RATIO */}
        <div className="admin-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE A RATIO
          </div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {ratios?.gradeA || '0%'}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>
            {ratios?.gradeACount ?? 0} Clean Batches
          </div>
        </div>

        {/* GRADE B RATIO */}
        <div className="admin-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE B RATIO
          </div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {ratios?.gradeB || '0%'}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#d97706' }}>
            {ratios?.gradeBCount ?? 0} Minor Defects
          </div>
        </div>

        {/* GRADE C RATIO */}
        <div className="admin-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE C RATIO
          </div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {ratios?.gradeC || '0%'}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>
            {ratios?.gradeCCount ?? 0} Rejected Batches
          </div>
        </div>
      </div>

      {/* ── ROW 2: QUALITY GRADE DISTRIBUTION & QUALITY TREND OVER 6 MONTHS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.35fr',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        {/* Quality Grade Distribution (Donut Chart) */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '24px' }}>
            Quality Grade Distribution
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '200px' }}>
            {/* Donut Graphic */}
            <div style={{ position: 'relative', width: '160px', height: '160px' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {distSlices.length === 0 ? (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="15"
                  />
                ) : (
                  distSlices.map((s, idx) => {
                    const strokeDasharray = `${(s.pct / 100) * 251.2} 251.2`;
                    const strokeDashoffset = -((s.startAngle / 360) * 251.2);
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={s.color}
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
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#1f2a44', lineHeight: 1 }}>
                  {totalInspections.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                  Total Rolls
                </div>
              </div>
            </div>

            {/* Dynamic Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {distribution.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>No grade distribution data</div>
              ) : (
                distribution.map((d, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: d.color }} />
                    <span style={{ color: '#334155', minWidth: '80px' }}>{d.grade}</span>
                    <strong style={{ color: '#1f2a44' }}>{d.ratio}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quality Trend over 6 Months (Multi-line Chart) */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44' }}>
              Quality Trend over 6 Months
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: '600' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16806e' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: '#16806e', borderRadius: '2px' }} />
                Grade A %
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: '#d97706', borderRadius: '2px' }} />
                Grade B %
              </span>
            </div>
          </div>

          <div style={{ height: '200px', position: 'relative', width: '100%' }}>
            {/* Grid Lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
              <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
              <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
              <div style={{ borderBottom: '1px solid #e2e8f0', width: '100%' }} />
            </div>

            {/* Dynamic SVG Lines */}
            <svg viewBox="0 0 500 160" preserveAspectRatio="none" style={{ width: '100%', height: '160px', overflow: 'visible' }}>
              {/* Amber Line (Grade B) */}
              <polyline
                points={pointsGradeB}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Green Line (Grade A) */}
              <polyline
                points={pointsGradeA}
                fill="none"
                stroke="#16806e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Dynamic X-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px 0', fontSize: '12px', color: '#94a3b8' }}>
              {trendsList.map((t, idx) => (
                <span key={idx}>{t.month}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: DEFECT FREQUENCY VS. QUALITY SCORE RELATIONSHIP ── */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1f2a44', marginBottom: '24px' }}>
          Defect Frequency vs. Quality Score Relationship
        </div>

        <div style={{ height: '180px', position: 'relative', width: '100%' }}>
          {/* Dashed Grid */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
            <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
            <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
            <div style={{ borderBottom: '1px solid #e2e8f0', width: '100%' }} />
          </div>

          {/* Dynamic Scatter Points */}
          <svg viewBox="0 0 600 140" style={{ width: '100%', height: '140px', overflow: 'visible' }}>
            {scatterPoints.length === 0 ? (
              <text x="300" y="70" textAnchor="middle" fill="#94a3b8" fontSize="13">
                No inspection grade data available
              </text>
            ) : (
              scatterPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.cx}
                  cy={pt.cy}
                  r="6"
                  fill={pt.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                >
                  <title>{`Grade ${pt.grade}: avg ${pt.avgDefects} defects (${pt.inspectionsCount} batches)`}</title>
                </circle>
              ))
            )}
          </svg>

          {/* X-axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px 0', fontSize: '11px', color: '#94a3b8' }}>
            <span>High Defects (Grade C)</span>
            <span>Moderate Defects (Grade B)</span>
            <span>Zero Defects / Clean (Grade A)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminQuality;
