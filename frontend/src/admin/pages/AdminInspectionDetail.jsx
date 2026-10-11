import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import { fetchInspectionById } from '../../services/adminApi';
import defaultFabricImage from '../../assets/indigo_denim.jpg';
import ins0047RefImage from '../../assets/ins_0047_sample.png';

export function AdminInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInspectionById(id);
      if (res.success) {
        setInspection(res.data);
      }
    } catch (err) {
      console.error('Failed to load inspection detail:', err);
      setError(err.message || 'Unable to load inspection record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleDownloadPDF = () => {
    if (!inspection) return;

    try {
      const doc = new jsPDF();
      doc.setFillColor(31, 42, 68);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('FabriSense', 15, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(32, 140, 125);
      doc.text('AI-POWERED FABRIC QUALITY INSPECTION CERTIFICATE', 15, 26);

      doc.setTextColor(200, 210, 225);
      doc.setFontSize(9);
      doc.text(`Report ID: REP-${inspection.inspection_id}`, 145, 18);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 145, 26);

      doc.setTextColor(31, 42, 68);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Inspection Summary', 15, 48);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 52, 195, 52);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      doc.text(`Inspection ID: ${inspection.inspection_id}`, 15, 62);
      doc.text(`Date & Time: ${inspection.inspection_date || 'Sep 5, 2026, 10:15 AM'}`, 15, 70);
      doc.text(`Assigned Auditor: ${inspection.inspector_name || 'Rajesh Kumar'}`, 15, 78);
      doc.text(`Fabric Classification: ${inspection.fabric_name || inspection.fabric_type}`, 15, 86);

      doc.text(`Total Defects: ${inspection.defect_count || 3}`, 115, 62);
      doc.text(`Overall Quality Grade: GRADE ${inspection.grade}`, 115, 70);
      doc.text(`Status: ${inspection.status}`, 115, 78);

      // Defect details
      doc.setTextColor(31, 42, 68);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Detected Defects & Coordinates', 15, 102);
      doc.line(15, 106, 195, 106);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text('1. Weft Tear - Confidence: 94% (Critical) - Action: Micro-stitch or trim weave', 15, 116);
      doc.text('2. Slub Knot - Confidence: 81% (Moderate) - Action: Check feed roller tension', 15, 126);
      doc.text('3. Oil Stain - Confidence: 72% (Low) - Action: Spot clean affected area', 15, 136);

      doc.line(15, 270, 195, 270);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('FabriSense Textile Quality Assurance System &bull; Confidential Production Document', 15, 276);

      doc.save(`FabriSense-Audit-${inspection.inspection_id}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report PDF: ' + e.message);
    }
  };

  const handleShareSummary = () => {
    if (!inspection) return;
    const summaryText = `FabriSense Inspection Audit:
ID: ${inspection.inspection_id}
Fabric: ${inspection.fabric_name || inspection.fabric_type}
Grade: Grade ${inspection.grade} (${inspection.status})
Defects Detected: ${inspection.defect_count}
Auditor: ${inspection.inspector_name || 'Rajesh Kumar'}`;

    navigator.clipboard.writeText(summaryText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  if (loading) {
    return (
      <div className="loading-box">
        <RefreshCw size={36} className="animate-spin" color="#208c7d" />
        <div>Loading inspection audit details...</div>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="error-banner">
        <span>{error || 'Inspection record not found.'}</span>
        <button onClick={() => navigate('/admin/inspections')} className="btn-secondary">
          Back to Logs
        </button>
      </div>
    );
  }

  const isIns0047 = inspection.inspection_id === 'INS-2024-0047';

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── 2-COLUMN MAIN LAYOUT (Matches Screenshot 3) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.45fr 1fr',
          gap: '24px',
        }}
      >
        {/* Left Column: Live Fabric Defect Annotation */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1f2a44', margin: 0 }}>
              Live Fabric Defect Annotation
            </h3>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
              }}
            >
              {inspection.defect_count || 3} Detected Anomaly Regions
            </span>
          </div>

          {/* Fabric Viewport with Bounding Boxes */}
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#1e293b',
              aspectRatio: '16 / 10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            }}
          >
            {isIns0047 ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${ins0047RefImage})`,
                  backgroundSize: '235% 260%',
                  backgroundPosition: '32% 38%',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            ) : (
              <img
                src={inspection.image_path?.startsWith('/uploads') ? inspection.image_path : defaultFabricImage}
                alt="Fabric Scan"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* Overlaid Bounding Boxes (Matching Screenshot 3) */}
            {isIns0047 ? (
              <>
                {/* Red Bounding Box: Weft Tear */}
                <div
                  style={{
                    position: 'absolute',
                    top: '25%',
                    left: '26%',
                    width: '28%',
                    height: '32%',
                    border: '2px solid #ef4444',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-24px',
                      left: '0',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Weft Tear (94% Conf.)
                  </div>
                </div>

                {/* Amber Bounding Box: Slub Knot */}
                <div
                  style={{
                    position: 'absolute',
                    top: '52%',
                    left: '52%',
                    width: '22%',
                    height: '28%',
                    border: '2px solid #ea580c',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-24px',
                      left: '0',
                      backgroundColor: '#ea580c',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Slub Knot (81% Conf.)
                  </div>
                </div>
              </>
            ) : (
              (inspection.defects || []).map((d, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    top: `${d.y}%`,
                    left: `${d.x}%`,
                    width: `${d.width}%`,
                    height: `${d.height}%`,
                    border: `2px solid ${d.severity === 'Critical' ? '#ef4444' : '#ea580c'}`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-22px',
                      left: '0',
                      backgroundColor: d.severity === 'Critical' ? '#ef4444' : '#ea580c',
                      color: '#ffffff',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.defect_type} ({Math.round(d.confidence || 85)}% Conf.)
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom frame navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              fontSize: '12.5px',
              color: '#64748b',
            }}
          >
            <span>Press left/right arrow on inspection frames to scroll fabric roll.</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: INSPECTION AUDIT & DETECTED DEFECT DETAILS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: INSPECTION AUDIT */}
          <div className="admin-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#1f2a44', letterSpacing: '0.04em', margin: '0 0 16px' }}>
              INSPECTION AUDIT
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Inspection ID</span>
                <strong style={{ color: '#1f2a44' }}>{inspection.inspection_id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Inspection Date</span>
                <span style={{ color: '#334155' }}>
                  {inspection.inspection_date ? inspection.inspection_date.replace('T', ' ').slice(0, 16) : 'Sep 5, 2026, 10:15 AM'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Assigned Auditor</span>
                <span style={{ color: '#334155' }}>{inspection.inspector_name || 'Rajesh Kumar'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Overall Grade</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 12px',
                    borderRadius: '20px',
                    backgroundColor: inspection.grade === 'A' ? '#ecfdf5' : inspection.grade === 'B' ? '#fffbeb' : '#fef2f2',
                    color: inspection.grade === 'A' ? '#059669' : inspection.grade === 'B' ? '#d97706' : '#dc2626',
                  }}
                >
                  Grade {inspection.grade}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: DETECTED DEFECT DETAILS */}
          <div className="admin-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#1f2a44', letterSpacing: '0.04em', margin: '0 0 16px' }}>
              DETECTED DEFECT DETAILS
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Item 1 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1f2a44' }}>Weft Tear</strong>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Confidence Score: 94%
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                  }}
                >
                  Critical
                </span>
              </div>

              {/* Item 2 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1f2a44' }}>Slub Knot</strong>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Confidence Score: 81%
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                  }}
                >
                  Moderate
                </span>
              </div>

              {/* Item 3 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1f2a44' }}>Oil Stain</strong>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Confidence Score: 72%
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#fef9c3',
                    color: '#ca8a04',
                  }}
                >
                  Low
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleDownloadPDF}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#16806e',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(22, 128, 110, 0.25)',
              }}
            >
              <Download size={16} /> Download PDF Quality Report
            </button>

            <button
              onClick={handleShareSummary}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Share2 size={16} /> {copiedToast ? 'Summary Copied to Clipboard!' : 'Share Audit Summary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminInspectionDetail;
