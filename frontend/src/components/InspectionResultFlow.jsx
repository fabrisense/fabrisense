import React, { useState } from 'react';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Download,
  Share2, FileText, Check, ChevronDown, ChevronUp, Copy,
  Printer, X, Eye, FileSpreadsheet, Code, ImageOff, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import defaultFabricImage from '../assets/indigo_denim.jpg';

const DEFECT_DATA = {
  reportId: 'INS-2024-0047',
  timestamp: 'Sep 5, 2024 • 10:32 AM',
  fabricType: 'Handloom Cotton-Silk Blend',
  grade: 'GRADE B',
  gradeLetter: 'B',
  gradeColor: '#d97706',
  totalDefects: 3,
  severityScale: 'Moderate',
  mainIssues: 'Stain, Hole, Broken Yarn',
  aiExplanation:
    'Minor and moderate defects were detected including a stain, hole, and broken yarn. The fabric is structurally viable but may require manual review before sewing.',
  gradeExplanation:
    'Minor and moderate defects were detected. Further manual inspection may be recommended before final processing.',
  defects: [
    {
      id: 1,
      name: 'Stain',
      confidence: '92%',
      severity: 'Moderate',
      severityColor: '#f97316',
      badgeBg: '#fef3c7',
      badgeText: '#d97706',
      box: { top: '38%', left: '52%', width: '40%', height: '36%' },
      tagText: 'Stain — 92%',
      whatIsIt: 'A visible area of discoloration has been detected on the fabric surface.',
      possibleCause: 'May be caused by dye or material contamination during raw processing.',
      recommendedAction: 'Inspect the affected area before further processing or rolling.',
    },
    {
      id: 2,
      name: 'Hole',
      confidence: '94%',
      severity: 'Critical',
      severityColor: '#ef4444',
      badgeBg: '#fee2e2',
      badgeText: '#dc2626',
      box: { top: '14%', left: '12%', width: '36%', height: '30%' },
      tagText: 'Hole — 94%',
      whatIsIt: 'A puncture or missing warp/weft structure creating an open gap in weave.',
      possibleCause: 'Needle breakage, tension overload, or mechanical snag during weaving.',
      recommendedAction: 'Flag roll section for cutting or mend with micro-stitching if permitted.',
    },
    {
      id: 3,
      name: 'Broken Yarn',
      confidence: '91%',
      severity: 'Minor',
      severityColor: '#eab308',
      badgeBg: '#fef9c3',
      badgeText: '#a16207',
      box: { top: '56%', left: '8%', width: '34%', height: '28%' },
      tagText: 'Broken Yarn — 91%',
      whatIsIt: 'A localized discontinuity in warp or weft thread with visible loose ends.',
      possibleCause: 'Yarn tensile stress or friction along the reed/heddle.',
      recommendedAction: 'Trim excess filament and reinforce weave density.',
    },
  ],
};

export function InspectionResultFlow({
  capturedImage,
  resultType = 'defects_found',   // 'defects_found' | 'no_defects' | 'invalid_image'
  onSaveBatch,
  onBackToHome,
  onRescan,
  userData = {},
}) {
  // Current screen step: 1 | 2 | 3 | 4
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedDefects, setExpandedDefects] = useState({ 1: true, 2: false, 3: false });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFormatsModalOpen, setIsFormatsModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const displayImage = capturedImage || defaultFabricImage;

  const toggleDefectAccordion = (id) => {
    setExpandedDefects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // ── 1. PDF Generation ──
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Top Emerald Header
      doc.setFillColor(27, 122, 99);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('FABRISENSE AI — FABRIC INSPECTION REPORT', 14, 16);

      // Metadata Block
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`Report ID: ${DEFECT_DATA.reportId}`, 14, 34);
      doc.text(`Date & Time: ${DEFECT_DATA.timestamp}`, 14, 40);
      doc.text(`Fabric Type: ${DEFECT_DATA.fabricType}`, 14, 46);
      doc.text(`Inspector: ${userData?.name || 'Ananthi Kumar'} (${userData?.email || 'inspector@weavesofindia.com'})`, 14, 52);

      // Grade Box
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(144, 28, 52, 26, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(217, 119, 6);
      doc.text('GRADE B', 153, 42);
      doc.setFontSize(8.5);
      doc.text('Moderate Quality', 151, 49);

      // Divider Line
      doc.setDrawColor(220, 220, 220);
      doc.line(14, 58, 196, 58);

      // Summary Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('AI Assessment & Summary', 14, 68);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const splitExplanation = doc.splitTextToSize(DEFECT_DATA.aiExplanation, 182);
      doc.text(splitExplanation, 14, 76);

      // Defects Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Detected Defect Items (3 Found)', 14, 98);

      // Table header bar
      doc.setFillColor(241, 245, 249);
      doc.rect(14, 103, 182, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('# Defect Name', 18, 108);
      doc.text('Severity', 65, 108);
      doc.text('Confidence', 105, 108);
      doc.text('Recommended Action', 140, 108);

      let yPos = 118;
      DEFECT_DATA.defects.forEach((defect, idx) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}. ${defect.name}`, 18, yPos);

        doc.setTextColor(
          defect.severity === 'Critical' ? 220 : defect.severity === 'Moderate' ? 217 : 161,
          defect.severity === 'Critical' ? 38 : defect.severity === 'Moderate' ? 119 : 98,
          defect.severity === 'Critical' ? 38 : 6
        );
        doc.text(defect.severity, 65, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(defect.confidence, 105, yPos);

        const actionText = doc.splitTextToSize(defect.recommendedAction, 54);
        doc.text(actionText, 140, yPos);

        yPos += 14;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Generated by FabriSense AI Optical Quality Inspection System. All rights reserved.', 14, 280);

      doc.save(`FabriSense_Report_${DEFECT_DATA.reportId}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  // ── 2. CSV Export ──
  const handleExportCSV = () => {
    let csv = 'Report_ID,Fabric_Type,Grade,Defect_Number,Defect_Name,Confidence,Severity,Recommended_Action\n';
    DEFECT_DATA.defects.forEach((d, i) => {
      csv += `"${DEFECT_DATA.reportId}","${DEFECT_DATA.fabricType}","${DEFECT_DATA.grade}","${i + 1}","${d.name}","${d.confidence}","${d.severity}","${d.recommendedAction.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FabriSense_${DEFECT_DATA.reportId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsFormatsModalOpen(false);
  };

  // ── 3. JSON Export ──
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(DEFECT_DATA, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FabriSense_${DEFECT_DATA.reportId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setIsFormatsModalOpen(false);
  };

  // ── 4. Print ──
  const handlePrint = () => {
    window.print();
    setIsFormatsModalOpen(false);
  };

  // ── 5. Social Share & Copy ──
  const shareText = `🧵 FabriSense Inspection Report\nReport ID: ${DEFECT_DATA.reportId}\nGrade: ${DEFECT_DATA.grade}\nDefects Found: 3 (Stain, Hole, Broken Yarn)\nStatus: Structurally Viable with Review Required\nInspected by: ${userData?.name || 'Ananthi Kumar'}`;

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FabriSense Report: ${DEFECT_DATA.reportId}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to share sheet modal
      }
    }
    setIsShareModalOpen(true);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  // ── 6. Save Batch to history with confetti celebration ──
  const handleSaveReportAction = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    if (onSaveBatch) {
      onSaveBatch({
        id: Date.now(),
        title: DEFECT_DATA.fabricType,
        time: 'Today • 3 defects found',
        grade: DEFECT_DATA.grade,
        defects: DEFECT_DATA.totalDefects,
        defectsList: DEFECT_DATA.defects,
        type: 'silk',
      });
    }
  };

  return (
    <div style={flowContainerStyle}>

      {/* ═══════════════════════════════════════════════════════════════════
          RESULT: NO DEFECTS DETECTED  (Scan Completed — left mockup)
      ═══════════════════════════════════════════════════════════════════ */}
      {resultType === 'no_defects' && (
        <div style={pageContentStyle}>
          {/* Header */}
          <div style={topHeaderStyle}>
            <button onClick={onRescan} style={backIconBtnStyle} title="Back">
              <ArrowLeft size={20} color="#0f172a" />
            </button>
            <h2 style={pageTitleStyle}>Scan Completed</h2>
            <div style={{ width: '36px' }} />
          </div>

          {/* Big green check circle */}
          <div style={noDefectsHeroWrapperStyle}>
            <div style={noDefectsCircleStyle}>
              <div style={noDefectsPulseStyle} />
              <Check size={52} color="#16a34a" strokeWidth={2.8} />
            </div>
          </div>

          {/* Title + subtitle */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={noDefectsTitleStyle}>No Defects Detected</div>
            <div style={noDefectsSubtextStyle}>
              FabriSense did not identify any defects in this image.
            </div>
          </div>

          {/* Grade A badge */}
          <div style={gradeABadgeWrapperStyle}>
            <span style={gradeABadgeStyle}>GRADE A</span>
          </div>

          {/* Thumbnail of scanned fabric */}
          {capturedImage && (
            <div style={noDefectsThumbnailWrapperStyle}>
              <img
                src={capturedImage}
                alt="Scanned fabric"
                style={noDefectsThumbnailStyle}
              />
              <div style={noDefectsOverlayBadgeStyle}>
                <Check size={12} color="#fff" strokeWidth={3} />
                <span>Clean</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => {
                try {
                  confetti({ particleCount: 80, spread: 70, origin: { y: 0.75 } });
                } catch {}
                if (onSaveBatch) {
                  onSaveBatch({
                    id: Date.now(),
                    title: 'Fabric Sample',
                    time: 'Today • No defects',
                    grade: 'GRADE A',
                    defects: 0,
                    type: 'clean',
                  });
                }
              }}
              style={primaryGreenBtnStyle}
            >
              Save to History
            </button>
            <button onClick={onRescan} style={secondaryWhiteBtnStyle}>
              New Inspection
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RESULT: INVALID / UNCLEAR IMAGE  (Analysis Error — right mockup)
      ═══════════════════════════════════════════════════════════════════ */}
      {resultType === 'invalid_image' && (
        <div style={pageContentStyle}>
          {/* Header */}
          <div style={topHeaderStyle}>
            <button onClick={onRescan} style={backIconBtnStyle} title="Back">
              <ArrowLeft size={20} color="#0f172a" />
            </button>
            <h2 style={pageTitleStyle}>Analysis Error</h2>
            <div style={{ width: '36px' }} />
          </div>

          {/* Big pink/red icon circle */}
          <div style={invalidHeroWrapperStyle}>
            <div style={invalidCircleStyle}>
              <div style={invalidPulseStyle} />
              <ImageOff size={48} color="#dc2626" strokeWidth={2} />
            </div>
          </div>

          {/* Title + subtitle */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={invalidTitleStyle}>We couldn\'t analyze this image</div>
            <div style={invalidSubtextStyle}>
              Try taking a clearer photo with the fabric surface fully visible.
            </div>
          </div>

          {/* Tips card */}
          <div style={invalidTipsCardStyle}>
            <div style={invalidTipsTitleStyle}>Tips for a successful scan:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Place fabric on a flat surface',
                'Ensure good lighting',
                'Capture the full area',
              ].map((tip) => (
                <div key={tip} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={invalidTipDotStyle} />
                  <span style={{ fontSize: '13.5px', color: '#334155', fontWeight: '500' }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Try Again button */}
          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button
              onClick={onRescan}
              style={primaryGreenBtnStyle}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RESULT: DEFECTS FOUND — existing 4-page detection flow
      ═══════════════════════════════════════════════════════════════════ */}
      {resultType === 'defects_found' && (<>
      {currentStep === 1 && (
        <div style={pageContentStyle}>
          {/* Header */}
          <div style={topHeaderStyle}>
            <button
              onClick={onRescan}
              style={backIconBtnStyle}
              title="Rescan / Back"
            >
              <ArrowLeft size={20} color="#0f172a" />
            </button>
            <h2 style={pageTitleStyle}>Detection Result</h2>
            <div style={{ width: '36px' }} />
          </div>

          {/* Red banner pill: "3 Defects Detected" */}
          <div style={redDefectBannerStyle}>
            <div style={redPulseDotStyle} />
            <span>3 Defects Detected</span>
          </div>

          {/* Fabric Preview with Defect Bounding Boxes */}
          <div style={fabricPreviewCardStyle}>
            <img
              src={displayImage}
              alt="Fabric Sample with Defects"
              style={fabricImageStyle}
            />

            {/* Bounding Box 1: Hole — 94% (Red) */}
            <div style={boxHoleStyle}>
              <div style={tagHoleStyle}>Hole — 94%</div>
            </div>

            {/* Bounding Box 2: Stain — 92% (Orange) */}
            <div style={boxStainStyle}>
              <div style={tagStainStyle}>Stain — 92%</div>
            </div>

            {/* Bounding Box 3: Broken Yarn — 91% (Yellow) */}
            <div style={boxBrokenYarnStyle}>
              <div style={tagBrokenYarnStyle}>Broken Yarn — 91%</div>
            </div>
          </div>

          {/* Action Button: View Defect Details */}
          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button
              onClick={() => setCurrentStep(2)}
              style={primaryGreenBtnStyle}
            >
              View Defect Details
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 2: DEFECT DETAILS (Classify Different Types)
      ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div style={pageContentStyle}>
          {/* Header */}
          <div style={topHeaderStyle}>
            <button
              onClick={() => setCurrentStep(1)}
              style={backIconBtnStyle}
              title="Back"
            >
              <ArrowLeft size={20} color="#0f172a" />
            </button>
            <h2 style={pageTitleStyle}>Defect Details</h2>
            <div style={{ width: '36px' }} />
          </div>

          {/* Defect Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {DEFECT_DATA.defects.map((defect, idx) => {
              const isExpanded = expandedDefects[defect.id];
              return (
                <div key={defect.id} style={defectDetailCardStyle}>
                  {/* Card Header */}
                  <div
                    onClick={() => toggleDefectAccordion(defect.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      paddingBottom: isExpanded ? '12px' : '0',
                      borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                        {idx + 1}. {defect.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Confidence: {defect.confidence}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        backgroundColor: defect.badgeBg,
                        color: defect.badgeText,
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '20px',
                      }}>
                        {defect.severity}
                      </span>
                      {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <div style={defectSubheadingStyle}>WHAT IS IT?</div>
                        <div style={defectSubtextStyle}>{defect.whatIsIt}</div>
                      </div>
                      <div>
                        <div style={defectSubheadingStyle}>POSSIBLE CAUSE</div>
                        <div style={defectSubtextStyle}>{defect.possibleCause}</div>
                      </div>
                      <div>
                        <div style={defectSubheadingStyle}>RECOMMENDED ACTION</div>
                        <div style={defectSubtextStyle}>{defect.recommendedAction}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button: Continue to Quality */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              onClick={() => setCurrentStep(3)}
              style={primaryGreenBtnStyle}
            >
              Continue to Overall Grade
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 3: OVERALL FABRIC QUALITY (Grade B)
      ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div style={pageContentStyle}>
          {/* Header */}
          <div style={topHeaderStyle}>
            <button
              onClick={() => setCurrentStep(2)}
              style={backIconBtnStyle}
              title="Back"
            >
              <ArrowLeft size={20} color="#0f172a" />
            </button>
            <h2 style={pageTitleStyle}>Overall Fabric Quality</h2>
            <div style={{ width: '36px' }} />
          </div>

          {/* Central Glowing Hero Grade Badge */}
          <div style={gradeHeroWrapperStyle}>
            <div style={gradeHeroCircleStyle}>
              <div style={gradeHeroLetterStyle}>B</div>
              <div style={gradeHeroSubtitleStyle}>GRADE B</div>
            </div>
          </div>

          {/* "Why this grade?" Card */}
          <div style={whyGradeCardStyle}>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', marginBottom: '14px' }}>
              Why this grade?
            </div>

            <div style={gradeMetricRowStyle}>
              <span style={{ color: '#64748b', fontSize: '13.5px' }}>Defects Found</span>
              <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>3</span>
            </div>

            <div style={gradeMetricRowStyle}>
              <span style={{ color: '#64748b', fontSize: '13.5px' }}>Severity Scale</span>
              <span style={{
                backgroundColor: '#fef3c7',
                color: '#d97706',
                fontWeight: '700',
                fontSize: '11.5px',
                padding: '3px 9px',
                borderRadius: '12px',
              }}>
                Moderate
              </span>
            </div>

            <div style={{ ...gradeMetricRowStyle, borderBottom: 'none' }}>
              <span style={{ color: '#64748b', fontSize: '13.5px' }}>Main Issues</span>
              <span style={{ fontWeight: '600', color: '#334155', fontSize: '13px' }}>
                Stain, Hole, Broken Yarn
              </span>
            </div>

            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              color: '#64748b',
              fontSize: '12.5px',
              lineHeight: 1.5,
            }}>
              {DEFECT_DATA.gradeExplanation}
            </div>
          </div>

          {/* Buttons: View Full Report + Back to Home */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => setCurrentStep(4)}
              style={primaryGreenBtnStyle}
            >
              View Full Report
            </button>
            <button
              onClick={onBackToHome}
              style={secondaryWhiteBtnStyle}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 4: INSPECTION REPORT (Summary, Save, Share, PDF)
      ═══════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div style={pageContentStyle}>
          {/* Header */}
          <div style={topHeaderStyle}>
            <button
              onClick={() => setCurrentStep(3)}
              style={backIconBtnStyle}
              title="Back"
            >
              <ArrowLeft size={20} color="#0f172a" />
            </button>
            <h2 style={pageTitleStyle}>Inspection Report</h2>
            <div style={{ width: '36px' }} />
          </div>

          {/* Report ID & Date Card */}
          <div style={reportIdCardStyle}>
            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>
              {DEFECT_DATA.reportId}
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>
              {DEFECT_DATA.timestamp}
            </div>
          </div>

          {/* 2-Column Summary Cards: Defects & Grade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div style={summaryMetricCardStyle}>
              <div style={summaryMetricLabelStyle}>DEFECTS</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                3 Detected
              </div>
            </div>
            <div style={summaryMetricCardStyle}>
              <div style={summaryMetricLabelStyle}>GRADE</div>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  fontWeight: '800',
                  fontSize: '13px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  display: 'inline-block',
                }}>
                  Grade B
                </span>
              </div>
            </div>
          </div>

          {/* AI Explanation Card */}
          <div style={aiExplanationCardStyle}>
            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px', marginBottom: '6px' }}>
              AI Explanation
            </div>
            <div style={{ color: '#475569', fontSize: '12.5px', lineHeight: 1.5 }}>
              {DEFECT_DATA.aiExplanation}
            </div>
          </div>

          {/* Detected Items List */}
          <div style={detectedItemsCardStyle}>
            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px', marginBottom: '10px', letterSpacing: '0.02em' }}>
              DETECTED ITEMS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEFECT_DATA.defects.map((item, idx) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>
                    {idx + 1}. {item.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                      Conf: {item.confidence}
                    </span>
                    <span style={{
                      color: item.badgeText,
                      fontWeight: '700',
                      fontSize: '11px',
                    }}>
                      {item.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Success Banner */}
          {savedSuccess && (
            <div style={savedNoticeBannerStyle}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Report saved to inspections history!</span>
            </div>
          )}

          {/* Action Buttons Row */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Save Report button */}
              <button
                onClick={handleSaveReportAction}
                style={{
                  ...primaryGreenBtnStyle,
                  flex: 2,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Check size={16} /> Save Report
              </button>

              {/* Share button */}
              <button
                onClick={handleShareClick}
                style={{
                  ...secondaryWhiteBtnStyle,
                  flex: 1,
                  padding: '12px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  fontSize: '13px',
                }}
                title="Share via Social Media / Apps"
              >
                <Share2 size={16} /> Share
              </button>

              {/* PDF button */}
              <button
                onClick={handleDownloadPDF}
                style={{
                  ...secondaryWhiteBtnStyle,
                  flex: 1,
                  padding: '12px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  fontSize: '13px',
                  backgroundColor: '#f8fafc',
                }}
                title="Download PDF Inspection Certificate"
              >
                <FileText size={16} color="#dc2626" /> PDF
              </button>
            </div>

            {/* More Formats button */}
            <button
              onClick={() => setIsFormatsModalOpen(true)}
              style={{
                ...secondaryWhiteBtnStyle,
                padding: '10px',
                fontSize: '12.5px',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Download size={15} /> Save in More Formats (CSV, JSON, Print)
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 1: SOCIAL MEDIA & SHARE SHEET
      ═══════════════════════════════════════════════════════════════════ */}
      {isShareModalOpen && (
        <div style={modalBackdropStyle} onClick={() => setIsShareModalOpen(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                Share Inspection Report
              </div>
              <button onClick={() => setIsShareModalOpen(false)} style={modalCloseBtnStyle}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '18px 0' }}>
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                style={shareChannelItemStyle}
              >
                <div style={{ ...shareIconBoxStyle, backgroundColor: '#25D366' }}>
                  💬
                </div>
                <span style={shareChannelLabelStyle}>WhatsApp</span>
              </a>

              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                style={shareChannelItemStyle}
              >
                <div style={{ ...shareIconBoxStyle, backgroundColor: '#0088cc' }}>
                  ✈️
                </div>
                <span style={shareChannelLabelStyle}>Telegram</span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`FabriSense Report ${DEFECT_DATA.reportId}`)}&body=${encodeURIComponent(shareText)}`}
                style={shareChannelItemStyle}
              >
                <div style={{ ...shareIconBoxStyle, backgroundColor: '#ea4335' }}>
                  ✉️
                </div>
                <span style={shareChannelLabelStyle}>Email</span>
              </a>

              {/* Copy link */}
              <div onClick={handleCopyText} style={shareChannelItemStyle}>
                <div style={{ ...shareIconBoxStyle, backgroundColor: '#334155' }}>
                  <Copy size={20} color="#ffffff" />
                </div>
                <span style={shareChannelLabelStyle}>Copy Text</span>
              </div>
            </div>

            {copiedToast && (
              <div style={copiedToastBannerStyle}>
                ✓ Summary copied to clipboard!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 2: MORE FILE FORMATS MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {isFormatsModalOpen && (
        <div style={modalBackdropStyle} onClick={() => setIsFormatsModalOpen(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                Export Report In Other Formats
              </div>
              <button onClick={() => setIsFormatsModalOpen(false)} style={modalCloseBtnStyle}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
              {/* PDF */}
              <div onClick={handleDownloadPDF} style={formatOptionItemStyle}>
                <div style={{ ...formatIconBoxStyle, backgroundColor: '#fee2e2' }}>
                  <FileText size={20} color="#dc2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>PDF Certificate (.pdf)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Full formatted inspection certificate</div>
                </div>
                <Download size={18} color="#94a3b8" />
              </div>

              {/* CSV */}
              <div onClick={handleExportCSV} style={formatOptionItemStyle}>
                <div style={{ ...formatIconBoxStyle, backgroundColor: '#dcfce7' }}>
                  <FileSpreadsheet size={20} color="#16a34a" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Spreadsheet Data (.csv)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Tabular defect classification rows</div>
                </div>
                <Download size={18} color="#94a3b8" />
              </div>

              {/* JSON */}
              <div onClick={handleExportJSON} style={formatOptionItemStyle}>
                <div style={{ ...formatIconBoxStyle, backgroundColor: '#e0e7ff' }}>
                  <Code size={20} color="#4f46e5" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Machine JSON (.json)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Raw optical inspection data payload</div>
                </div>
                <Download size={18} color="#94a3b8" />
              </div>

              {/* Print */}
              <div onClick={handlePrint} style={formatOptionItemStyle}>
                <div style={{ ...formatIconBoxStyle, backgroundColor: '#f1f5f9' }}>
                  <Printer size={20} color="#334155" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Print Report</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Send to connected wireless printer</div>
                </div>
                <Printer size={18} color="#94a3b8" />
              </div>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

// ── No Defects Screen ──
const noDefectsHeroWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '12px 0 20px',
};

const noDefectsCircleStyle = {
  position: 'relative',
  width: '108px',
  height: '108px',
  borderRadius: '50%',
  backgroundColor: 'rgba(220, 252, 231, 0.9)',
  border: '2.5px solid #86efac',
  boxShadow: '0 0 0 12px rgba(134,239,172,0.15), 0 0 32px rgba(22,163,74,0.18)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const noDefectsPulseStyle = {
  position: 'absolute',
  inset: '-10px',
  borderRadius: '50%',
  border: '2px solid rgba(134,239,172,0.4)',
  animation: 'noPulse 2.4s ease-in-out infinite',
};

const noDefectsTitleStyle = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#0f172a',
  letterSpacing: '-0.025em',
  marginBottom: '6px',
};

const noDefectsSubtextStyle = {
  fontSize: '13.5px',
  color: '#64748b',
  lineHeight: 1.5,
  maxWidth: '240px',
  margin: '0 auto',
};

const gradeABadgeWrapperStyle = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '20px',
};

const gradeABadgeStyle = {
  backgroundColor: '#dcfce7',
  color: '#15803d',
  fontSize: '12px',
  fontWeight: '800',
  padding: '5px 16px',
  borderRadius: '20px',
  letterSpacing: '0.06em',
  border: '1px solid #bbf7d0',
};

const noDefectsThumbnailWrapperStyle = {
  position: 'relative',
  width: '100%',
  height: '160px',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '2px solid #bbf7d0',
  boxShadow: '0 2px 12px rgba(22,163,74,0.12)',
};

const noDefectsThumbnailStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const noDefectsOverlayBadgeStyle = {
  position: 'absolute',
  bottom: '10px',
  right: '10px',
  backgroundColor: '#16a34a',
  color: '#fff',
  fontSize: '11px',
  fontWeight: '800',
  padding: '4px 10px',
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

// ── Invalid Image Screen ──
const invalidHeroWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '12px 0 20px',
};

const invalidCircleStyle = {
  position: 'relative',
  width: '108px',
  height: '108px',
  borderRadius: '50%',
  backgroundColor: 'rgba(254, 226, 226, 0.9)',
  border: '2.5px solid #fca5a5',
  boxShadow: '0 0 0 12px rgba(252,165,165,0.15), 0 0 32px rgba(220,38,38,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const invalidPulseStyle = {
  position: 'absolute',
  inset: '-10px',
  borderRadius: '50%',
  border: '2px solid rgba(252,165,165,0.4)',
  animation: 'noPulse 2.4s ease-in-out infinite',
};

const invalidTitleStyle = {
  fontSize: '20px',
  fontWeight: '800',
  color: '#0f172a',
  letterSpacing: '-0.02em',
  marginBottom: '6px',
};

const invalidSubtextStyle = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: 1.5,
  maxWidth: '250px',
  margin: '0 auto',
};

const invalidTipsCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '16px 18px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
};

const invalidTipsTitleStyle = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#64748b',
  letterSpacing: '0.04em',
  marginBottom: '12px',
};

const invalidTipDotStyle = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  backgroundColor: '#16a34a',
  flexShrink: 0,
};

const flowContainerStyle = {
  backgroundColor: '#f8fafc',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '16px 14px 20px',
  boxSizing: 'border-box',
};

const pageContentStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: '520px',
};

const topHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
};

const backIconBtnStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '50%',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const pageTitleStyle = {
  fontSize: '18px',
  fontWeight: '800',
  color: '#0f172a',
  margin: 0,
  letterSpacing: '-0.02em',
  textAlign: 'center',
};

const redDefectBannerStyle = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fee2e2',
  borderRadius: '12px',
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  color: '#dc2626',
  fontWeight: '800',
  fontSize: '14px',
  marginBottom: '16px',
};

const redPulseDotStyle = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
};

const fabricPreviewCardStyle = {
  position: 'relative',
  width: '100%',
  height: '280px',
  borderRadius: '20px',
  overflow: 'hidden',
  backgroundColor: '#e2e8f0',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  marginBottom: '16px',
};

const fabricImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

// ── Bounding Box Styles ──
const boxHoleStyle = {
  position: 'absolute',
  top: '12%',
  left: '8%',
  width: '38%',
  height: '32%',
  border: '2.5px solid #ef4444',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  borderRadius: '8px',
  boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
};

const tagHoleStyle = {
  position: 'absolute',
  top: '-13px',
  left: '-2px',
  backgroundColor: '#ef4444',
  color: '#ffffff',
  fontSize: '10.5px',
  fontWeight: '800',
  padding: '2px 8px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
};

const boxStainStyle = {
  position: 'absolute',
  top: '36%',
  left: '50%',
  width: '42%',
  height: '36%',
  border: '2.5px solid #f97316',
  backgroundColor: 'rgba(249, 115, 22, 0.15)',
  borderRadius: '8px',
  boxShadow: '0 0 10px rgba(249, 115, 22, 0.3)',
};

const tagStainStyle = {
  position: 'absolute',
  top: '-13px',
  left: '-2px',
  backgroundColor: '#f97316',
  color: '#ffffff',
  fontSize: '10.5px',
  fontWeight: '800',
  padding: '2px 8px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
};

const boxBrokenYarnStyle = {
  position: 'absolute',
  top: '56%',
  left: '6%',
  width: '34%',
  height: '28%',
  border: '2.5px solid #eab308',
  backgroundColor: 'rgba(234, 179, 8, 0.18)',
  borderRadius: '8px',
  boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)',
};

const tagBrokenYarnStyle = {
  position: 'absolute',
  top: '-13px',
  left: '-2px',
  backgroundColor: '#eab308',
  color: '#713f12',
  fontSize: '10.5px',
  fontWeight: '800',
  padding: '2px 8px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
};

// ── Screen 2: Defect Details Styles ──
const defectDetailCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

const defectSubheadingStyle = {
  fontSize: '10.5px',
  fontWeight: '800',
  color: '#64748b',
  letterSpacing: '0.04em',
  marginBottom: '2px',
};

const defectSubtextStyle = {
  fontSize: '12.5px',
  color: '#334155',
  lineHeight: 1.45,
};

// ── Screen 3: Overall Fabric Quality Styles ──
const gradeHeroWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '16px 0 24px',
};

const gradeHeroCircleStyle = {
  width: '130px',
  height: '130px',
  borderRadius: '50%',
  border: '3px solid #fde68a',
  backgroundColor: 'rgba(254, 243, 199, 0.5)',
  boxShadow: '0 0 32px rgba(245, 158, 11, 0.2), inset 0 0 16px rgba(245, 158, 11, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const gradeHeroLetterStyle = {
  fontSize: '56px',
  fontWeight: '800',
  color: '#d97706',
  lineHeight: 1,
};

const gradeHeroSubtitleStyle = {
  fontSize: '11px',
  fontWeight: '800',
  color: '#b45309',
  letterSpacing: '0.06em',
  marginTop: '4px',
};

const whyGradeCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '18px 16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const gradeMetricRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #f8fafc',
};

// ── Screen 4: Inspection Report Styles ──
const reportIdCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
  marginBottom: '12px',
};

const summaryMetricCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  padding: '12px 14px',
  border: '1px solid #e2e8f0',
};

const summaryMetricLabelStyle = {
  fontSize: '10.5px',
  fontWeight: '800',
  color: '#64748b',
  letterSpacing: '0.04em',
};

const aiExplanationCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  marginBottom: '12px',
};

const detectedItemsCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  marginBottom: '12px',
};

const savedNoticeBannerStyle = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#16a34a',
  fontWeight: '700',
  fontSize: '12.5px',
  borderRadius: '12px',
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '10px',
};

// ── Shared Button Styles ──
const primaryGreenBtnStyle = {
  width: '100%',
  backgroundColor: '#1b7a63',
  color: '#ffffff',
  border: 'none',
  borderRadius: '14px',
  padding: '14px',
  fontWeight: '800',
  fontSize: '15px',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(27, 122, 99, 0.35)',
  transition: 'transform 0.15s ease',
};

const secondaryWhiteBtnStyle = {
  width: '100%',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  border: '1px solid #cbd5e1',
  borderRadius: '14px',
  padding: '13px',
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  transition: 'background-color 0.15s ease',
};

// ── Modals Styles ──
const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 100,
};

const modalContentStyle = {
  backgroundColor: '#ffffff',
  width: '100%',
  maxWidth: '430px',
  borderTopLeftRadius: '24px',
  borderTopRightRadius: '24px',
  padding: '20px 18px 28px',
  boxShadow: '0 -8px 30px rgba(0,0,0,0.2)',
  boxSizing: 'border-box',
};

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: '10px',
  borderBottom: '1px solid #f1f5f9',
};

const modalCloseBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
};

const shareChannelItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  textDecoration: 'none',
  cursor: 'pointer',
};

const shareIconBoxStyle = {
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '22px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
};

const shareChannelLabelStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#334155',
};

const copiedToastBannerStyle = {
  backgroundColor: '#1b7a63',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '12px',
  padding: '8px 12px',
  borderRadius: '10px',
  textAlign: 'center',
  marginTop: '10px',
};

const formatOptionItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 14px',
  borderRadius: '14px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  cursor: 'pointer',
};

const formatIconBoxStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default InspectionResultFlow;
