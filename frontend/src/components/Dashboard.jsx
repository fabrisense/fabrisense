import React, { useState, useRef, useEffect } from 'react';
import {
  Scan, Home, History, User, LogOut,
  CheckCircle2, X, ShieldCheck, Layers, ArrowLeft,
  Camera, Upload, RefreshCw, CheckCircle, AlertCircle,
  Settings, Bell, Globe, HelpCircle, Info, ChevronRight
} from 'lucide-react';
import { InspectionResultFlow } from './InspectionResultFlow';
import kanchipuramSilk from '../assets/kanchipuram_silk.jpg';
import indigoDenim from '../assets/indigo_denim.jpg';

// Analysis steps shown in image 2
const ANALYSIS_STEPS = [
  { id: 'received', label: 'Image received' },
  { id: 'defects',  label: 'Detecting defects' },
  { id: 'quality',  label: 'Checking fabric quality' },
  { id: 'results',  label: 'Preparing results' },
];

export function Dashboard({ userData = {}, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');

  // ── Inspect flow: 'idle' | 'camera' | 'analyzing' | 'results_flow'
  const [inspectPhase, setInspectPhase]         = useState('idle');
  const [analysisStep, setAnalysisStep]         = useState(-1);
  const [capturedImage, setCapturedImage]       = useState(null);
  const [scanResult, setScanResult]             = useState(null);
  // 'defects_found' | 'no_defects' | 'invalid_image'
  const [analysisResultType, setAnalysisResultType] = useState('defects_found');

  // ── Live Camera Stream State ──
  const [cameraError, setCameraError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [facingMode, setFacingMode]   = useState('environment');
  const [isShutterActive, setIsShutterActive] = useState(false);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  // Inspections default to empty (null state requested by user)
  const [inspections, setInspections] = useState(() => {
    try {
      const saved = localStorage.getItem('fabrisense_inspections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch latest shared inspections from backend on mount so refresh/reload never loses saved records
  useEffect(() => {
    let isMounted = true;
    const fetchSharedInspections = async () => {
      try {
        const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
        const res = await fetch(`${apiBase}/api/inspections`);
        if (!res.ok) return;
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && isMounted) {
          if (result.data.length > 0) {
            const mapped = result.data.map((item) => ({
              id: item.inspection_id || item.id,
              title: item.fabric_name || item.fabric_type || 'Fabric Roll',
              time: item.inspection_date ? new Date(item.inspection_date).toLocaleDateString() : 'Recent scan',
              grade: `GRADE ${item.grade || 'B'}`,
              defects: item.defect_count ?? 0,
              type: (item.fabric_type || '').toLowerCase().includes('denim') ? 'denim' : 'silk',
              raw: item,
            }));
            setInspections(mapped);
            try { localStorage.setItem('fabrisense_inspections', JSON.stringify(mapped)); } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Failed to fetch shared inspections:', err);
      }
    };
    fetchSharedInspections();
    return () => { isMounted = false; };
  }, []);

  // ── Live Camera Management ──
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
      streamRef.current = null;
    }
    setCameraStream(null);
    setIsCameraLoading(false);
  };

  const startLiveCamera = async (mode = facingMode) => {
    stopLiveCamera();
    setCameraError(null);
    setIsCameraLoading(true);
    setInspectPhase('camera');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this browser/environment.');
      setIsCameraLoading(false);
      return;
    }

    try {
      let stream = null;
      try {
        // Attempt 1: with ideal facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Initial camera constraint failed, trying basic video constraint:', err1);
        // Attempt 2: fallback to any available video stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraStream(stream);
      setIsCameraLoading(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Video play error:', e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCameraLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was blocked. Please allow camera permissions in your browser or address bar, then click Try Again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera/webcam was detected on your system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(err.message || 'Unable to access live camera.');
      }
    }
  };

  // Sync video element when stream or video ref becomes available
  useEffect(() => {
    if (inspectPhase === 'camera' && cameraStream && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream, inspectPhase]);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  // Flip camera between environment and user
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  // Capture snapshot frame from live video stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    setIsShutterActive(true);
    setTimeout(() => {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        stopLiveCamera();
        setIsShutterActive(false);
        runAnalysis(dataUrl);
      } catch (e) {
        console.error('Capture frame error:', e);
        setIsShutterActive(false);
      }
    }, 150);
  };

  const handleCloseCamera = () => {
    stopLiveCamera();
    setInspectPhase('idle');
  };

  // ── Start analysis after image is chosen ──
  const runAnalysis = (imageUrl) => {
    stopLiveCamera();
    setCapturedImage(imageUrl);
    setInspectPhase('analyzing');
    setAnalysisStep(0);
    setScanResult(null);
    // ── Simulate dataset comparison result ──────────────────────────────────
    // TODO: Replace with real API call to your ML backend.
    // The backend should return: 'defects_found' | 'no_defects' | 'invalid_image'
    const outcomes = ['defects_found', 'no_defects', 'invalid_image'];
    setAnalysisResultType(outcomes[Math.floor(Math.random() * outcomes.length)]);
  };

  // Advance step every ~1.8 s then show result flow
  useEffect(() => {
    if (inspectPhase !== 'analyzing') return;
    if (analysisStep >= ANALYSIS_STEPS.length) {
      const timer = setTimeout(() => {
        setInspectPhase('results_flow');
      }, 500);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setAnalysisStep(prev => prev + 1), 1800);
    return () => clearTimeout(timer);
  }, [inspectPhase, analysisStep]);

  // ── Save report directly from the 4-page flow ──
  const handleSaveBatchFromFlow = async (record) => {
    const assignedId = `INS-${new Date().getFullYear()}-${String(record?.id || Date.now()).slice(-4)}`;
    const newRecord = {
      id: assignedId,
      title: record?.title || 'Handloom Cotton-Silk Blend',
      time: record?.time || 'Today • 3 defects found',
      grade: record?.grade || 'GRADE B',
      defects: record?.defects !== undefined ? record.defects : 3,
      type: 'silk',
    };
    const updated = [newRecord, ...inspections];
    setInspections(updated);
    try { localStorage.setItem('fabrisense_inspections', JSON.stringify(updated)); }
    catch (e) { console.error(e); }

    // Sync to shared backend database (Supabase Cloud PostgreSQL & SQLite dual-sync)
    try {
      const cleanGrade = (newRecord.grade || 'B').replace(/GRADE\s*/i, '').trim() || 'B';
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/inspections/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assignedId,
          fabricType: newRecord.title || 'Handloom Blend',
          fabricName: newRecord.title || 'Handloom Blend',
          imagePath: capturedImage || '/assets/indigo_denim.jpg',
          defectCount: typeof newRecord.defects === 'number' ? newRecord.defects : 3,
          grade: cleanGrade,
          status: cleanGrade === 'A' ? 'Passed' : cleanGrade === 'B' ? 'Review' : 'Failed',
          overallSummary: 'Mobile fabric quality scan completed.',
          recommendedAction: cleanGrade === 'A' ? 'Batch approved for production.' : 'Flagged for quality review.',
          inspectorName: userData?.name || 'Ananthi Kumar',
          inspectorEmail: userData?.email || 'inspector@weavesofindia.com',
          defects: record?.defectsList || [],
        }),
      });
      const data = await response.json();
      if (data.success && data.inspectionId) {
        newRecord.id = data.inspectionId;
      }
    } catch (err) {
      console.warn('Database sync warning:', err);
    }
  };

  // ── Camera file picker handler (fallback) ──
  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    runAnalysis(URL.createObjectURL(file));
    e.target.value = '';
  };

  // ── File upload handler ──
  const handleUploadChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    runAnalysis(URL.createObjectURL(file));
    e.target.value = '';
  };

  // ── Save result to history ──
  const handleSaveBatch = async () => {
    if (!scanResult) return;
    const assignedId = `INS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const newRecord = {
      id: assignedId,
      title: scanResult.fabric || 'Pure Silk Weave',
      time: 'Today • No defects',
      grade: scanResult.grade || 'GRADE A',
      defects: scanResult.defects || 0,
      type: 'silk',
    };
    const updated = [newRecord, ...inspections];
    setInspections(updated);
    try { localStorage.setItem('fabrisense_inspections', JSON.stringify(updated)); }
    catch (e) { console.error(e); }

    // Sync to shared backend database
    try {
      const cleanGrade = (newRecord.grade || 'A').replace(/GRADE\s*/i, '').trim() || 'A';
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      await fetch(`${apiBase}/api/inspections/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assignedId,
          fabricType: newRecord.title || 'Silk Sample',
          fabricName: newRecord.title || 'Silk Sample',
          imagePath: capturedImage || '/assets/indigo_denim.jpg',
          defectCount: 0,
          grade: cleanGrade,
          status: 'Passed',
          overallSummary: 'Fabric batch passed zero-defect standard.',
          recommendedAction: 'Approved for production.',
          inspectorName: userData?.name || 'Ananthi Kumar',
          inspectorEmail: userData?.email || 'inspector@weavesofindia.com',
          defects: [],
        }),
      });
    } catch (err) {
      console.warn('Database sync warning:', err);
    }

    setInspectPhase('idle');
    setAnalysisStep(-1);
    setCapturedImage(null);
    setScanResult(null);
    setActiveTab('home');
  };

  // ── Scan again ──
  const handleRescan = () => {
    stopLiveCamera();
    setInspectPhase('idle');
    setAnalysisStep(-1);
    setCapturedImage(null);
    setScanResult(null);
  };

  // Reset inspect state when leaving tab
  const handleTabChange = (tab) => {
    stopLiveCamera();
    if (tab !== 'inspect') handleRescan();
    setActiveTab(tab);
  };

  const displayName  = userData?.name  || 'Ananthi Kumar';
  const displayEmail = userData?.email || 'inspector@weavesofindia.com';

  const totalInspections = inspections.length > 0 ? inspections.length : 'null';
  const defectsFound     = inspections.length > 0 ? inspections.reduce((acc, cur) => acc + (cur.defects || 0), 0) : 'null';
  const gradeABatches    = inspections.length > 0 ? inspections.filter(i => i.grade === 'GRADE A').length : 'null';
  const lastActive       = inspections.length > 0 ? 'Today, 8:12 AM' : 'null';

  return (
    <div style={outerWrapperStyle}>
      {/* ── Mobile Phone Viewport Frame ── */}
      <div style={mobileFrameStyle}>
        


        {/* ── TAB 1: HOME PAGE ── */}
        {activeTab === 'home' && (
          <div style={contentScrollStyle}>
            
            {/* Header Greeting & Right Side Profile Button (No character image) */}
            <div style={headerRowStyle}>
              <div>
                <div style={greetingTextStyle}>
                  Good Morning <span role="img" aria-label="waving hand">👋</span>
                </div>
                <h1 style={titleHeadingStyle}>
                  Ready to inspect fabric?
                </h1>
              </div>

              {/* Right side profile button: NO CHARACTER (User silhouette icon) -> Goes to profile page */}
              <button
                onClick={() => setActiveTab('profile')}
                style={profileIconBtnStyle}
                title="Go to Profile"
                aria-label="Profile"
              >
                <User size={22} color="#ffffff" strokeWidth={2.2} />
              </button>
            </div>

            {/* ── Primary Action Button ── */}
            <button
              onClick={() => handleTabChange('inspect')}
              style={startInspectionBtnStyle}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Scan size={22} color="#ffffff" strokeWidth={2.4} />
              <span>Start New Inspection</span>
            </button>

            {/* ── 2x2 Metrics Grid (Values are null) ── */}
            <div style={metricsGridStyle}>
              {/* Total Inspections */}
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Total Inspections</div>
                <div style={{
                  ...metricValStyle,
                  color: totalInspections === 'null' ? '#64748b' : '#1e293b',
                  fontSize: totalInspections === 'null' ? '28px' : '32px'
                }}>
                  {totalInspections}
                </div>
              </div>

              {/* Defects Found */}
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Defects Found</div>
                <div style={{
                  ...metricValStyle,
                  color: defectsFound === 'null' ? '#64748b' : '#dc2626',
                  fontSize: defectsFound === 'null' ? '28px' : '32px'
                }}>
                  {defectsFound}
                </div>
              </div>

              {/* Grade A Batches */}
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Grade A Batches</div>
                <div style={{
                  ...metricValStyle,
                  color: gradeABatches === 'null' ? '#64748b' : '#16a34a',
                  fontSize: gradeABatches === 'null' ? '28px' : '32px'
                }}>
                  {gradeABatches}
                </div>
              </div>

              {/* Last Active */}
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Last Active</div>
                <div style={{
                  ...metricValStyle,
                  color: '#64748b',
                  fontSize: lastActive === 'null' ? '26px' : '16px',
                  marginTop: '10px',
                  lineHeight: 1.25
                }}>
                  {lastActive}
                </div>
              </div>
            </div>

            {/* ── Recent Inspections Section (All null) ── */}
            <div style={sectionHeaderRowStyle}>
              <h2 style={sectionHeadingStyle}>Recent Inspections</h2>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>null</span>
            </div>

            {inspections.length === 0 ? (
              /* All null / empty state as requested */
              <div style={nullRecentInspectionsStyle}>
                <div style={nullIconCircleStyle}>
                  <Layers size={24} color="#64748b" />
                </div>
                <div style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '700' }}>
                  null
                </div>
                <p style={{ color: '#64748b', fontSize: '12.5px', margin: '4px 0 0', textAlign: 'center', lineHeight: 1.4 }}>
                  No recent inspections found. Tap "Start New Inspection" to scan fabric batches.
                </p>
              </div>
            ) : (
              inspections.map((item) => (
                <div key={item.id} style={inspectionCardStyle}>
                  <div style={itemLeftGroupStyle}>
                    <img
                      src={item.type === 'silk' ? kanchipuramSilk : indigoDenim}
                      alt={item.title}
                      style={itemThumbnailStyle}
                    />
                    <div>
                      <div style={itemTitleStyle}>{item.title}</div>
                      <div style={itemSubtitleStyle}>{item.time}</div>
                    </div>
                  </div>
                  <div style={item.grade === 'GRADE A' ? gradeBadgeAStyle : gradeBadgeBStyle}>
                    {item.grade}
                  </div>
                </div>
              ))
            )}

          </div>
        )}

        {/* ── TAB 2: INSPECT PAGE ── */}
        {activeTab === 'inspect' && (
          <div style={{
            ...contentScrollStyle,
            backgroundColor: inspectPhase === 'results_flow' ? '#f8fafc' : '#161922',
            padding: inspectPhase === 'results_flow' ? 0 : '18px 16px 24px',
          }}>

            {/* ── Hidden file inputs ── */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCameraChange}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUploadChange}
            />

            {/* ═══════════════════════════════════════════
                PHASE: IDLE — New Inspection picker screen
            ═══════════════════════════════════════════ */}
            {inspectPhase === 'idle' && (
              <>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '28px', paddingTop: '8px' }}>
                  <h2 style={{
                    fontSize: '22px', fontWeight: '800', color: '#ffffff',
                    letterSpacing: '-0.02em', margin: 0,
                  }}>New Inspection</h2>
                </div>

                {/* Take Photo card — opens live system camera */}
                <div
                  onClick={() => startLiveCamera()}
                  style={inspectOptionCardStyle}
                >
                  <div style={inspectOptionIconBoxStyle}>
                    <Camera size={32} color="#1b7a63" strokeWidth={1.8} />
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', marginTop: '14px' }}>Take Photo</div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>Open live system camera to scan</div>
                </div>

                {/* Upload Image card */}
                <div
                  onClick={() => uploadInputRef.current?.click()}
                  style={{ ...inspectOptionCardStyle, marginBottom: '24px' }}
                >
                  <div style={inspectOptionIconBoxStyle}>
                    <Upload size={32} color="#7c8fa6" strokeWidth={1.8} />
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', marginTop: '14px' }}>Upload Image</div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>Select from gallery or device</div>
                </div>

                {/* Tip */}
                <div style={inspectTipStyle}>
                  Place the fabric flat and make sure the surface is clearly visible under good lighting.
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════
                PHASE: CAMERA — Live system camera viewfinder
            ═══════════════════════════════════════════ */}
            {inspectPhase === 'camera' && (
              <div style={cameraContainerStyle}>
                {/* Camera Top Bar */}
                <div style={cameraHeaderStyle}>
                  <button
                    onClick={handleCloseCamera}
                    style={cameraBackBtnStyle}
                    aria-label="Back to selection"
                  >
                    <ArrowLeft size={20} color="#ffffff" />
                  </button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '15px' }}>Live Camera</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '500' }}>Align fabric within frame</div>
                  </div>
                  <button
                    onClick={handleToggleFacingMode}
                    style={cameraFlipBtnStyle}
                    title="Switch Camera"
                    aria-label="Switch Camera"
                  >
                    <RefreshCw size={18} color="#ffffff" />
                  </button>
                </div>

                {/* Viewfinder or Error view */}
                {cameraError ? (
                  <div style={cameraErrorBoxStyle}>
                    <AlertCircle size={42} color="#ef4444" style={{ marginBottom: '14px' }} />
                    <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>
                      Camera Unavailable
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginBottom: '22px', lineHeight: 1.5 }}>
                      {cameraError}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      <button
                        onClick={() => startLiveCamera()}
                        style={cameraRetryBtnStyle}
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => uploadInputRef.current?.click()}
                        style={cameraUploadFallbackBtnStyle}
                      >
                        <Upload size={16} /> Choose Image File Instead
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={viewfinderFrameStyle}>
                    {/* Live Video Feed */}
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && cameraStream && el.srcObject !== cameraStream) {
                          el.srcObject = cameraStream;
                          el.play().catch((e) => console.log('Video play error:', e));
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      }}
                    />

                    {/* Camera Initializing Loader */}
                    {isCameraLoading && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        zIndex: 8,
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          border: '3px solid rgba(27,122,99,0.3)',
                          borderTopColor: '#5eead4',
                          borderRadius: '50%',
                          animation: 'fabricSpin 1s linear infinite',
                        }} />
                        <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                          Opening live camera...
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                          Please allow camera access in your browser
                        </div>
                      </div>
                    )}

                    {/* Shutter flash overlay */}
                    {isShutterActive && <div style={shutterFlashOverlayStyle} />}

                    {/* Reticle brackets (4 corners) */}
                    <div style={reticleTopLeftStyle} />
                    <div style={reticleTopRightStyle} />
                    <div style={reticleBottomLeftStyle} />
                    <div style={reticleBottomRightStyle} />

                    {/* Real-time scanning beam animation */}
                    <div style={scannerBeamStyle} />

                    {/* 3x3 Grid Overlay */}
                    <div style={viewfinderGridOverlayStyle} />

                    {/* Live badge */}
                    <div style={viewfinderBadgeStyle}>
                      <div style={livePulseDotStyle} />
                      <span>LIVE SYSTEM FEED</span>
                    </div>
                  </div>
                )}

                {/* Camera Bottom Controls */}
                <div style={cameraBottomControlsStyle}>
                  {/* File upload fallback button */}
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    style={cameraSecondaryBtnStyle}
                    title="Upload file instead"
                  >
                    <Upload size={20} color="#ffffff" />
                  </button>

                  {/* Large Shutter Button */}
                  <button
                    onClick={handleCapturePhoto}
                    disabled={!!cameraError}
                    style={{
                      ...shutterBtnOuterStyle,
                      opacity: cameraError ? 0.35 : 1,
                      cursor: cameraError ? 'not-allowed' : 'pointer',
                    }}
                    aria-label="Capture Photo"
                  >
                    <div style={shutterBtnInnerStyle} />
                  </button>

                  {/* Flip camera shortcut */}
                  <button
                    onClick={handleToggleFacingMode}
                    style={cameraSecondaryBtnStyle}
                    title="Flip camera"
                  >
                    <RefreshCw size={20} color="#ffffff" />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════
                PHASE: ANALYZING — Progress steps (image 2)
            ═══════════════════════════════════════════ */}
            {inspectPhase === 'analyzing' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 20px' }}>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h2 style={{
                    fontSize: '26px', fontWeight: '800', color: '#ffffff',
                    letterSpacing: '-0.02em', margin: '0 0 6px',
                  }}>
                    Analyzing fabric...
                  </h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    FabriSense AI is processing your input
                  </p>
                </div>

                {/* Circular spinner */}
                <div style={{
                  width: '110px', height: '110px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '32px',
                  position: 'relative',
                  background: 'radial-gradient(circle, rgba(27,122,99,0.15) 0%, transparent 70%)',
                  boxShadow: '0 0 0 2.5px rgba(27,122,99,0.55)',
                  animation: 'fabricSpin 2s linear infinite',
                }}>
                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      alt="Fabric preview"
                      style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Scan size={40} color="#1b7a63" strokeWidth={1.8} />
                  )}
                </div>

                {/* Step list */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                  {ANALYSIS_STEPS.map((step, idx) => {
                    const isDone    = analysisStep > idx;
                    const isActive  = analysisStep === idx;
                    return (
                      <div key={step.id} style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                      }}>
                        {/* Step indicator circle */}
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isDone ? '#1b7a63' : 'transparent',
                          border: isDone ? 'none' : `2px solid ${isActive ? '#1b7a63' : 'rgba(255,255,255,0.2)'}`,
                          boxShadow: isActive ? '0 0 8px rgba(27,122,99,0.6)' : 'none',
                          transition: 'all 0.4s ease',
                        }}>
                          {isDone && <CheckCircle size={15} color="#ffffff" strokeWidth={2.5} />}
                          {isActive && <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: '#1b7a63',
                            animation: 'pulse 0.9s ease-in-out infinite',
                          }} />}
                        </div>
                        <span style={{
                          fontSize: '14.5px', fontWeight: isDone || isActive ? '700' : '500',
                          color: isDone ? '#ffffff' : isActive ? '#5eead4' : 'rgba(255,255,255,0.35)',
                          transition: 'all 0.4s ease',
                        }}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Time note */}
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', textAlign: 'center' }}>
                  Usually takes less than 10 seconds.
                </p>
              </div>
            )}

            {/* ═══════════════════════════════════════════
                PHASE: 4-PAGE POST-PROCESSING RESULT FLOW
            ═══════════════════════════════════════════ */}
            {inspectPhase === 'results_flow' && (
              <InspectionResultFlow
                capturedImage={capturedImage}
                resultType={analysisResultType}
                onSaveBatch={handleSaveBatchFromFlow}
                onBackToHome={() => handleTabChange('home')}
                onRescan={handleRescan}
                userData={userData}
              />
            )}
          </div>
        )}

        {/* ── TAB 3: PROFILE PAGE ── */}
        {activeTab === 'profile' && (
          <div style={profilePageStyle}>

            {/* ── Dark Navy Header Card ── */}
            <div style={profileHeaderCardStyle}>
              {/* Avatar: placeholder logo — user adds photo via Account Settings */}
              <div style={profileAvatarCircleStyle}>
                <User size={42} color="#ffffff" strokeWidth={2} />
              </div>
              <div style={profileNameStyle}>{displayName}</div>
              <div style={profileEmailStyle}>{displayEmail}</div>
            </div>

            {/* ── Menu List Card ── */}
            <div style={profileMenuCardStyle}>
              {[
                { icon: <Settings size={20} color="#334155" strokeWidth={2} />, label: 'Account Settings' },
                { icon: <Bell    size={20} color="#334155" strokeWidth={2} />, label: 'Notifications'    },
                { icon: <Globe   size={20} color="#334155" strokeWidth={2} />, label: 'Language'         },
                { icon: <HelpCircle size={20} color="#334155" strokeWidth={2} />, label: 'Help & Support' },
                { icon: <Info    size={20} color="#334155" strokeWidth={2} />, label: 'About FabriSense', last: true },
              ].map(({ icon, label, last }) => (
                <div key={label} style={{ ...profileMenuRowStyle, borderBottom: last ? 'none' : '1px solid #f1f5f9' }}>
                  <div style={profileMenuRowLeftStyle}>
                    <div style={profileMenuIconBoxStyle}>{icon}</div>
                    <span style={profileMenuLabelStyle}>{label}</span>
                  </div>
                  <ChevronRight size={18} color="#cbd5e1" strokeWidth={2.5} />
                </div>
              ))}
            </div>

            {/* ── Logout Button ── */}
            <button onClick={onLogout} style={profileLogoutBtnStyle}>
              Logout
            </button>

          </div>
        )}

        {/* ── TAB 4: HISTORY PAGE ── */}
        {activeTab === 'history' && (
          <div style={contentScrollStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => setActiveTab('home')}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Inspection History
              </h2>
            </div>

            {inspections.length === 0 ? (
              <div style={nullRecentInspectionsStyle}>
                <div style={nullIconCircleStyle}>
                  <History size={24} color="#64748b" />
                </div>
                <div style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '700' }}>
                  null
                </div>
                <p style={{ color: '#64748b', fontSize: '12.5px', margin: '4px 0 0', textAlign: 'center' }}>
                  No inspection history found.
                </p>
              </div>
            ) : (
              inspections.map((item) => (
                <div key={item.id} style={inspectionCardStyle}>
                  <div style={itemLeftGroupStyle}>
                    <img
                      src={item.type === 'silk' ? kanchipuramSilk : indigoDenim}
                      alt={item.title}
                      style={itemThumbnailStyle}
                    />
                    <div>
                      <div style={itemTitleStyle}>{item.title}</div>
                      <div style={itemSubtitleStyle}>{item.time}</div>
                    </div>
                  </div>
                  <div style={item.grade === 'GRADE A' ? gradeBadgeAStyle : gradeBadgeBStyle}>
                    {item.grade}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Bottom Navigation Bar ── */}
        <div style={bottomNavContainerStyle}>
          <div style={navTabsRowStyle}>
            
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab('home')}
              style={navTabBtnStyle}
            >
              <Home
                size={22}
                color={activeTab === 'home' ? '#1b7a63' : '#94a3b8'}
                strokeWidth={activeTab === 'home' ? 2.5 : 2}
              />
              <span style={{
                ...navTabLabelStyle,
                color: activeTab === 'home' ? '#1b7a63' : '#94a3b8',
                fontWeight: activeTab === 'home' ? '700' : '500',
              }}>
                Home
              </span>
            </button>

            {/* Inspect Tab */}
            <button
              onClick={() => handleTabChange('inspect')}
              style={navTabBtnStyle}
            >
              <Scan
                size={22}
                color={activeTab === 'inspect' ? '#1b7a63' : '#94a3b8'}
                strokeWidth={activeTab === 'inspect' ? 2.5 : 2}
              />
              <span style={{
                ...navTabLabelStyle,
                color: activeTab === 'inspect' ? '#1b7a63' : '#94a3b8',
                fontWeight: activeTab === 'inspect' ? '700' : '500',
              }}>
                Inspect
              </span>
            </button>

            {/* History Tab */}
            <button
              onClick={() => handleTabChange('history')}
              style={navTabBtnStyle}
            >
              <History
                size={22}
                color={activeTab === 'history' ? '#1b7a63' : '#94a3b8'}
                strokeWidth={2}
              />
              <span style={{
                ...navTabLabelStyle,
                color: activeTab === 'history' ? '#1b7a63' : '#94a3b8',
                fontWeight: activeTab === 'history' ? '700' : '500',
              }}>
                History
              </span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => handleTabChange('profile')}
              style={navTabBtnStyle}
            >
              <User
                size={22}
                color={activeTab === 'profile' ? '#1b7a63' : '#94a3b8'}
                strokeWidth={2}
              />
              <span style={{
                ...navTabLabelStyle,
                color: activeTab === 'profile' ? '#1b7a63' : '#94a3b8',
                fontWeight: activeTab === 'profile' ? '700' : '500',
              }}>
                Profile
              </span>
            </button>

          </div>


        </div>

      </div>

      {/* (old modal removed — inspect flow is now inline in the Inspect tab) */}
      {false && (
        <div style={modalOverlayStyle} onClick={() => setShowInspectionModal(false)}>
          <div style={{ ...bottomSheetStyle, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={sheetHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isScanning ? '#ef4444' : '#16a34a' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {isScanning ? 'AI Optical Scanning...' : 'Inspection Complete'}
                </h3>
              </div>
              <button
                onClick={() => setShowInspectionModal(false)}
                style={closeBtnStyle}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Viewfinder Preview Box */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '220px',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#000',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={kanchipuramSilk}
                alt="Fabric Scan Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              />

              {/* Viewfinder Bounding Guides */}
              <div style={{
                position: 'absolute',
                inset: '20px',
                border: '2px dashed rgba(255, 255, 255, 0.7)',
                borderRadius: '12px',
                pointerEvents: 'none',
              }} />

              {isScanning && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#5eead4',
                  boxShadow: '0 0 12px #5eead4',
                  animation: 'pulse 1s infinite',
                }} />
              )}

              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(6px)',
                padding: '4px 10px',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                {isScanning ? 'Analyzing thread density...' : '99.4% Match Verified'}
              </div>
            </div>

            {isScanning ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                  Inspecting weft warp tension & surface integrity...
                </div>
              </div>
            ) : scanResult ? (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '14px',
                }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{scanResult.fabric}</div>
                    <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                      ✓ Zero Defects Detected
                    </div>
                  </div>
                  <div style={gradeBadgeAStyle}>{scanResult.grade}</div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleStartInspection}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={15} /> Re-scan
                  </button>
                  <button
                    onClick={handleSaveBatch}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#1b7a63',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={16} /> Save Batch
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const outerWrapperStyle = {
  width: '100%',
  minHeight: '100vh',
  backgroundColor: '#0c1017',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  userSelect: 'none',
  padding: '0',
};

const mobileFrameStyle = {
  width: '100%',
  maxWidth: '390px',
  height: 'min(844px, 100vh)',
  backgroundColor: '#161922',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  borderRadius: '32px',
  overflow: 'hidden',
};

const statusBarStyle = {
  width: '100%',
  height: '44px',
  padding: '12px 24px 0 26px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box',
  flexShrink: 0,
  zIndex: 10,
};

const statusBarTimeStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#ffffff',
  letterSpacing: '-0.02em',
};

const statusBarIconsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
};

const contentScrollStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px 96px 20px',
  boxSizing: 'border-box',
};

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px',
};

const greetingTextStyle = {
  fontSize: '13.5px',
  fontWeight: '500',
  color: '#94a3b8',
  marginBottom: '4px',
};

const titleHeadingStyle = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: '-0.02em',
  margin: 0,
  lineHeight: '1.25',
};

const profileIconBtnStyle = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  backgroundColor: '#1e2532',
  border: '1.5px solid rgba(255, 255, 255, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  transition: 'transform 0.15s ease, background-color 0.2s ease',
};

const startInspectionBtnStyle = {
  width: '100%',
  height: '52px',
  backgroundColor: '#1b7a63',
  border: 'none',
  borderRadius: '16px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(27, 122, 99, 0.35)',
  transition: 'transform 0.1s ease, background-color 0.2s ease',
  marginBottom: '18px',
};

const metricsGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  marginBottom: '24px',
};

const metricCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '16px 16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: '88px',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
};

const metricLabelStyle = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  letterSpacing: '-0.01em',
};

const metricValStyle = {
  fontSize: '32px',
  fontWeight: '800',
  letterSpacing: '-0.03em',
  marginTop: '4px',
  lineHeight: 1,
};

const sectionHeaderRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '14px',
};

const sectionHeadingStyle = {
  fontSize: '17px',
  fontWeight: '700',
  color: '#ffffff',
  margin: 0,
  letterSpacing: '-0.01em',
};

const nullRecentInspectionsStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '24px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '12px',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
};

const nullIconCircleStyle = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  backgroundColor: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '8px',
};

const inspectionCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  cursor: 'pointer',
};

const itemLeftGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const itemThumbnailStyle = {
  width: '50px',
  height: '50px',
  borderRadius: '10px',
  objectFit: 'cover',
  flexShrink: 0,
};

const itemTitleStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#1e293b',
  letterSpacing: '-0.01em',
};

const itemSubtitleStyle = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '2px',
};

const gradeBadgeAStyle = {
  backgroundColor: '#e8f7ee',
  color: '#15803d',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  padding: '6px 12px',
  borderRadius: '8px',
  flexShrink: 0,
};

const gradeBadgeBStyle = {
  backgroundColor: '#fef3c7',
  color: '#b45309',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  padding: '6px 12px',
  borderRadius: '8px',
  flexShrink: 0,
};

const bottomNavContainerStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#ffffff',
  borderTop: '1px solid #f1f5f9',
  borderBottomLeftRadius: '32px',
  borderBottomRightRadius: '32px',
  padding: '10px 16px 8px 16px',
  boxSizing: 'border-box',
  zIndex: 20,
};

const navTabsRowStyle = {
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
};

const navTabBtnStyle = {
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  cursor: 'pointer',
  padding: '4px 10px',
  borderRadius: '8px',
};

const navTabLabelStyle = {
  fontSize: '11px',
  letterSpacing: '-0.01em',
};

const homeIndicatorStyle = {
  width: '134px',
  height: '4px',
  backgroundColor: '#1e293b',
  borderRadius: '100px',
  margin: '8px auto 0 auto',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 1000,
};

const bottomSheetStyle = {
  width: '100%',
  maxWidth: '390px',
  backgroundColor: '#ffffff',
  borderTopLeftRadius: '24px',
  borderTopRightRadius: '24px',
  padding: '24px 20px',
  boxSizing: 'border-box',
  boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
};

const sheetHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '18px',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
};

// ── Inspect tab styles ──────────────────────────────────────────────────────

const inspectOptionCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '28px 20px 22px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  marginBottom: '14px',
  cursor: 'pointer',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  border: '1.5px solid #f1f5f9',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const inspectOptionIconBoxStyle = {
  width: '72px',
  height: '72px',
  borderRadius: '18px',
  backgroundColor: '#f0fdf4',
  border: '1.5px solid rgba(27,122,99,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const inspectTipStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '14px 16px',
  fontSize: '12.5px',
  color: '#64748b',
  lineHeight: 1.55,
  textAlign: 'center',
};

// ── Live Camera Styles ───────────────────────────────────────────────────────

const cameraContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: '480px',
  justifyContent: 'space-between',
};

const cameraHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
};

const cameraBackBtnStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.1)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

const cameraFlipBtnStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.1)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

const viewfinderFrameStyle = {
  position: 'relative',
  width: '100%',
  height: '340px',
  borderRadius: '24px',
  overflow: 'hidden',
  backgroundColor: '#000000',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(27,122,99,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const shutterFlashOverlayStyle = {
  position: 'absolute',
  inset: 0,
  backgroundColor: '#ffffff',
  animation: 'shutterFlash 0.2s ease-out forwards',
  zIndex: 10,
};

const reticleTopLeftStyle = {
  position: 'absolute',
  top: '16px',
  left: '16px',
  width: '28px',
  height: '28px',
  borderTop: '3.5px solid #1b7a63',
  borderLeft: '3.5px solid #1b7a63',
  borderTopLeftRadius: '6px',
  zIndex: 4,
  pointerEvents: 'none',
};

const reticleTopRightStyle = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  width: '28px',
  height: '28px',
  borderTop: '3.5px solid #1b7a63',
  borderRight: '3.5px solid #1b7a63',
  borderTopRightRadius: '6px',
  zIndex: 4,
  pointerEvents: 'none',
};

const reticleBottomLeftStyle = {
  position: 'absolute',
  bottom: '16px',
  left: '16px',
  width: '28px',
  height: '28px',
  borderBottom: '3.5px solid #1b7a63',
  borderLeft: '3.5px solid #1b7a63',
  borderBottomLeftRadius: '6px',
  zIndex: 4,
  pointerEvents: 'none',
};

const reticleBottomRightStyle = {
  position: 'absolute',
  bottom: '16px',
  right: '16px',
  width: '28px',
  height: '28px',
  borderBottom: '3.5px solid #1b7a63',
  borderRight: '3.5px solid #1b7a63',
  borderBottomRightRadius: '6px',
  zIndex: 4,
  pointerEvents: 'none',
};

const scannerBeamStyle = {
  position: 'absolute',
  left: '12px',
  right: '12px',
  height: '3px',
  background: 'linear-gradient(90deg, transparent 0%, #1b7a63 30%, #5eead4 50%, #1b7a63 70%, transparent 100%)',
  boxShadow: '0 0 12px 2px rgba(94, 234, 212, 0.8)',
  animation: 'scanBeam 2.4s ease-in-out infinite alternate',
  zIndex: 5,
  pointerEvents: 'none',
};

const viewfinderGridOverlayStyle = {
  position: 'absolute',
  inset: '16px',
  border: '1px dashed rgba(255,255,255,0.12)',
  backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
  backgroundSize: '33.33% 33.33%',
  zIndex: 3,
  pointerEvents: 'none',
};

const viewfinderBadgeStyle = {
  position: 'absolute',
  top: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(15,23,42,0.85)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '20px',
  padding: '4px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '10.5px',
  fontWeight: '700',
  letterSpacing: '0.04em',
  color: '#e2e8f0',
  zIndex: 6,
  pointerEvents: 'none',
};

const livePulseDotStyle = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  animation: 'pulse 1.2s ease-in-out infinite',
};

const cameraBottomControlsStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  paddingTop: '20px',
  paddingBottom: '8px',
};

const shutterBtnOuterStyle = {
  width: '74px',
  height: '74px',
  borderRadius: '50%',
  border: '4px solid #ffffff',
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  boxShadow: '0 0 20px rgba(0,0,0,0.4)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const shutterBtnInnerStyle = {
  width: '58px',
  height: '58px',
  borderRadius: '50%',
  backgroundColor: '#1b7a63',
  transition: 'transform 0.15s ease, background-color 0.15s ease',
};

const cameraSecondaryBtnStyle = {
  width: '46px',
  height: '46px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease, transform 0.15s ease',
};

const cameraErrorBoxStyle = {
  backgroundColor: '#1e2430',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '20px',
  padding: '32px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const cameraRetryBtnStyle = {
  backgroundColor: '#1b7a63',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  padding: '12px 20px',
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
  width: '100%',
};

const cameraUploadFallbackBtnStyle = {
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '12px',
  padding: '12px 20px',
  fontWeight: '600',
  fontSize: '13.5px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
};

// Inject CSS keyframes for spinning ring, pulse dot, and scanner beam
if (typeof document !== 'undefined') {
  const styleEl = document.getElementById('dashboard-keyframes') || (() => {
    const el = document.createElement('style');
    el.id = 'dashboard-keyframes';
    document.head.appendChild(el);
    return el;
  })();
  styleEl.textContent = `
    @keyframes fabricSpin {
      0%   { box-shadow: 0 0 0 2.5px rgba(27,122,99,0.55), 0 0 0 5px rgba(27,122,99,0.15); transform: rotate(0deg); }
      100% { box-shadow: 0 0 0 2.5px rgba(27,122,99,0.55), 0 0 0 5px rgba(27,122,99,0.15); transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.7); }
    }
    @keyframes scanBeam {
      0%   { top: 5%; opacity: 0.2; }
      20%  { opacity: 0.9; }
      80%  { opacity: 0.9; }
      100% { top: 92%; opacity: 0.2; }
    }
    @keyframes shutterFlash {
      0%   { opacity: 0.9; }
      100% { opacity: 0; }
    }
  `;
}

// ── Profile Page Styles ──────────────────────────────────────────────────────────────────
const profilePageStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  backgroundColor: '#f3f5f8',
  padding: '0 0 24px 0',
  overflowY: 'auto',
};

// Dark navy rounded header card
const profileHeaderCardStyle = {
  background: 'linear-gradient(160deg, #13223a 0%, #162035 100%)',
  borderBottomLeftRadius: '32px',
  borderBottomRightRadius: '32px',
  padding: '44px 24px 32px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  marginBottom: '20px',
};

// Avatar circle — placeholder User icon, no photo
const profileAvatarCircleStyle = {
  width: '88px',
  height: '88px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #1b7a63 0%, #0d9488 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '14px',
  border: '3px solid rgba(255,255,255,0.18)',
  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
};

const profileNameStyle = {
  fontSize: '20px',
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: '-0.02em',
  marginBottom: '4px',
};

const profileEmailStyle = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.55)',
  fontWeight: '400',
};

// White rounded card containing the menu rows
const profileMenuCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  marginInline: '16px',
  marginBottom: '16px',
  overflow: 'hidden',
  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
};

const profileMenuRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '15px 18px',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
};

const profileMenuRowLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
};

const profileMenuIconBoxStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  backgroundColor: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const profileMenuLabelStyle = {
  fontSize: '14.5px',
  fontWeight: '600',
  color: '#1e293b',
};

// Soft-pink logout button
const profileLogoutBtnStyle = {
  marginInline: '16px',
  width: 'calc(100% - 32px)',
  padding: '15px',
  borderRadius: '16px',
  backgroundColor: '#fff1f2',
  color: '#dc2626',
  border: '1px solid #fecdd3',
  fontWeight: '700',
  fontSize: '15px',
  cursor: 'pointer',
  letterSpacing: '0.01em',
};

export default Dashboard;

