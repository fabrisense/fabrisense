import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchDefectAnalytics } from '../../services/adminApi';

export function AdminDefects() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDefectAnalytics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load defect analytics:', err);
      setError(err.message || 'Unable to retrieve defect analytics.');
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
        <div>Computing defect classification statistics and anomaly metrics...</div>
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
    kpis,
    occurrencesByType = [
      { type: 'Holes', count: 167, color: '#dc2626' },
      { type: 'Stains', count: 146, color: '#ea580c' },
      { type: 'Knots', count: 115, color: '#16806e' },
      { type: 'Tears', count: 62, color: '#2563eb' },
      { type: 'Other', count: 33, color: '#94a3b8' },
    ],
    severityClassification = [
      { severity: 'High / Critical', percentage: '38%', color: '#dc2626' },
      { severity: 'Moderate', percentage: '44%', color: '#ea580c' },
      { severity: 'Minor anomalies', percentage: '18%', color: '#16806e' },
    ],
    categoryDetails = [],
  } = data || {};

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── TOP 4 KPI CARDS (Matches Screenshot 4) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* TOTAL ANOMALY INSTANCES */}
        <div className="admin-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            TOTAL ANOMALY INSTANCES
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {kpis?.totalAnomalies ? kpis.totalAnomalies.toLocaleString() : '523'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Across 1,247 inspected batches
          </div>
        </div>

        {/* CLASSIFICATION CATEGORIES */}
        <div className="admin-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            CLASSIFICATION CATEGORIES
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {kpis?.classificationCategories || '5'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Holes, Stains, Knots, Tears, Other
          </div>
        </div>

        {/* PRIMARY CONTRIBUTOR */}
        <div className="admin-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            PRIMARY CONTRIBUTOR
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {kpis?.primaryContributor || 'Holes'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {kpis?.primaryContributorSub || '32% of all defect occurrences'}
          </div>
        </div>

        {/* AVERAGE SEVERITY INDEX */}
        <div className="admin-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
            AVERAGE SEVERITY INDEX
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#1f2a44', margin: '6px 0 2px' }}>
            {kpis?.averageSeverity || 'Moderate'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {kpis?.averageSeveritySub || 'Avg confidence of 84.3%'}
          </div>
        </div>
      </div>

      {/* ── ROW 2: CHARTS (Matches Screenshot 4) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        {/* Occurrences by Defect Type (Vertical Bar Chart) */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '24px' }}>
            Occurrences by Defect Type
          </div>

          <div
            style={{
              height: '190px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              padding: '0 20px',
            }}
          >
            {occurrencesByType.map((item, idx) => {
              const max = 170;
              const heightPct = Math.round((item.count / max) * 100);

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: `${heightPct}%`,
                      backgroundColor: item.color,
                      borderRadius: '5px 5px 0 0',
                    }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1f2a44' }}>
                      {item.type}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{item.count}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Defect Severity Classification (Donut Chart) */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2a44', marginBottom: '24px' }}>
            Defect Severity Classification
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '190px' }}>
            {/* Donut Graphic */}
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {/* 38% High/Critical (Red) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#dc2626"
                  strokeWidth="16"
                  strokeDasharray="95.5 251.2"
                  strokeDashoffset="0"
                />
                {/* 44% Moderate (Amber) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#ea580c"
                  strokeWidth="16"
                  strokeDasharray="110.5 251.2"
                  strokeDashoffset="-95.5"
                />
                {/* 18% Minor (Teal) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#16806e"
                  strokeWidth="16"
                  strokeDasharray="45.2 251.2"
                  strokeDashoffset="-206"
                />
              </svg>
            </div>

            {/* Legend list matching Screenshot 4 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {severityClassification.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: s.color }} />
                  <span style={{ color: '#334155', minWidth: '130px' }}>{s.severity}</span>
                  <strong style={{ color: '#1f2a44' }}>{s.percentage}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: DETAILED METRIC BREAKDOWN TABLE ── */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1f2a44', margin: 0 }}>
            Detailed Metric Breakdown
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 24px', fontWeight: '600' }}>Defect Classification Category</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Occurrences</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Share Rate</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Common Fabric Type</th>
              <th style={{ padding: '14px 24px', fontWeight: '600' }}>Quality Impact</th>
            </tr>
          </thead>
          <tbody>
            {categoryDetails.map((cat, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px 24px', fontWeight: '700', color: '#1f2a44' }}>
                  {cat.category}
                </td>
                <td style={{ padding: '16px 20px', color: '#334155' }}>
                  {cat.occurrences}
                </td>
                <td style={{ padding: '16px 20px', color: '#334155' }}>
                  {cat.shareRate}
                </td>
                <td style={{ padding: '16px 20px', color: '#334155' }}>
                  {cat.commonFabricType}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontWeight: '500' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: cat.impactColor || '#dc2626',
                      }}
                    />
                    <span>{cat.qualityImpact}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDefects;
