import React, { useState, useRef, useEffect } from 'react';
import {
  Scan, Home, History, User, LogOut,
  CheckCircle2, X, ShieldCheck, Layers, ArrowLeft,
  Camera, Upload, RefreshCw, CheckCircle, AlertCircle,
  Settings, Bell, Globe, HelpCircle, Info, ChevronRight,
  Edit3, Check, Phone, Mail, Building, Sparkles,
  Share2, Download, FileText, ChevronDown, ChevronUp,
  Printer, Copy, Award, Tag
} from 'lucide-react';
import jsPDF from 'jspdf';
import { InspectionResultFlow } from './InspectionResultFlow';
import { syncInspectionRecord, fetchInspectionsList, analyzeFabricImage, analyzeLiveFabricFrame, resolveApiAssetUrl } from '../services/api';
import kanchipuramSilk from '../assets/kanchipuram_silk.jpg';
import indigoDenim from '../assets/indigo_denim.jpg';
import InspectionImageReview from './InspectionImageReview';

// Analysis steps shown in image 2
const ANALYSIS_STEPS = [
  { id: 'received', label: 'Image received' },
  { id: 'defects',  label: 'Detecting defects' },
  { id: 'quality',  label: 'Checking fabric quality' },
  { id: 'results',  label: 'Preparing results' },
];

export function Dashboard({ userData = {}, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const inspectorEmail = (userData?.email || '').trim().toLowerCase();
  const inspectionStorageKey = inspectorEmail
    ? `fabrisense_inspections:${inspectorEmail}`
    : null;

  // ── Inspect flow: 'idle' | 'camera' | 'analyzing' | 'results_flow'
  const [inspectPhase, setInspectPhase]         = useState('idle');
  const [analysisStep, setAnalysisStep]         = useState(-1);
  const [capturedImage, setCapturedImage]       = useState(null);
  // 'defects_found' | 'no_defects' | 'invalid_image'
  const [analysisResultType, setAnalysisResultType] = useState('defects_found');
  const [analysisDefectData, setAnalysisDefectData] = useState(null);

  // ── Live Camera Stream State ──
  const [cameraError, setCameraError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [facingMode, setFacingMode]   = useState('environment');
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [isLiveDetecting, setIsLiveDetecting] = useState(false);
  const [liveDefects, setLiveDefects] = useState([]);
  const [liveDetectionError, setLiveDetectionError] = useState('');
  const [liveAiMode, setLiveAiMode] = useState('');
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const liveFrameInFlightRef = useRef(false);
  const liveDetectionSessionRef = useRef(0);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const [inspections, setInspections] = useState(() => {
    if (!inspectionStorageKey) return [];
    try {
      const saved = localStorage.getItem(inspectionStorageKey);
      if (saved) {
        const records = JSON.parse(saved);
        return Array.isArray(records) ? records : [];
      }

      const legacy = JSON.parse(localStorage.getItem('fabrisense_inspections') || '[]');
      const userRecords = Array.isArray(legacy)
        ? legacy.filter((record) => record.inspectorEmail?.trim().toLowerCase() === inspectorEmail)
        : [];
      if (userRecords.length > 0) {
        localStorage.setItem(inspectionStorageKey, JSON.stringify(userRecords));
      }
      return userRecords;
    } catch (e) {
      return [];
    }
  });

  const [selectedInspection, setSelectedInspection] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'grade_a' | 'with_defects'
  const [expandedDetailDefects, setExpandedDetailDefects] = useState({});
  const [copyDetailToast, setCopyDetailToast] = useState(false);

  // ── Profile State & Settings Modals ──
  const [profileUser, setProfileUser] = useState(() => {
    let storedAvatar = null;
    try { storedAvatar = localStorage.getItem('fabrisense_profile_avatar'); } catch (e) {}
    return {
      name: userData?.name || 'Rajesh Kumar',
      email: userData?.email || 'rajesh@textileco.com',
      phone: userData?.phone || '+91 98765 43210',
      company: userData?.company || 'Textile Co. Manufacturing',
      avatar: storedAvatar || userData?.avatar || null,
      language: 'English (US)',
      notifications: {
        push: true,
        email: true,
        defects: true,
        reports: false,
      }
    };
  });

  const avatarInputRef = useRef(null);

  // Keep profile synchronized with login / account creation user session
  useEffect(() => {
    if (userData?.name || userData?.email) {
      setProfileUser(prev => ({
        ...prev,
        name: userData.name || prev.name,
        email: userData.email || prev.email,
      }));
    }
  }, [userData]);

  const [activeProfileModal, setActiveProfileModal] = useState(null); // null | 'account' | 'notifications' | 'language' | 'help' | 'about'
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setProfileUser(prev => {
        const updated = { ...prev, avatar: dataUrl };
        try { localStorage.setItem('fabrisense_profile_avatar', dataUrl); } catch (err) {}
        return updated;
      });
      showToast('Profile picture updated successfully!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setProfileUser(prev => {
      const updated = { ...prev, avatar: null };
      try { localStorage.removeItem('fabrisense_profile_avatar'); } catch (err) {}
      return updated;
    });
    showToast('Profile picture reset to contact logo');
  };

  const openAccountModal = () => {
    setEditForm({
      name: profileUser.name,
      email: profileUser.email,
      phone: profileUser.phone,
      company: profileUser.company,
    });
    setActiveProfileModal('account');
  };

  const handleSaveAccount = (e) => {
    e?.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) return;
    setProfileUser(prev => ({
      ...prev,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim() || prev.phone,
      company: editForm.company.trim() || prev.company,
    }));
    setActiveProfileModal(null);
    showToast('Account settings updated successfully!');
  };

  const handleToggleNotification = (key) => {
    setProfileUser(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      }
    }));
  };

  const handleSaveNotifications = () => {
    setActiveProfileModal(null);
    showToast('Notification preferences saved!');
  };

  const handleSelectLanguage = (lang) => {
    setProfileUser(prev => ({ ...prev, language: lang }));
    setActiveProfileModal(null);
    showToast(`Language set to ${lang}`);
  };

  // Fetch this inspector's own inspection history; dashboard totals derive from these records.
  useEffect(() => {
    let isMounted = true;
    const fetchSharedInspections = async () => {
      if (!inspectorEmail) {
        setInspections([]);
        return;
      }

      try {
        const records = [];
        let page = 1;
        let totalPages = 1;
        do {
          const result = await fetchInspectionsList({
            inspectorEmail,
            limit: 100,
            page,
          });
          if (!result?.success || !Array.isArray(result.data)) {
            throw new Error('The inspection history response was invalid.');
          }
          records.push(...result.data);
          totalPages = result.pagination?.totalPages || 1;
          page += 1;
        } while (page <= totalPages);

        if (isMounted) {
          const mapped = records.map((item) => {
              const cleanGrade = (item.grade || 'B').replace(/^GRADE\s*/i, '').trim();
              let parsedDefects = [];
              if (Array.isArray(item.defects)) {
                parsedDefects = item.defects;
              } else if (typeof item.defects === 'string') {
                try {
                  parsedDefects = JSON.parse(item.defects);
                } catch (_) {
                  parsedDefects = [];
                }
              }
              const isDenim = (item.fabric_type || item.fabric_name || '').toLowerCase().includes('denim');
              const isSilk = (item.fabric_type || item.fabric_name || '').toLowerCase().includes('silk');
              const isUploadedImage = item.image_path && !item.image_path.startsWith('/assets/');
              const resolvedImage = isUploadedImage
                ? resolveApiAssetUrl(item.image_path)
                : (isSilk ? kanchipuramSilk : isDenim ? indigoDenim : (item.image_path || indigoDenim));

              const itemDefectCount = item.defect_count !== undefined ? item.defect_count : parsedDefects.length;

              return {
                id: item.inspection_id || item.id,
                title: item.fabric_name || item.fabric_type || 'Fabric Roll',
                fabricType: item.fabric_type || item.fabric_name || 'Handloom Cotton-Silk Blend',
                time: item.inspection_date ? new Date(item.inspection_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent scan',
                date: item.inspection_date || new Date().toISOString(),
                grade: `GRADE ${cleanGrade}`,
                defects: itemDefectCount,
                type: isDenim ? 'denim' : 'silk',
                status: item.status || (cleanGrade === 'A' ? 'Passed' : cleanGrade === 'B' ? 'Review' : 'Failed'),
                image: resolvedImage,
                imagePath: item.image_path || '/assets/indigo_denim.jpg',
                overallSummary: item.overall_summary || '',
                aiExplanation: item.ai_explanation || item.overall_summary || '',
                gradeExplanation: item.grade_explanation || '',
                recommendedAction: item.recommended_action || '',
                inspectorName: item.inspector_name || userData?.name || '',
                inspectorEmail: item.inspector_email || inspectorEmail,
                defectsList: parsedDefects,
                raw: item,
              };
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setInspections(mapped);
          try {
            localStorage.setItem(inspectionStorageKey, JSON.stringify(mapped));
          } catch (storageError) {
            console.error('Failed to cache this user inspection history:', storageError);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch this user inspection history:', err);
      }
    };
    void fetchSharedInspections();
    return () => { isMounted = false; };
  }, [inspectionStorageKey, inspectorEmail, userData?.name]);

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

  const startLiveCamera = async (mode = facingMode, enableLiveDetection = false) => {
    liveDetectionSessionRef.current += 1;
    stopLiveCamera();
    setCameraError(null);
    setLiveDetectionError('');
    setLiveDefects([]);
    setLiveAiMode('');
    setIsLiveDetecting(enableLiveDetection);
    setIsCameraLoading(true);
    setInspectPhase('camera');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this browser/environment.');
      setIsLiveDetecting(false);
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
      setIsLiveDetecting(false);
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

  // Sample camera frames sequentially and display detections from the backend YOLO service.
  useEffect(() => {
    if (inspectPhase !== 'camera' || !cameraStream || !isLiveDetecting) return undefined;

    const sessionId = liveDetectionSessionRef.current;
    let cancelled = false;
    const detectFrame = async () => {
      const video = videoRef.current;
      if (
        cancelled ||
        sessionId !== liveDetectionSessionRef.current ||
        liveFrameInFlightRef.current ||
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !video.videoWidth ||
        !video.videoHeight
      ) return;

      liveFrameInFlightRef.current = true;
      try {
        const frameWidth = 640;
        const viewfinder = video.parentElement;
        const frameRatio = viewfinder?.clientWidth && viewfinder.clientHeight
          ? viewfinder.clientWidth / viewfinder.clientHeight
          : video.videoWidth / video.videoHeight;
        const sourceRatio = video.videoWidth / video.videoHeight;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = video.videoWidth;
        let sourceHeight = video.videoHeight;

        if (sourceRatio > frameRatio) {
          sourceWidth = video.videoHeight * frameRatio;
          sourceX = (video.videoWidth - sourceWidth) / 2;
        } else {
          sourceHeight = video.videoWidth / frameRatio;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        }

        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = Math.round(frameWidth / frameRatio);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Unable to prepare the camera frame for detection.');
        context.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const frame = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Unable to encode camera frame.')),
            'image/jpeg',
            0.75,
          );
        });
        const response = await analyzeLiveFabricFrame(frame, { fabricType: 'Handloom Cotton-Silk Blend' });
        if (cancelled || sessionId !== liveDetectionSessionRef.current) return;

        const detections = Array.isArray(response?.data?.defects) ? response.data.defects : [];
        setLiveDefects(detections.map((defect, index) => {
          const position = (value, dimension) => {
            const number = Number(value) || 0;
            return number <= 1 ? number * 100 : number <= 100 ? number : number / dimension * 100;
          };
          const width = Math.min(100, Math.max(0, position(defect.width, canvas.width)));
          const height = Math.min(100, Math.max(0, position(defect.height, canvas.height)));
          const detectedX = Math.min(100 - width, Math.max(0, position(defect.x ?? defect.left, canvas.width)));
          return {
            id: defect.id || index,
            type: defect.type || defect.class_name || defect.label || 'Defect',
            confidence: Number(defect.confidence) || 0,
            x: facingMode === 'user' ? 100 - detectedX - width : detectedX,
            y: Math.min(100 - height, Math.max(0, position(defect.y ?? defect.top, canvas.height))),
            width,
            height,
          };
        }));
        setLiveAiMode(response?.data?.aiMode || 'unknown');
        setLiveDetectionError('');
      } catch (error) {
        if (!cancelled && sessionId === liveDetectionSessionRef.current) {
          console.error('[Live Detection] Frame analysis failed:', error);
          setLiveDetectionError(error.message || 'Live detection failed. Check the AI service and try again.');
          setIsLiveDetecting(false);
        }
      } finally {
        liveFrameInFlightRef.current = false;
      }
    };

    void detectFrame();
    const intervalId = window.setInterval(detectFrame, 1800);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [cameraStream, facingMode, inspectPhase, isLiveDetecting]);

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
    startLiveCamera(nextMode, isLiveDetecting);
  };

  const handleToggleLiveDetection = () => {
    const nextEnabled = !isLiveDetecting;
    liveDetectionSessionRef.current += 1;
    setLiveDefects([]);
    setLiveDetectionError('');
    setLiveAiMode('');
    setIsLiveDetecting(nextEnabled);
  };

  // Capture snapshot frame from live video stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    setIsShutterActive(true);
    setTimeout(() => {
      try {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
          throw new Error('The camera is not ready to capture a frame.');
        }
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
        liveDetectionSessionRef.current += 1;
        setIsLiveDetecting(false);
        stopLiveCamera();
        setIsShutterActive(false);
        runAnalysis(dataUrl);
      } catch (e) {
        console.error('Capture frame error:', e);
        setCameraError(e.message || 'Unable to capture a frame from the camera.');
        setIsShutterActive(false);
      }
    }, 150);
  };

  const handleCloseCamera = () => {
    liveDetectionSessionRef.current += 1;
    setIsLiveDetecting(false);
    setLiveDefects([]);
    stopLiveCamera();
    setInspectPhase('idle');
  };

  // ── Start analysis after image is chosen ──
  const runAnalysis = async (imageUrl) => {
    stopLiveCamera();
    setCapturedImage(imageUrl);
    setInspectPhase('analyzing');
    setAnalysisStep(0);

    // Call real AI defect detection endpoint
    try {
      const response = await analyzeFabricImage(imageUrl, {
        fabricType: 'Handloom Cotton-Silk Blend',
        fabricName: 'Fabric Roll Inspection Sample',
      });

      const aiData = response?.data;
      const detected = Array.isArray(aiData?.defects) ? aiData.defects : [];

      if (detected.length > 0) {
        // Format detected defects for the 4-page result flow
        const formattedDefects = detected.map((d, index) => {
          const isCritical = (d.severity || '').toLowerCase() === 'critical';
          const isLow = (d.severity || '').toLowerCase() === 'low';
          const sevColor = isCritical ? '#ef4444' : isLow ? '#eab308' : '#f97316';
          const badgeBg = isCritical ? '#fee2e2' : isLow ? '#fef9c3' : '#fef3c7';
          const badgeText = isCritical ? '#dc2626' : isLow ? '#a16207' : '#d97706';
          const confStr = typeof d.confidence === 'number' ? `${d.confidence}%` : (d.confidence || '92%');
          const hasBox = [d.x, d.y, d.width, d.height].every(
            (coordinate) => coordinate !== null && coordinate !== undefined && Number.isFinite(Number(coordinate)),
          );

          return {
            id: index + 1,
            name: d.type || 'Surface Flaw',
            confidence: confStr,
            severity: d.severity || 'Moderate',
            severityColor: sevColor,
            badgeBg,
            badgeText,
            box: hasBox ? {
              top: `${d.y}%`,
              left: `${d.x}%`,
              width: `${d.width}%`,
              height: `${d.height}%`,
            } : null,
            tagText: `${d.type || 'Defect'} — ${confStr}`,
            whatIsIt: d.explanation || 'A visible surface flaw detected by optical AI scan.',
            possibleCause: d.possibleCause || 'Yarn tension variance, dye inconsistency, or mechanical reed friction during weaving.',
            recommendedAction: d.recommendedAction || 'Inspect the affected zone before further processing or rolling.',
          };
        });

        const cleanGrade = (aiData?.grade || 'B').toUpperCase();
        const report = {
          reportId: `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fabricType: aiData?.fabricType || 'Handloom Cotton-Silk Blend',
          imagePath: aiData?.imagePath || '',
          grade: `GRADE ${cleanGrade}`,
          gradeLetter: cleanGrade,
          gradeColor: cleanGrade === 'A' ? '#10b981' : cleanGrade === 'C' ? '#ef4444' : '#d97706',
          totalDefects: formattedDefects.length,
          severityScale: formattedDefects.some(d => d.severity === 'Critical') ? 'Critical' : 'Moderate',
          mainIssues: formattedDefects.map(d => d.name).join(', '),
          aiExplanation: aiData?.summary || 'Defects detected during optical analysis. The fabric is structurally viable with manual review recommended.',
          gradeExplanation: `Quality Grade ${cleanGrade} determined by AI defect density and severity thresholds.`,
          recommendedAction: aiData?.recommendedAction || 'Flag roll section for cutting or mend with micro-stitching if permitted.',
          defects: formattedDefects,
        };

        setAnalysisDefectData(report);
        setAnalysisResultType('defects_found');
      } else {
        // Zero defects detected
        const cleanGrade = (aiData?.grade || 'A').toUpperCase();
        const report = {
          reportId: `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fabricType: aiData?.fabricType || 'Pure Silk Weave',
          imagePath: aiData?.imagePath || '',
          grade: `GRADE ${cleanGrade}`,
          gradeLetter: cleanGrade,
          gradeColor: '#10b981',
          totalDefects: 0,
          severityScale: 'None',
          mainIssues: 'None detected',
          aiExplanation: 'Fabric surface inspected under multi-spectrum lighting. Warp and weft threads exhibit zero flaws, uniform tension, and zero blemishes.',
          gradeExplanation: 'Fabric passed zero-defect benchmark with exceptional weave integrity.',
          recommendedAction: 'Batch approved for production & premium export certification.',
          defects: [],
        };
        setAnalysisDefectData(report);
        setAnalysisResultType('no_defects');
      }
    } catch (analysisErr) {
      console.error('[FabriSense] Fabric analysis failed:', analysisErr);
      setAnalysisDefectData(null);
      setAnalysisResultType('invalid_image');
    }
  };

  // Advance step every ~800ms then show result flow
  useEffect(() => {
    if (inspectPhase !== 'analyzing') return;
    if (analysisStep >= ANALYSIS_STEPS.length) {
      const timer = setTimeout(() => {
        setInspectPhase('results_flow');
      }, 350);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setAnalysisStep(prev => prev + 1), 750);
    return () => clearTimeout(timer);
  }, [inspectPhase, analysisStep]);

  // ── Save report directly from the 4-page flow ──
  const handleSaveBatchFromFlow = async (record) => {
    const assignedId = record?.id && String(record.id).startsWith('INS-')
      ? record.id
      : `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const cleanGrade = (record?.grade || 'GRADE B').replace(/^GRADE\s*/i, '').trim() || 'B';
    const defectsList = Array.isArray(record?.defectsList)
      ? record.defectsList
      : (Array.isArray(analysisDefectData?.defects) ? analysisDefectData.defects : []);
    const defectsCount = typeof record?.defects === 'number'
      ? Math.max(0, record.defects)
      : Math.max(0, Number(record?.totalDefects) || defectsList.length);
    const fabricTitle = record?.title || record?.fabricType || (cleanGrade === 'A' ? 'Pure Silk Weave' : 'Handloom Cotton-Silk Blend');

    const newRecord = {
      id: assignedId,
      title: fabricTitle,
      fabricType: record?.fabricType || fabricTitle,
      time: `Today • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toISOString(),
      grade: `GRADE ${cleanGrade}`,
      defects: defectsCount,
      image: resolveApiAssetUrl(record?.imagePath || record?.image || capturedImage || (fabricTitle.toLowerCase().includes('denim') ? indigoDenim : kanchipuramSilk)),
      imagePath: record?.imagePath || record?.image || capturedImage || '/assets/indigo_denim.jpg',
      type: fabricTitle.toLowerCase().includes('denim') ? 'denim' : 'silk',
      status: cleanGrade === 'A' ? 'Passed' : cleanGrade === 'B' ? 'Review' : 'Failed',
      severityScale: record?.severityScale || (cleanGrade === 'A' ? 'None' : 'Moderate'),
      mainIssues: record?.mainIssues || (defectsCount === 0 ? 'None detected' : defectsList.map((defect) => defect.name || defect.type || 'Defect').join(', ')),
      overallSummary: record?.overallSummary || record?.aiExplanation || '',
      aiExplanation: record?.aiExplanation || '',
      gradeExplanation: record?.gradeExplanation || '',
      recommendedAction: record?.recommendedAction || '',
      defectsList,
      inspectorName: userData?.name || profileUser?.name || '',
      inspectorEmail,
    };

    const updated = [newRecord, ...inspections];
    setInspections(updated);
    if (inspectionStorageKey) {
      try { localStorage.setItem(inspectionStorageKey, JSON.stringify(updated)); }
      catch (e) { console.error('Failed to save inspection history for this user:', e); }
    }

    // Close inspect phase and immediately show history!
    setInspectPhase('idle');
    setAnalysisStep(-1);
    setCapturedImage(null);
    setActiveTab('history');
    setSelectedInspection(newRecord); // Make all related contents immediately visible!
    showToast(`Inspection ${assignedId} saved! Total inspections updated (+1).`);

    // Dual-sync to shared backend database (Supabase Cloud PostgreSQL & SQLite dual-sync)
    try {
      await syncInspectionRecord({
        id: assignedId,
        fabricType: newRecord.fabricType,
        fabricName: newRecord.title,
        imagePath: newRecord.imagePath,
        defectCount: newRecord.defects,
        grade: cleanGrade,
        status: newRecord.status,
        overallSummary: newRecord.overallSummary,
        recommendedAction: newRecord.recommendedAction,
        inspectorName: newRecord.inspectorName,
        inspectorEmail: newRecord.inspectorEmail,
        defects: newRecord.defectsList,
      });
    } catch (err) {
      console.warn('Database sync notice:', err);
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

  // ── Detail Report Actions (PDF, CSV, JSON, Share) ──
  const handleDownloadReportPDF = (item) => {
    if (!item) return;
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('FABRISENSE AI FABRIC INSPECTION REPORT', 14, 16);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(`Report ID: ${item.id}`, 14, 38);
      doc.setFontSize(10);
      doc.text(`Date & Time: ${item.time || item.date || 'Today'}`, 14, 46);
      doc.text(`Fabric Type: ${item.fabricType || item.title}`, 14, 53);
      doc.text(`Overall Grade: ${item.grade} (${item.status || 'Passed'})`, 14, 60);
      doc.text(`Total Defects: ${item.defects ?? 0}`, 14, 67);
      doc.text(`Inspector: ${item.inspectorName || 'Rajesh Kumar'}`, 14, 74);

      doc.text('AI Assessment Summary:', 14, 85);
      const splitSummary = doc.splitTextToSize(item.aiExplanation || item.overallSummary || 'Zero defects detected.', 180);
      doc.text(splitSummary, 14, 92);

      if (Array.isArray(item.defectsList) && item.defectsList.length > 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(14, 115, 182, 8, 'F');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('# Defect Name', 18, 120);
        doc.text('Severity', 65, 120);
        doc.text('Confidence', 105, 120);
        doc.text('Recommended Action', 140, 120);

        let yPos = 130;
        item.defectsList.forEach((d, idx) => {
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${d.name}`, 18, yPos);
          doc.text(d.severity || 'Moderate', 65, yPos);
          doc.text(d.confidence || '90%', 105, yPos);
          const act = doc.splitTextToSize(d.recommendedAction || 'Inspect area', 55);
          doc.text(act, 140, yPos);
          yPos += 14;
        });
      }

      doc.save(`FabriSense_Report_${item.id}.pdf`);
      showToast(`Downloaded PDF for ${item.id}`);
    } catch (e) {
      console.error(e);
      showToast('Could not generate PDF');
    }
  };

  const handleExportReportCSV = (item) => {
    if (!item) return;
    let csv = 'Report_ID,Date,Fabric_Type,Grade,Total_Defects,Status,Inspector,Defect_Name,Severity,Confidence,Action\n';
    if (Array.isArray(item.defectsList) && item.defectsList.length > 0) {
      item.defectsList.forEach(d => {
        csv += `"${item.id}","${item.time}","${item.fabricType || item.title}","${item.grade}","${item.defects}","${item.status}","${item.inspectorName}","${d.name}","${d.severity}","${d.confidence}","${(d.recommendedAction || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      csv += `"${item.id}","${item.time}","${item.fabricType || item.title}","${item.grade}","0","Passed","${item.inspectorName}","None","None","100%","Approved for production"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FabriSense_${item.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported CSV for ${item.id}`);
  };

  const handleExportReportJSON = (item) => {
    if (!item) return;
    const jsonStr = JSON.stringify(item, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FabriSense_${item.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported JSON for ${item.id}`);
  };

  const handleShareReport = async (item) => {
    if (!item) return;
    const text = `🧵 FabriSense Inspection Report\nReport ID: ${item.id}\nFabric: ${item.fabricType || item.title}\nGrade: ${item.grade}\nDefects: ${item.defects}\nStatus: ${item.status}\nInspector: ${item.inspectorName || 'Rajesh Kumar'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `FabriSense Report ${item.id}`, text, url: window.location.href });
        return;
      } catch (_) {}
    }
    navigator.clipboard?.writeText(text);
    setCopyDetailToast('Report link copied to clipboard!');
    setTimeout(() => setCopyDetailToast(false), 2000);
  };

  const handleCopyReportId = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopyDetailToast(`Report ID ${id} copied!`);
    setTimeout(() => setCopyDetailToast(false), 2000);
  };

  const toggleDetailDefectAccordion = (id) => {
    setExpandedDetailDefects(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // ── Scan again ──
  const handleRescan = () => {
    stopLiveCamera();
    setInspectPhase('idle');
    setAnalysisStep(-1);
    setCapturedImage(null);
  };

  // Reset inspect state when leaving tab
  const handleTabChange = (tab) => {
    stopLiveCamera();
    if (tab !== 'inspect') handleRescan();
    setActiveTab(tab);
  };

  const displayName  = userData?.name  || profileUser?.name || 'Ananthi Kumar';
  const displayEmail = userData?.email || profileUser?.email || 'inspector@weavesofindia.com';

  // Accurate numerical metrics connected to real database statistics (updates +1 upon inspection)
  const totalInspections = inspections.length;
  const defectsFound = inspections.reduce((total, inspection) => total + (Number(inspection.defects) || 0), 0);
  const gradeABatches = inspections.filter((inspection) => (inspection.grade || '').toUpperCase().includes('A')).length;

  return (
    <div style={outerWrapperStyle}>
      {/* ── Full-screen mobile dashboard ── */}
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

            {/* ── Inspection Metrics ── */}
            <div style={metricsGridStyle}>
              {/* Total Inspections */}
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Total Inspections</div>
                <div style={{
                  ...metricValStyle,
                  color: totalInspections === 0 ? '#64748b' : '#1e293b',
                  fontSize: '32px'
                }}>
                  {totalInspections}
                </div>
              </div>

              {/* Defects Found */}
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Defects Found</div>
                <div style={{
                  ...metricValStyle,
                  color: defectsFound === 0 ? '#64748b' : '#dc2626',
                  fontSize: '32px'
                }}>
                  {defectsFound}
                </div>
              </div>

              {/* Grade A Batches */}
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Grade A Batches</div>
                <div style={{
                  ...metricValStyle,
                  color: gradeABatches === 0 ? '#64748b' : '#16a34a',
                  fontSize: '32px'
                }}>
                  {gradeABatches}
                </div>
              </div>

            </div>

            {/* ── Recent Inspections Section ── */}
            <div style={sectionHeaderRowStyle}>
              <h2 style={sectionHeadingStyle}>Recent Inspections</h2>
              {inspections.length > 0 ? (
                <button
                  onClick={() => setActiveTab('history')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1b7a63',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  View All ({inspections.length}) <ChevronRight size={14} />
                </button>
              ) : (
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>0 Scans</span>
              )}
            </div>

            {inspections.length === 0 ? (
              <div style={nullRecentInspectionsStyle}>
                <div style={nullIconCircleStyle}>
                  <Layers size={24} color="#64748b" />
                </div>
                <div style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '700' }}>
                  No Inspections Yet
                </div>
                <p style={{ color: '#64748b', fontSize: '12.5px', margin: '4px 0 0', textAlign: 'center', lineHeight: 1.4 }}>
                  No recent inspections found. Tap "Start New Inspection" to scan fabric batches.
                </p>
              </div>
            ) : (
              inspections.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedInspection(item)}
                  style={{
                    ...inspectionCardStyle,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  title="Click to view inspection details & contents"
                >
                  <div style={itemLeftGroupStyle}>
                    <img
                      src={item.image || (item.type === 'silk' ? kanchipuramSilk : indigoDenim)}
                      alt={item.title}
                      style={itemThumbnailStyle}
                    />
                    <div>
                      <div style={itemTitleStyle}>{item.title}</div>
                      <div style={itemSubtitleStyle}>
                        {item.time} • <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1b7a63' }}>{item.id}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={(item.grade || '').includes('A') ? gradeBadgeAStyle : gradeBadgeBStyle}>
                      {item.grade}
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
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
            padding: inspectPhase === 'results_flow'
              ? 'env(safe-area-inset-top) 0 calc(96px + env(safe-area-inset-bottom))'
              : 'calc(18px + env(safe-area-inset-top)) 16px calc(96px + env(safe-area-inset-bottom))',
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

                {/* Live YOLO detection card */}
                <div
                  onClick={() => startLiveCamera(facingMode, true)}
                  style={{ ...inspectOptionCardStyle, marginBottom: '14px' }}
                >
                  <div style={{ ...inspectOptionIconBoxStyle, backgroundColor: '#ecfdf5' }}>
                    <Scan size={32} color="#1b7a63" strokeWidth={1.8} />
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', marginTop: '14px' }}>Live Defect Detection</div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>Detect and mark defects as you scan</div>
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
                    <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '15px' }}>
                      {isLiveDetecting ? 'Live Defect Detection' : 'Live Camera'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '500' }}>Align fabric within frame</div>
                  </div>
                  <button
                    onClick={handleToggleFacingMode}
                    style={cameraFlipBtnStyle}
                    title={`Switch to ${facingMode === 'environment' ? 'front' : 'back'} camera`}
                    aria-label={`Switch to ${facingMode === 'environment' ? 'front' : 'back'} camera`}
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
                    {!isLiveDetecting && <div style={scannerBeamStyle} />}

                    {/* 3x3 Grid Overlay */}
                    <div style={viewfinderGridOverlayStyle} />

                    {/* Live YOLO detections */}
                    {liveDefects.map((defect) => (
                      <div
                        key={defect.id}
                        style={{
                          position: 'absolute',
                          left: `${defect.x}%`,
                          top: `${defect.y}%`,
                          width: `${defect.width}%`,
                          height: `${defect.height}%`,
                          minWidth: '24px',
                          minHeight: '24px',
                          border: '2px solid #f43f5e',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(244,63,94,0.12)',
                          zIndex: 7,
                          pointerEvents: 'none',
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          left: '-2px',
                          bottom: '100%',
                          maxWidth: '180px',
                          padding: '3px 6px',
                          borderRadius: '4px 4px 0 0',
                          backgroundColor: '#e11d48',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                        }}>
                          {defect.type}{defect.confidence ? ` ${Math.round(defect.confidence)}%` : ''}
                        </span>
                      </div>
                    ))}

                    {/* Live badge */}
                    <div style={{ ...viewfinderBadgeStyle, top: 'auto', bottom: '12px' }}>
                      <div style={{ ...livePulseDotStyle, backgroundColor: isLiveDetecting ? '#22c55e' : '#ef4444' }} />
                      <span>
                        {isLiveDetecting
                          ? liveAiMode === 'mock' ? 'DEMO DETECTION' : 'AI DETECTION'
                          : 'LIVE CAMERA FEED'}
                      </span>
                    </div>
                  </div>
                )}

                {cameraStream && (
                  <div style={liveDetectionPanelStyle}>
                    <button
                      type="button"
                      onClick={handleToggleLiveDetection}
                      style={liveDetectionToggleStyle}
                    >
                      {isLiveDetecting ? 'Pause Live Detection' : 'Start Live Detection'}
                    </button>
                    <div style={liveDetectionStatusStyle} aria-live="polite">
                      {liveDetectionError
                        ? liveDetectionError
                        : isLiveDetecting
                          ? liveAiMode === 'mock'
                            ? `${liveDefects.length} demo detection${liveDefects.length === 1 ? '' : 's'} — configure AI_MODE=yolo for trained YOLO results`
                            : `${liveDefects.length} defect${liveDefects.length === 1 ? '' : 's'} detected`
                          : 'Live AI detection is paused.'}
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
                    title={`Switch to ${facingMode === 'environment' ? 'front' : 'back'} camera`}
                    aria-label={`Switch to ${facingMode === 'environment' ? 'front' : 'back'} camera`}
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
                defectData={analysisDefectData}
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

            {/* ── Toast Notification Banner ── */}
            {toastMessage && (
              <div style={profileToastStyle}>
                <CheckCircle size={16} color="#10b981" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Hidden Profile Avatar File Picker */}
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarFileChange}
            />

            {/* ── Dark Navy Header Card with Contact Logo / Custom Profile Pic ── */}
            <div style={profileHeaderCardStyle}>
              {/* Avatar circle: contact logo icon by default, or user custom photo */}
              <div
                onClick={() => avatarInputRef.current?.click()}
                title="Click to update profile picture"
                style={{
                  position: 'relative',
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: profileUser.avatar ? 'none' : 'linear-gradient(135deg, #1b7a63 0%, #0d9488 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  border: '3px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} color="#ffffff" strokeWidth={2} />
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  padding: '3px 0',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <Camera size={12} color="#ffffff" />
                </div>
              </div>

              <div style={profileNameStyle}>{profileUser.name}</div>
              <div style={profileEmailStyle}>{profileUser.email}</div>
              <button
                onClick={openAccountModal}
                style={profileEditPillBtnStyle}
              >
                <Edit3 size={13} style={{ marginRight: '4px' }} /> Edit Profile
              </button>
            </div>

            {/* ── Menu List Card ── */}
            <div style={profileMenuCardStyle}>
              {[
                { icon: <Settings size={20} color="#334155" strokeWidth={2} />, label: 'Account Settings', key: 'account' },
                { icon: <Bell    size={20} color="#334155" strokeWidth={2} />, label: 'Notifications',    key: 'notifications' },
                { icon: <Globe   size={20} color="#334155" strokeWidth={2} />, label: 'Language',         key: 'language', badge: profileUser.language },
                { icon: <HelpCircle size={20} color="#334155" strokeWidth={2} />, label: 'Help & Support', key: 'help' },
                { icon: <Info    size={20} color="#334155" strokeWidth={2} />, label: 'About FabriSense', key: 'about', last: true },
              ].map(({ icon, label, key, badge, last }) => (
                <div
                  key={label}
                  onClick={() => {
                    if (key === 'account') openAccountModal();
                    else setActiveProfileModal(key);
                  }}
                  style={{ ...profileMenuRowStyle, borderBottom: last ? 'none' : '1px solid #f1f5f9' }}
                >
                  <div style={profileMenuRowLeftStyle}>
                    <div style={profileMenuIconBoxStyle}>{icon}</div>
                    <span style={profileMenuLabelStyle}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {badge && <span style={profileBadgeStyle}>{badge}</span>}
                    <ChevronRight size={18} color="#cbd5e1" strokeWidth={2.5} />
                  </div>
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
            {/* Header row with Title and Count badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('home')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                  }}
                  title="Back to Home"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.1 }}>
                    Inspection History
                  </h2>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                    {inspections.length} total recorded fabric {inspections.length === 1 ? 'scan' : 'scans'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange('inspect')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: '#1b7a63',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(27,122,99,0.4)',
                }}
              >
                <Scan size={14} /> New Scan
              </button>
            </div>

            {/* Filter pills */}
            {inspections.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'all', label: `All (${inspections.length})` },
                  { id: 'grade_a', label: `Grade A (${gradeABatches})` },
                  { id: 'with_defects', label: `Defects (${inspections.filter(i => (i.defects || 0) > 0).length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setHistoryFilter(f.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '16px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      border: '1px solid',
                      borderColor: historyFilter === f.id ? '#1b7a63' : 'rgba(255,255,255,0.15)',
                      backgroundColor: historyFilter === f.id ? 'rgba(27,122,99,0.3)' : 'rgba(255,255,255,0.05)',
                      color: historyFilter === f.id ? '#5eead4' : '#94a3b8',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {inspections.length === 0 ? (
              <div style={nullRecentInspectionsStyle}>
                <div style={nullIconCircleStyle}>
                  <History size={26} color="#64748b" />
                </div>
                <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: '800' }}>
                  No Inspection Records
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '6px 0 16px', textAlign: 'center', lineHeight: 1.45, maxWidth: '280px' }}>
                  Perform your first fabric scan to automatically record quality grades, defect markers, and AI inspection certificates.
                </p>
                <button
                  onClick={() => handleTabChange('inspect')}
                  style={{
                    backgroundColor: '#1b7a63',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Scan size={16} /> Start Inspection Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {inspections
                  .filter(item => {
                    if (historyFilter === 'grade_a') return (item.grade || '').includes('A');
                    if (historyFilter === 'with_defects') return (item.defects || 0) > 0;
                    return true;
                  })
                  .map((item) => {
                    const isGradeA = (item.grade || '').includes('A');
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedInspection(item)}
                        style={{
                          backgroundColor: '#1e2433',
                          borderRadius: '16px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(27,122,99,0.5)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Top bar: ID tag, time, and Grade badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: 'rgba(27,122,99,0.2)',
                              color: '#5eead4',
                              padding: '2px 7px',
                              borderRadius: '6px',
                            }}>
                              {item.id}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {item.time}
                            </span>
                          </div>

                          <div style={isGradeA ? gradeBadgeAStyle : gradeBadgeBStyle}>
                            {item.grade}
                          </div>
                        </div>

                        {/* Middle row: Image thumbnail & Fabric details */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img
                            src={item.image || (item.type === 'silk' ? kanchipuramSilk : indigoDenim)}
                            alt={item.title}
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '12px',
                              objectFit: 'cover',
                              flexShrink: 0,
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '14.5px',
                              fontWeight: '700',
                              color: '#ffffff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {item.title}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '4px',
                            }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: item.defects === 0 ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)',
                                color: item.defects === 0 ? '#4ade80' : '#f87171',
                              }}>
                                {item.defects === 0 ? 'Zero Defects' : `${item.defects} Defects Found`}
                              </span>

                              <span style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                              }}>
                                Status: <strong style={{ color: item.status === 'Passed' ? '#4ade80' : '#f59e0b' }}>{item.status || 'Passed'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Defect preview tags if defects exist */}
                        {Array.isArray(item.defectsList) && item.defectsList.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingTop: '4px' }}>
                            {item.defectsList.slice(0, 3).map((d, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  color: d.severity === 'Critical' ? '#f87171' : d.severity === 'Moderate' ? '#fbbf24' : '#38bdf8',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                }}
                              >
                                {d.name} • {d.confidence || '90%'}
                              </span>
                            ))}
                            {item.defectsList.length > 3 && (
                              <span style={{ fontSize: '10.5px', color: '#64748b', padding: '2px 4px' }}>
                                +{item.defectsList.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Card bottom: Quick action prompt */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          fontSize: '12px',
                          color: '#5eead4',
                          fontWeight: '600',
                        }}>
                          <span>View Full Contents & Report</span>
                          <ChevronRight size={15} color="#5eead4" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom Navigation Bar ── */}
        <div style={bottomNavContainerStyle}>
          <div style={navTabsRowStyle}>
            
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab('home')}
              aria-label="Home"
              aria-current={activeTab === 'home' ? 'page' : undefined}
              style={navTabBtnStyle}
            >
              <span style={navTabIconStyle(activeTab === 'home')}>
                <Home
                  size={22}
                  color={activeTab === 'home' ? '#1b7a63' : '#94a3b8'}
                  strokeWidth={activeTab === 'home' ? 2.5 : 2}
                />
              </span>
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
              aria-label="Inspect"
              aria-current={activeTab === 'inspect' ? 'page' : undefined}
              style={navTabBtnStyle}
            >
              <span style={navTabIconStyle(activeTab === 'inspect')}>
                <Scan
                  size={22}
                  color={activeTab === 'inspect' ? '#1b7a63' : '#94a3b8'}
                  strokeWidth={activeTab === 'inspect' ? 2.5 : 2}
                />
              </span>
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
              aria-label="History"
              aria-current={activeTab === 'history' ? 'page' : undefined}
              style={navTabBtnStyle}
            >
              <span style={{ ...navTabIconStyle(activeTab === 'history'), position: 'relative' }}>
                <History
                  size={22}
                  color={activeTab === 'history' ? '#1b7a63' : '#94a3b8'}
                  strokeWidth={activeTab === 'history' ? 2.5 : 2}
                />
                {inspections.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    backgroundColor: '#1b7a63',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    minWidth: '15px',
                    textAlign: 'center',
                    lineHeight: '13px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                  }}>
                    {inspections.length}
                  </span>
                )}
              </span>
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
              aria-label="Profile"
              aria-current={activeTab === 'profile' ? 'page' : undefined}
              style={navTabBtnStyle}
            >
              <span style={navTabIconStyle(activeTab === 'profile')}>
                <User
                  size={22}
                  color={activeTab === 'profile' ? '#1b7a63' : '#94a3b8'}
                  strokeWidth={2}
                />
              </span>
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

      {/* ── PROFILE SUB-SETTINGS MODALS ── */}
      {activeProfileModal && (
        <div style={profileModalOverlayStyle} onClick={() => setActiveProfileModal(null)}>
          <div style={profileModalContentStyle} onClick={(e) => e.stopPropagation()}>
            
            {/* 1. Account Settings Modal */}
            {activeProfileModal === 'account' && (
              <div>
                <div style={profileModalHeaderStyle}>
                  <div>
                    <h3 style={profileModalTitleStyle}>Account Settings</h3>
                    <p style={profileModalSubTitleStyle}>Update your personal details & profile info</p>
                  </div>
                  <button onClick={() => setActiveProfileModal(null)} style={profileModalCloseBtnStyle}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Profile Picture Upload Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      style={{
                        position: 'relative',
                        width: '76px',
                        height: '76px',
                        borderRadius: '50%',
                        backgroundColor: '#18243e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginBottom: '10px',
                        overflow: 'hidden',
                        border: '3px solid #cbd5e1',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    >
                      {profileUser.avatar ? (
                        <img src={profileUser.avatar} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={36} color="#ffffff" />
                      )}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        padding: '3px 0',
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <Camera size={12} color="#ffffff" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #1b7a63',
                          backgroundColor: '#f0fdf4',
                          color: '#1b7a63',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Upload size={13} /> {profileUser.avatar ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      {profileUser.avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fecdd3',
                            backgroundColor: '#fff1f2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={profileLabelStyle}>Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Rajesh Kumar"
                      style={profileInputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={profileLabelStyle}>Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. rajesh@textileco.com"
                      style={profileInputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={profileLabelStyle}>Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. +91 98765 43210"
                      style={profileInputStyle}
                    />
                  </div>

                  <div>
                    <label style={profileLabelStyle}>Company / Mill Name</label>
                    <input
                      type="text"
                      value={editForm.company}
                      onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="e.g. Textile Co. Manufacturing"
                      style={profileInputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setActiveProfileModal(null)} style={profileCancelBtnStyle}>
                      Cancel
                    </button>
                    <button type="submit" style={profileSaveBtnStyle}>
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. Notifications Modal */}
            {activeProfileModal === 'notifications' && (
              <div>
                <div style={profileModalHeaderStyle}>
                  <div>
                    <h3 style={profileModalTitleStyle}>Notifications</h3>
                    <p style={profileModalSubTitleStyle}>Configure your alert preferences</p>
                  </div>
                  <button onClick={() => setActiveProfileModal(null)} style={profileModalCloseBtnStyle}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { key: 'push', title: 'Push Notifications', desc: 'Receive real-time alerts on your device' },
                    { key: 'email', title: 'Email Inspection Summaries', desc: 'Get automated email reports after scans' },
                    { key: 'defects', title: 'Critical Defect Warnings', desc: 'Instant alerts when fabric defect count > 5' },
                    { key: 'reports', title: 'Weekly Quality Digest', desc: 'Summary report of mill inspection grades' },
                  ].map(({ key, title, desc }) => (
                    <div key={key} style={profileToggleRowStyle}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{title}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleNotification(key)}
                        style={{
                          width: '46px',
                          height: '26px',
                          borderRadius: '13px',
                          backgroundColor: profileUser.notifications[key] ? '#1b7a63' : '#cbd5e1',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.2s',
                          flexShrink: 0
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          position: 'absolute',
                          top: '3px',
                          left: profileUser.notifications[key] ? '23px' : '3px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </button>
                    </div>
                  ))}

                  <button onClick={handleSaveNotifications} style={{ ...profileSaveBtnStyle, marginTop: '12px', width: '100%' }}>
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* 3. Language Modal */}
            {activeProfileModal === 'language' && (
              <div>
                <div style={profileModalHeaderStyle}>
                  <div>
                    <h3 style={profileModalTitleStyle}>Select Language</h3>
                    <p style={profileModalSubTitleStyle}>Choose your preferred application language</p>
                  </div>
                  <button onClick={() => setActiveProfileModal(null)} style={profileModalCloseBtnStyle}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'English (US)', label: 'English (US)' },
                    { id: 'Spanish (Español)', label: 'Spanish (Español)' },
                    { id: 'Hindi (हिन्दी)', label: 'Hindi (हिन्दी)' },
                    { id: 'French (Français)', label: 'French (Français)' },
                    { id: 'German (Deutsch)', label: 'German (Deutsch)' },
                    { id: 'Tamil (தமிழ்)', label: 'Tamil (தமிழ்)' },
                  ].map(({ id, label }) => (
                    <div
                      key={id}
                      onClick={() => handleSelectLanguage(id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        backgroundColor: profileUser.language === id ? '#f0fdf4' : '#f8fafc',
                        border: profileUser.language === id ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        fontWeight: profileUser.language === id ? '700' : '500',
                        color: profileUser.language === id ? '#166534' : '#1e293b',
                      }}
                    >
                      <span>{label}</span>
                      {profileUser.language === id && <Check size={18} color="#16a34a" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Help & Support Modal */}
            {activeProfileModal === 'help' && (
              <div>
                <div style={profileModalHeaderStyle}>
                  <div>
                    <h3 style={profileModalTitleStyle}>Help & Support</h3>
                    <p style={profileModalSubTitleStyle}>Get assistance & view documentation</p>
                  </div>
                  <button onClick={() => setActiveProfileModal(null)} style={profileModalCloseBtnStyle}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a', marginBottom: '4px' }}>How to scan fabric?</div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                      Navigate to the <strong>Inspect</strong> tab, position the fabric under good lighting, and click <strong>Scan Fabric Roll</strong> or capture live camera feed.
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a', marginBottom: '4px' }}>How is Fabric Grade determined?</div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                      • <strong>Grade A</strong>: 0 - 2 minor flaws per roll<br />
                      • <strong>Grade B</strong>: 3 - 5 defects detected<br />
                      • <strong>Grade C</strong>: Critical weave/hole defect requiring rejection
                    </div>
                  </div>

                  <div style={{ padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#065f46', marginBottom: '4px' }}>Need assistance?</div>
                    <div style={{ fontSize: '12.5px', color: '#047857', marginBottom: '10px' }}>Our technical support team is available 24/7</div>
                    <a href="mailto:support@fabrisense.ai" style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}>
                      Contact support@fabrisense.ai
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 5. About FabriSense Modal */}
            {activeProfileModal === 'about' && (
              <div>
                <div style={profileModalHeaderStyle}>
                  <div>
                    <h3 style={profileModalTitleStyle}>About FabriSense</h3>
                    <p style={profileModalSubTitleStyle}>System info & AI model engine</p>
                  </div>
                  <button onClick={() => setActiveProfileModal(null)} style={profileModalCloseBtnStyle}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#13223a', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '24px', fontWeight: '900' }}>
                    FS
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>FabriSense AI</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>v2.4.0 (Enterprise Build)</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <span>AI Model Engine</span>
                    <strong>YOLO-v8 Fabric Vision</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <span>Mobile Platform</span>
                    <strong>Capacitor 7.0 Native</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <span>License</span>
                    <strong>Enterprise Industrial</strong>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
      {/* ── INSPECTION DETAILS MODAL (FULL CONTENTS & REPORT) ── */}
      {selectedInspection && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 15, 26, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={() => setSelectedInspection(null)}
        >
          <div
            style={{
              backgroundColor: '#161d2b',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '440px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              position: 'relative',
              padding: '20px',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleCopyReportId(selectedInspection.id)}
                    title="Click to copy Report ID"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      fontWeight: '800',
                      backgroundColor: 'rgba(27, 122, 99, 0.25)',
                      color: '#5eead4',
                      border: '1px solid rgba(27, 122, 99, 0.5)',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{selectedInspection.id}</span>
                    <Copy size={11} />
                  </button>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: selectedInspection.status === 'Passed' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: selectedInspection.status === 'Passed' ? '#4ade80' : '#fbbf24',
                    border: '1px solid',
                    borderColor: selectedInspection.status === 'Passed' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(251, 191, 36, 0.3)',
                  }}>
                    {selectedInspection.status || 'Passed'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {selectedInspection.time || 'Recently recorded'}
                </div>
              </div>

              <button
                onClick={() => setSelectedInspection(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  transition: 'background 0.2s ease',
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Copy Toast feedback */}
            {copyDetailToast && (
              <div style={{
                backgroundColor: 'rgba(27, 122, 99, 0.95)',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'fadeIn 0.2s ease',
              }}>
                <Check size={14} color="#ffffff" strokeWidth={3} />
                <span>{typeof copyDetailToast === 'string' ? copyDetailToast : 'Copied to clipboard!'}</span>
              </div>
            )}

            {/* 2. Fabric Title & Grade Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(27, 122, 99, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1px solid rgba(27, 122, 99, 0.4)',
              borderRadius: '18px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Optical Inspection Certificate
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', margin: '4px 0 6px', lineHeight: 1.25 }}>
                  {selectedInspection.title || selectedInspection.fabricType || 'Fabric Roll'}
                </h3>
                <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={13} color="#94a3b8" />
                  <span>{selectedInspection.inspectorName || 'Rajesh Kumar'}</span>
                  <CheckCircle size={13} color="#10b981" />
                </div>
              </div>

              {/* Quality Grade Pill */}
              <div style={{
                backgroundColor: (selectedInspection.grade || '').includes('A') ? '#1b7a63' : '#d97706',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '15px',
                letterSpacing: '0.02em',
                boxShadow: (selectedInspection.grade || '').includes('A')
                  ? '0 4px 14px rgba(27, 122, 99, 0.45)'
                  : '0 4px 14px rgba(217, 119, 6, 0.45)',
                textAlign: 'center',
                flexShrink: 0,
              }}>
                {selectedInspection.grade || 'GRADE A'}
              </div>
            </div>

            {/* 3. Visual Fabric Image View with Defect Markers */}
            <div style={{
              position: 'relative',
              width: '100%',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#0a0f1a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <InspectionImageReview
                src={selectedInspection.image || (selectedInspection.type === 'silk' ? kanchipuramSilk : indigoDenim)}
                alt="Inspected fabric"
                defects={Array.isArray(selectedInspection.defectsList) ? selectedInspection.defectsList : []}
              />

              {/* Optical Badge Overlay */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                right: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(6px)',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11.5px',
              }}>
                <span style={{ color: '#5eead4', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={14} /> AI Optical Sensor Verified
                </span>
                <span style={{ color: '#cbd5e1' }}>
                  {selectedInspection.defects === 0 ? '0 Flaws Detected' : `${selectedInspection.defects} Flaws Found`}
                </span>
              </div>
            </div>

            {/* 4. AI Explanation & Quality Assessment Summary */}
            <div style={{
              backgroundColor: '#1e2638',
              borderRadius: '16px',
              padding: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5eead4', fontSize: '13px', fontWeight: '800' }}>
                <Sparkles size={16} />
                <span>AI Optical Diagnostics</span>
              </div>
              <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
                {selectedInspection.aiExplanation || selectedInspection.overallSummary || 'Batch surface inspected under multi-spectrum lighting. Weave tension and fiber consistency conforms to benchmark quality.'}
              </p>

              {selectedInspection.recommendedAction && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(27, 122, 99, 0.15)',
                  border: '1px solid rgba(27, 122, 99, 0.3)',
                  fontSize: '12.5px',
                  color: '#99f6e4',
                  lineHeight: 1.45,
                }}>
                  <strong style={{ color: '#ffffff' }}>Recommended Action: </strong>
                  {selectedInspection.recommendedAction}
                </div>
              )}
            </div>

            {/* 5. Defects Breakdown List / Zero Defects Hero */}
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#ffffff', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Flaw Breakdown ({selectedInspection.defects || 0})</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Tap to view remedy</span>
              </div>

              {selectedInspection.defects === 0 || !Array.isArray(selectedInspection.defectsList) || selectedInspection.defectsList.length === 0 ? (
                <div style={{
                  backgroundColor: '#1e2638',
                  borderRadius: '16px',
                  padding: '16px',
                  textAlign: 'center',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <CheckCircle2 size={32} color="#4ade80" />
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>Zero Defects Detected</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                    Weave passed all structural, warp, and weft integrity checks. 100% ready for export processing.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedInspection.defectsList.map((defect, dIdx) => {
                    const defectKey = defect.id || dIdx;
                    const isExpanded = !!expandedDetailDefects[defectKey];
                    return (
                      <div
                        key={defectKey}
                        style={{
                          backgroundColor: '#1e2638',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          onClick={() => toggleDetailDefectAccordion(defectKey)}
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: defect.severity === 'Critical' ? '#ef4444' : defect.severity === 'Moderate' ? '#f97316' : '#eab308',
                            }} />
                            <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                              {defect.name}
                            </span>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: defect.severity === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : defect.severity === 'Moderate' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                              color: defect.severity === 'Critical' ? '#f87171' : defect.severity === 'Moderate' ? '#fb923c' : '#facc15',
                            }}>
                              {defect.severity || 'Moderate'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {defect.confidence || '92%'}
                            </span>
                            {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{
                            padding: '0 14px 14px 14px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '12px',
                            paddingTop: '10px',
                          }}>
                            {defect.whatIsIt && (
                              <div>
                                <span style={{ color: '#94a3b8', fontWeight: '700' }}>Description: </span>
                                <span style={{ color: '#e2e8f0' }}>{defect.whatIsIt}</span>
                              </div>
                            )}
                            {defect.possibleCause && (
                              <div>
                                <span style={{ color: '#94a3b8', fontWeight: '700' }}>Probable Cause: </span>
                                <span style={{ color: '#e2e8f0' }}>{defect.possibleCause}</span>
                              </div>
                            )}
                            {defect.recommendedAction && (
                              <div>
                                <span style={{ color: '#5eead4', fontWeight: '700' }}>Corrective Remedy: </span>
                                <span style={{ color: '#e2e8f0' }}>{defect.recommendedAction}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. Export and Download Action Toolbar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <button
                onClick={() => handleDownloadReportPDF(selectedInspection)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#1b7a63',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(27, 122, 99, 0.35)',
                }}
              >
                <Download size={16} /> Download Inspection PDF
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => handleExportReportCSV(selectedInspection)}
                  style={{
                    padding: '9px 6px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <FileText size={13} /> CSV
                </button>

                <button
                  onClick={() => handleExportReportJSON(selectedInspection)}
                  style={{
                    padding: '9px 6px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <FileText size={13} /> JSON
                </button>

                <button
                  onClick={() => handleShareReport(selectedInspection)}
                  style={{
                    padding: '9px 6px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Share2 size={13} /> Share
                </button>
              </div>
            </div>

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
  height: '100%',
  minHeight: 0,
  backgroundColor: '#0c1017',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'stretch',
  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  userSelect: 'none',
  padding: '0',
};

const mobileFrameStyle = {
  width: '100%',
  height: '100%',
  backgroundColor: '#161922',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
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
  minHeight: 0,
  overflowY: 'auto',
  padding: 'calc(16px + env(safe-area-inset-top)) 20px calc(96px + env(safe-area-inset-bottom))',
  boxSizing: 'border-box',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',
  touchAction: 'pan-y',
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
  backgroundColor: 'transparent',
  padding: '10px 16px calc(8px + env(safe-area-inset-bottom)) 16px',
  boxSizing: 'border-box',
  zIndex: 20,
};

const navTabsRowStyle = {
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
};

const navTabBtnStyle = {
  backgroundColor: 'transparent',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  cursor: 'pointer',
  padding: '0 6px',
  minWidth: '64px',
  color: 'inherit',
  touchAction: 'manipulation',
};

const navTabIconStyle = (active) => ({
  width: '46px',
  height: '46px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: `1px solid ${active ? 'rgba(27,122,99,0.5)' : 'rgba(148,163,184,0.32)'}`,
  backgroundColor: 'transparent',
  boxSizing: 'border-box',
});

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
  minHeight: '100%',
  gap: '14px',
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
  paddingTop: '4px',
  paddingBottom: '8px',
};

const liveDetectionPanelStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  padding: '0 4px',
};

const liveDetectionToggleStyle = {
  width: '100%',
  minHeight: '44px',
  border: '1px solid rgba(94,234,212,0.35)',
  borderRadius: '12px',
  backgroundColor: 'rgba(27,122,99,0.2)',
  color: '#d1fae5',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  touchAction: 'manipulation',
};

const liveDetectionStatusStyle = {
  minHeight: '18px',
  color: '#94a3b8',
  fontSize: '11px',
  lineHeight: 1.5,
  textAlign: 'center',
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
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  backgroundColor: '#f3f5f8',
  padding: '0 0 calc(96px + env(safe-area-inset-bottom))',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',
  touchAction: 'pan-y',
};

// Dark navy rounded header card
const profileHeaderCardStyle = {
  background: 'linear-gradient(160deg, #18243e 0%, #121a2c 100%)',
  borderBottomLeftRadius: '32px',
  borderBottomRightRadius: '32px',
  padding: 'calc(40px + env(safe-area-inset-top)) 24px 32px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  marginBottom: '20px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
};

const profileNameStyle = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: '-0.02em',
  marginBottom: '4px',
};

const profileEmailStyle = {
  fontSize: '13.5px',
  color: 'rgba(255,255,255,0.7)',
  fontWeight: '400',
};

const profileEditPillBtnStyle = {
  marginTop: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 14px',
  borderRadius: '20px',
  backgroundColor: 'rgba(255, 255, 255, 0.12)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const profileToastStyle = {
  margin: '12px 16px -8px',
  padding: '10px 14px',
  borderRadius: '12px',
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#065f46',
  fontSize: '13px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const profileBadgeStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#0284c7',
  backgroundColor: '#e0f2fe',
  padding: '3px 8px',
  borderRadius: '10px',
};

// White rounded card containing the menu rows
const profileMenuCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  marginInline: '16px',
  marginBottom: '16px',
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  border: '1px solid #f1f5f9',
};

const profileMenuRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 18px',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
};

const profileMenuRowLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
};

const profileMenuIconBoxStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  backgroundColor: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const profileMenuLabelStyle = {
  fontSize: '15px',
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

const profileModalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(4px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
};

const profileModalContentStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '420px',
  padding: '24px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const profileModalHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: '18px',
  paddingBottom: '12px',
  borderBottom: '1px solid #f1f5f9',
};

const profileModalTitleStyle = {
  fontSize: '18px',
  fontWeight: '800',
  color: '#0f172a',
  margin: 0,
};

const profileModalSubTitleStyle = {
  fontSize: '12px',
  color: '#64748b',
  margin: '2px 0 0 0',
};

const profileModalCloseBtnStyle = {
  border: 'none',
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const profileLabelStyle = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: '700',
  color: '#334155',
  marginBottom: '6px',
};

const profileInputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '12px',
  border: '1.5px solid #cbd5e1',
  fontSize: '14px',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
};

const profileCancelBtnStyle = {
  flex: 1,
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#f8fafc',
  color: '#475569',
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
};

const profileSaveBtnStyle = {
  flex: 1,
  padding: '12px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: '#1b7a63',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
};

const profileToggleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px',
  borderRadius: '14px',
  backgroundColor: '#f8fafc',
  border: '1px solid #f1f5f9',
};

export default Dashboard;
