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

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── TOP 3 KPI CARDS (Matches Screenshot 5) ── */}
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
            58%
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>
            723 Clean Batches
          </div>
        </div>

        {/* GRADE B RATIO */}
        <div className="admin-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE B RATIO
          </div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            31%
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#d97706' }}>
            386 Minor Defects
          </div>
        </div>

        {/* GRADE C RATIO */}
        <div className="admin-card" style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            GRADE C RATIO
          </div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            11%
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>
            138 Rejected Batches
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
                {/* 58% Grade A (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#16806e"
                  strokeWidth="15"
                  strokeDasharray="145.7 251.2"
                  strokeDashoffset="0"
                />
                {/* 31% Grade B (Amber) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#d97706"
                  strokeWidth="15"
                  strokeDasharray="77.9 251.2"
                  strokeDashoffset="-145.7"
                />
                {/* 11% Grade C (Red) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#dc2626"
                  strokeWidth="15"
                  strokeDasharray="27.6 251.2"
                  strokeDashoffset="-223.6"
                />
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
                  1,247
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                  Total Rolls
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#16806e' }} />
                <span style={{ color: '#334155', minWidth: '80px' }}>Grade A</span>
                <strong style={{ color: '#1f2a44' }}>58%</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#d97706' }} />
                <span style={{ color: '#334155', minWidth: '80px' }}>Grade B</span>
                <strong style={{ color: '#1f2a44' }}>31%</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#dc2626' }} />
                <span style={{ color: '#334155', minWidth: '80px' }}>Grade C</span>
                <strong style={{ color: '#1f2a44' }}>11%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Trend over 6 Months (Multi-line Chart) */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '20px' }}>
            Quality Trend over 6 Months
          </div>

          <div style={{ height: '200px', position: 'relative', width: '100%' }}>
            {/* Grid Lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
              <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
              <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
              <div style={{ borderBottom: '1px solid #e2e8f0', width: '100%' }} />
            </div>

            {/* SVG Lines matching Screenshot 5 */}
            <svg viewBox="0 0 500 160" preserveAspectRatio="none" style={{ width: '100%', height: '160px', overflow: 'visible' }}>
              {/* Amber Line (Grade B) */}
              <polyline
                points="10,60 90,65 170,55 250,85 330,68 410,65"
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Green Line (Grade A) */}
              <polyline
                points="10,95 90,75 170,90 250,55 330,70 410,25"
                fill="none"
                stroke="#16806e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
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
      </div>

      {/* ── ROW 3: DEFECT FREQUENCY VS. QUALITY SCORE RELATIONSHIP (Matches Screenshot 5) ── */}
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

          {/* Scatter Points (Exact positioning from Screenshot 5) */}
          <svg viewBox="0 0 600 140" style={{ width: '100%', height: '140px', overflow: 'visible' }}>
            {/* Red Dot (High defect, Grade C) */}
            <circle cx="65" cy="30" r="5" fill="#dc2626" />

            {/* Amber Dots */}
            <circle cx="120" cy="50" r="5" fill="#d97706" />
            <circle cx="170" cy="40" r="5" fill="#d97706" />

            {/* Green Dots */}
            <circle cx="220" cy="90" r="5" fill="#16806e" />
            <circle cx="300" cy="100" r="5" fill="#16806e" />
            <circle cx="380" cy="70" r="5" fill="#16806e" />
            <circle cx="440" cy="110" r="5" fill="#16806e" />

            {/* Amber Dot */}
            <circle cx="530" cy="75" r="5" fill="#d97706" />

            {/* Optimal Green Dot */}
            <circle cx="620" cy="100" r="5" fill="#16806e" />
          </svg>

          {/* X-axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px 0', fontSize: '11px', color: '#94a3b8' }}>
            <span>High Defects (Low Score)</span>
            <span>Optimal / Clean (High Score)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminQuality;
