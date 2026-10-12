import React, { useEffect, useState } from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';

function getDefectBox(defect) {
  if (defect.box?.top != null && defect.box?.left != null
    && defect.box?.width != null && defect.box?.height != null) {
    return defect.box;
  }

  const coordinates = [defect.y, defect.x, defect.width, defect.height];
  if (coordinates.some((value) => value == null || !Number.isFinite(Number(value)))) {
    return null;
  }

  return {
    top: `${defect.y}%`,
    left: `${defect.x}%`,
    width: `${defect.width}%`,
    height: `${defect.height}%`,
  };
}

function DefectBoxes({ defects }) {
  return defects.map((defect, index) => {
    const box = getDefectBox(defect);
    if (!box) return null;

    const name = defect.name || defect.type || defect.defect_type || 'Defect';
    const color = defect.severity === 'Critical'
      ? '#ef4444'
      : defect.severity === 'Low' || defect.severity === 'Minor'
        ? '#eab308'
        : '#f97316';

    return (
      <div
        key={defect.id || index}
        style={{
          position: 'absolute',
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
          border: `2px solid ${color}`,
          background: `${color}20`,
          borderRadius: '4px',
          pointerEvents: 'none',
        }}
      >
        <span style={{
          position: 'absolute',
          left: 0,
          bottom: '100%',
          color: '#fff',
          background: color,
          borderRadius: '3px 3px 0 0',
          padding: '2px 5px',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {name}{defect.confidence != null ? ` - ${defect.confidence}` : ''}
        </span>
      </div>
    );
  });
}

export default function InspectionImageReview({ src, defects = [], alt = 'Inspected fabric image' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetections, setShowDetections] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div style={{ position: 'relative', width: '100%', lineHeight: 0 }}>
        <img src={src} alt={alt} style={{ width: '100%', height: 'auto', display: 'block' }} />
        {showDetections && <DefectBoxes defects={defects} />}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open full-size inspection image"
          title="Open full-size image"
          style={{
            position: 'absolute',
            right: '10px',
            top: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 10px',
            color: '#fff',
            background: 'rgba(15, 23, 42, 0.82)',
            border: 0,
            borderRadius: '8px',
            cursor: 'pointer',
            lineHeight: 1.2,
          }}
        >
          <Maximize2 size={16} />
          View full image
        </button>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-size inspection image"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(2, 6, 23, 0.96)',
            color: '#fff',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Full-size inspection image</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.5))} aria-label="Zoom out" style={viewerButtonStyle}>
                <Minus size={18} />
              </button>
              <span style={{ minWidth: '44px', textAlign: 'center', fontSize: '13px' }}>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(4, value + 0.5))} aria-label="Zoom in" style={viewerButtonStyle}>
                <Plus size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowDetections((value) => !value)}
                aria-pressed={showDetections}
                style={{ ...viewerButtonStyle, width: 'auto', padding: '0 10px', fontSize: '12px' }}
              >
                {showDetections ? 'Hide boxes' : 'Show boxes'}
              </button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close image viewer" style={viewerButtonStyle}>
                <X size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', width: `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : 'none', lineHeight: 0 }}>
              <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: 'auto' }} />
              {showDetections && <DefectBoxes defects={defects} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const viewerButtonStyle = {
  width: '36px',
  height: '36px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  background: '#1e293b',
  border: '1px solid #475569',
  borderRadius: '8px',
  cursor: 'pointer',
};
