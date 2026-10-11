import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Share2,
  Search,
  RefreshCw,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import { fetchReports } from '../../services/adminApi';

export function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Filters matching Screenshot 2
  const [reportSearch, setReportSearch] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [reportType, setReportType] = useState('pdf_summary');

  // Generate Report Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genInspectionId, setGenInspectionId] = useState('INS-0498');
  const [genFormat, setGenFormat] = useState('PDF Summary');

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReports({
        search: reportSearch,
        grade: gradeFilter === 'all' ? '' : gradeFilter,
        user: userFilter === 'all' ? '' : userFilter,
      });
      if (res.success) {
        setReports(res.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Unable to retrieve audit reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [reportSearch, dateRange, gradeFilter, userFilter]);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Sep 5, 2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (_e) {
      return dateStr;
    }
  };

  const handleDownloadPDF = (rep) => {
    try {
      const doc = new jsPDF();

      // Header Navy Banner
      doc.setFillColor(31, 42, 68);
      doc.rect(0, 0, 210, 36, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('FabriSense', 15, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(32, 140, 125);
      doc.text('OFFICIAL FABRIC QUALITY INSPECTION AUDIT CERTIFICATE', 15, 26);

      doc.setTextColor(200, 210, 225);
      doc.setFontSize(9);
      doc.text(`Report Number: ${rep.report_number}`, 140, 18);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 26);

      // Section
      doc.setTextColor(31, 42, 68);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Audit Parameters', 15, 48);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 52, 195, 52);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      doc.text(`Inspection ID: ${rep.inspection_id}`, 15, 62);
      doc.text(`Audit Date: ${rep.inspection_date || 'Sep 5, 2026'}`, 15, 70);
      doc.text(`Quality Inspector: ${rep.inspector_name || 'Rajesh Kumar'}`, 15, 78);
      doc.text(`Fabric Classification: ${rep.fabric_name || rep.fabric_type || 'Kanchipuram Silk'}`, 15, 86);

      doc.text(`Total Defects: ${rep.defect_count || 0}`, 115, 62);
      doc.text(`Overall Quality Grade: GRADE ${rep.grade || 'A'}`, 115, 70);
      doc.text(`Audit Status: ${rep.report_status || 'Generated'}`, 115, 78);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 100, 180, 50, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 42, 68);
      doc.text('Executive Audit Assessment', 22, 112);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9.5);
      const summaryText = rep.overall_summary || 'Inspection optical sweep completed via FabriSense YOLOv8 AI inspection engine. Grade certified for industrial distribution.';
      doc.text(doc.splitTextToSize(summaryText, 166), 22, 122);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(32, 140, 125);
      doc.text(`Recommended Operational Action: ${rep.recommended_action || 'Approved for commercial dispatch.'}`, 22, 142);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'FabriSense Textile Quality Assurance System • Confidential Production Document',
        15,
        280
      );

      doc.save(`FabriSense-${rep.report_number}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF: ' + e.message);
    }
  };

  const handleShare = (rep) => {
    const text = `FabriSense Quality Audit Report ${rep.report_number} (${rep.inspection_id}) - Grade ${rep.grade}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(rep.report_id || rep.report_number);
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      alert(`Report ${rep.report_number} ready to share.`);
    }
  };

  const handleBulkExport = (type) => {
    if (type === 'csv' || type === 'excel') {
      const headers = ['Report ID,Inspection ID,Date Created,Inspector,Overall Grade,Status\n'];
      const rows = reports.map(r => 
        `"${r.report_number}","${r.inspection_id}","${formatDateDisplay(r.generated_at || r.inspection_date)}","${r.inspector_name || 'Rajesh Kumar'}","Grade ${r.grade}","${r.report_status || 'Generated'}"`
      ).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FabriSense_Reports_${type === 'excel' ? 'Excel' : 'Data'}.csv`;
      a.click();
    } else if (type === 'pdf') {
      if (reports.length > 0) {
        handleDownloadPDF(reports[0]);
      }
    }
  };

  return (
    <div>
      {/* ── Top Filters Row matching Screenshot 2 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', flexWrap: 'wrap' }}>
          {/* Search Report ID... */}
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Report ID..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              style={{
                padding: '9px 12px 9px 38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                width: '100%',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            />
          </div>

          {/* Date: Last 30 Days ⌵ */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <option value="30d">Date: Last 30 Days</option>
              <option value="7d">Date: Last 7 Days</option>
              <option value="90d">Date: Last 90 Days</option>
              <option value="all">Date: All Time</option>
            </select>
          </div>

          {/* Grade: All Grades ⌵ */}
          <div>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <option value="all">Grade: All Grades</option>
              <option value="A">Grade: Grade A</option>
              <option value="B">Grade: Grade B</option>
              <option value="C">Grade: Grade C</option>
            </select>
          </div>

          {/* User: All Users ⌵ */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <option value="all">User: All Users</option>
              <option value="Rajesh Kumar">User: Rajesh Kumar</option>
              <option value="Anil Mehta">User: Anil Mehta</option>
              <option value="Meera Sen">User: Meera Sen</option>
              <option value="Aarav Sharma">User: Aarav Sharma</option>
              <option value="Priya Patel">User: Priya Patel</option>
            </select>
          </div>

          {/* Type: PDF Summary ⌵ */}
          <div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <option value="pdf_summary">Type: PDF Summary</option>
              <option value="detailed_audit">Type: Detailed Audit</option>
              <option value="certificate">Type: Certificate</option>
            </select>
          </div>
        </div>

        {/* Generate Report Button */}
        <button
          onClick={() => setIsGenerateModalOpen(true)}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            backgroundColor: '#16806e',
            color: '#ffffff',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#137a68'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#16806e'; }}
        >
          <FileText size={16} /> Generate Report
        </button>
      </div>

      {/* ── Main Card Container ── */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Bulk Export Options Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
            Bulk Export Options:
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleBulkExport('pdf')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#1e293b',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              PDF Summary
            </button>
            <button
              onClick={() => handleBulkExport('csv')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#1e293b',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              CSV Data
            </button>
            <button
              onClick={() => handleBulkExport('excel')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#1e293b',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              Excel sheet
            </button>
          </div>
        </div>

        {/* ── Table matching Screenshot 2 ── */}
        {error && (
          <div className="error-banner" style={{ margin: '16px' }}>
            <span>{error}</span>
            <button onClick={loadReports} className="btn-secondary">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="loading-box">
            <RefreshCw size={32} className="animate-spin" color="#208c7d" />
            <div>Loading quality reports...</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <FileText className="empty-state-icon" />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2a44', margin: '0 0 6px' }}>
              No Reports Found
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              No audit records match the selected filters.
            </p>
          </div>
        ) : (
          <div className="admin-table-container" style={{ border: 'none' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Report ID</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Inspection ID</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Date Created</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Inspector</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Overall Grade</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep) => {
                  const grade = rep.grade || 'A';
                  const isPending = (rep.report_status || '').toLowerCase() === 'pending';

                  const gradeStyle =
                    grade === 'A'
                      ? { bg: '#e6f9ed', color: '#16a34a' }
                      : grade === 'B'
                      ? { bg: '#fef3c7', color: '#d97706' }
                      : { bg: '#fee2e2', color: '#dc2626' };

                  return (
                    <tr
                      key={rep.report_id || rep.report_number}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: '700' }}>
                          {rep.report_number}
                        </strong>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569', fontSize: '13px' }}>
                        {rep.inspection_id}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569', fontSize: '13px' }}>
                        {formatDateDisplay(rep.generated_at || rep.inspection_date)}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#1e293b', fontSize: '13px', fontWeight: '500' }}>
                        {rep.inspector_name || 'Rajesh Kumar'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: gradeStyle.bg,
                            color: gradeStyle.color,
                            display: 'inline-block',
                          }}
                        >
                          Grade {grade}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: isPending ? '#d97706' : '#16a34a',
                          }}
                        >
                          {isPending ? 'Pending' : 'Generated'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleDownloadPDF(rep)}
                            style={{
                              backgroundColor: '#16806e',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 14px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#137a68'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#16806e'; }}
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleShare(rep)}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '5px 14px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                          >
                            {copiedId === (rep.report_id || rep.report_number) ? 'Copied' : 'Share'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Generate Report Modal ── */}
      {isGenerateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1f2a44', margin: 0 }}>
                Generate Quality Report
              </h3>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Inspection Target ID</label>
              <input
                type="text"
                value={genInspectionId}
                onChange={(e) => setGenInspectionId(e.target.value)}
                placeholder="e.g. INS-0498"
                className="admin-form-input"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Report Format</label>
              <select
                value={genFormat}
                onChange={(e) => setGenFormat(e.target.value)}
                className="admin-form-input"
              >
                <option value="PDF Summary">PDF Summary (Single-Page Certificate)</option>
                <option value="Detailed Audit">Detailed Audit (Multi-Page Technical Log)</option>
                <option value="Compliance Certificate">Compliance Certificate (MSME Spec)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = reports[0] || {
                    report_number: `REP-2026-${Math.floor(100 + Math.random() * 900)}`,
                    inspection_id: genInspectionId,
                    grade: 'A',
                    defect_count: 0,
                    status: 'Passed',
                  };
                  handleDownloadPDF({ ...sample, inspection_id: genInspectionId });
                  setIsGenerateModalOpen(false);
                }}
                className="btn-teal"
              >
                Create &amp; Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
