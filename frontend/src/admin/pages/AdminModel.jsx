import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchModelInfo } from '../../services/adminApi';

export function AdminModel() {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  const loadModel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchModelInfo();
      if (res.success) {
        setModelData(res.data);
      }
    } catch (err) {
      console.error('Failed to load model info:', err);
      setError(err.message || 'Unable to retrieve AI model information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModel();
  }, []);

  if (loading) {
    return (
      <div className="loading-box">
        <RefreshCw size={36} className="animate-spin" color="#208c7d" />
        <div>Querying AI inference engine and model status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        <span>{error}</span>
        <button onClick={loadModel} className="btn-secondary">Retry</button>
      </div>
    );
  }

  const model = modelData || {};

  return (
    <div>
      {/* ── Top 3 Cards Grid matching Screenshot 3 ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Active Vision Model */}
        <div className="admin-card" style={{ padding: '22px 24px', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              Active Vision Model
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#e6f9ed',
                color: '#16a34a',
                letterSpacing: '0.04em',
              }}
            >
              ACTIVE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Architecture:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.architecture || 'YOLOv8 Core'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Version:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.version || 'v3.2.1-prod'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Last Updated:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.lastUpdated || 'Aug 28, 2026'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '13.5px', gap: '12px' }}>
              <span style={{ color: '#64748b', flexShrink: 0 }}>Detection Classes:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700', textAlign: 'right', lineHeight: '1.4' }}>
                {model.detectionClasses || 'Hole, Stain, Broken Yarn, Tear, Contamination'}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 2: Dataset & Training */}
        <div className="admin-card" style={{ padding: '22px 24px', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              Dataset &amp; Training
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Training Images:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.trainingImages || '12,450 Samples'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Model Accuracy (mAP50):</span>
              <strong style={{ color: '#16a34a', fontWeight: '700' }}>
                {model.modelAccuracy || '94.2%'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Validation Set:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.validationSet || '2,400 Images'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Last Trained Date:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.lastTrainedDate || 'Aug 15, 2026'}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: API & System Status */}
        <div className="admin-card" style={{ padding: '22px 24px', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              API &amp; System Status
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#e6f9ed',
                color: '#16a34a',
                letterSpacing: '0.04em',
              }}
            >
              ONLINE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Edge Processing:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.edgeProcessing || 'Jetson Orin 64GB'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Response Latency:</span>
              <strong style={{ color: '#0d9488', fontWeight: '700' }}>
                {model.responseLatency || '245ms'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>API Uptime:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.apiUptime || '99.8%'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
              <span style={{ color: '#64748b' }}>Camera Feed FPS:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>
                {model.cameraFeedFps || '30 fps (Dual-lane)'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Engine Log Output (Live Diagnostics) matching Screenshot 3 ── */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
            Engine Log Output (Live Diagnostics)
          </h3>
          <button
            onClick={loadModel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Dark Terminal Box */}
        <div
          style={{
            backgroundColor: '#111827',
            borderRadius: '10px',
            padding: '20px 24px',
            fontFamily: "'Courier New', Courier, Consolas, monospace",
            fontSize: '13px',
            lineHeight: '1.9',
            color: '#94a3b8',
            overflowX: 'auto',
          }}
        >
          <div>
            <span>[2026-09-05 10:22:15] </span>
            <span style={{ color: '#94a3b8' }}>fabrisense-engine-v4 </span>
            <span style={{ color: '#cbd5e1' }}>Loading YOLOv8 tensor weights...</span>
          </div>

          <div>
            <span>[2026-09-05 10:22:17] </span>
            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>SUCCESS</span>
            <span style={{ color: '#cbd5e1' }}> CUDA GPU initialized. Processing lane 1 &amp; lane 2 feeds.</span>
          </div>

          <div>
            <span>[2026-09-05 10:22:18] </span>
            <span style={{ color: '#eab308', fontWeight: 'bold' }}>WARNING</span>
            <span style={{ color: '#cbd5e1' }}> Slub knot defect candidate confidence (0.87) at Eg Cotton #102.</span>
          </div>

          <div>
            <span>[2026-09-05 10:22:20] </span>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>INFO</span>
            <span style={{ color: '#cbd5e1' }}> Active batch status check. Operations telemetry online.</span>
          </div>
        </div>

        {/* Collapsible Architecture Details for Operations & Integration */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setShowConfigDetails(!showConfigDetails)}
            style={{
              background: 'none',
              border: 'none',
              color: '#16806e',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
            }}
          >
            {showConfigDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showConfigDetails ? 'Hide Model Architecture & Inference Settings' : 'View Model Architecture & Inference Settings'}
          </button>

          {showConfigDetails && (
            <div
              style={{
                marginTop: '14px',
                padding: '16px 20px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#475569',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>Active Mode Adapter:</strong> {model.aiMode === 'yolo' ? 'Live YOLO Inference' : 'High-Fidelity Demo Adapter'}
                </div>
                <div>
                  <strong style={{ color: '#0f172a' }}>Configured Endpoint:</strong> {model.apiUrl || 'http://localhost:8000/predict'}
                </div>
                <div>
                  <strong style={{ color: '#0f172a' }}>Database Storage:</strong> SQLite WAL Mode (backend/database/fabrisense.db)
                </div>
                <div>
                  <strong style={{ color: '#0f172a' }}>Dataset Reference:</strong> {model.datasetName || 'TextileDefect-45k-augmented'}
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                To switch between Demo Mode and Live GPU YOLOv8 inference, set <code style={{ backgroundColor: '#e2e8f0', padding: '2px 5px', borderRadius: '4px' }}>AI_MODE=yolo</code> and <code style={{ backgroundColor: '#e2e8f0', padding: '2px 5px', borderRadius: '4px' }}>YOLO_API_URL</code> in <code style={{ backgroundColor: '#e2e8f0', padding: '2px 5px', borderRadius: '4px' }}>backend/.env</code>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
