import React, { useEffect, useState } from 'react';

export function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Keep splash page visible for 1.5 seconds (1500ms), then start fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Allow fade-out transition (300ms) to complete before triggering onFinish
      const finishTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 300);
      return () => clearTimeout(finishTimer);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eae5d9',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        overflow: 'hidden',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Mobile Phone Container Frame */}
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f7f4eb',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.08)',
          userSelect: 'none',
        }}
      >
        {/* Top-Left Woven Fabric Corner Texture Accent */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '180px',
            height: '180px',
            pointerEvents: 'none',
            opacity: 0.65,
          }}
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 0 0 L 180 0 C 130 30 50 50 0 180 Z"
            fill="#eae3d2"
          />
          <path
            d="M 0 0 L 140 0 C 100 25 35 40 0 140 Z"
            fill="#ded5bf"
            opacity="0.5"
          />
          <path d="M 0 20 Q 80 40 160 0" stroke="#c8beaa" strokeWidth="1" opacity="0.6" strokeDasharray="3,3" />
          <path d="M 0 50 Q 60 70 120 0" stroke="#c8beaa" strokeWidth="1" opacity="0.6" strokeDasharray="3,3" />
          <path d="M 0 80 Q 40 90 90 0" stroke="#c8beaa" strokeWidth="1" opacity="0.6" strokeDasharray="3,3" />
        </svg>

        {/* Bottom-Right Woven Fabric Corner Texture Accent */}
        <svg
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '200px',
            height: '200px',
            pointerEvents: 'none',
            opacity: 0.65,
          }}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 200 200 L 20 200 C 60 150 140 120 200 0 Z"
            fill="#eae3d2"
          />
          <path
            d="M 200 200 L 60 200 C 90 160 160 140 200 40 Z"
            fill="#ded5bf"
            opacity="0.5"
          />
          <path d="M 40 200 Q 110 140 200 40" stroke="#c8beaa" strokeWidth="1" opacity="0.6" strokeDasharray="3,3" />
          <path d="M 80 200 Q 140 160 200 80" stroke="#c8beaa" strokeWidth="1" opacity="0.6" strokeDasharray="3,3" />
          <path d="M 120 200 Q 170 180 200 120" stroke="#c8beaa" strokeWidth="1" opacity="0.6" strokeDasharray="3,3" />
        </svg>

        {/* Center Main Content Group */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 24px',
            zIndex: 2,
          }}
        >
          {/* Rounded Teal Icon Box */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '24px',
              backgroundColor: '#088365',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(8, 131, 101, 0.22)',
              marginBottom: '22px',
            }}
          >
            {/* White 3x3 Grid Matrix Icon */}
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="16.25" y="4" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="28.5" y="4" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="4" y="16.25" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="16.25" y="16.25" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="28.5" y="16.25" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="4" y="28.5" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="16.25" y="28.5" width="9.5" height="9.5" rx="2.5" fill="white" />
              <rect x="28.5" y="28.5" width="9.5" height="9.5" rx="2.5" fill="white" />
            </svg>
          </div>

          {/* Brand Title */}
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              color: '#0b1a30',
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            FabriSense
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#4a6175',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              margin: '0 0 32px 0',
              maxWidth: '280px',
              lineHeight: 1.4,
            }}
          >
            AI-POWERED FABRIC QUALITY INSPECTION
          </p>

          {/* 3 Pagination / Loading Indicator Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                backgroundColor: '#9ecfc2',
              }}
            />
            <div
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                backgroundColor: '#088365',
              }}
            />
            <div
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                backgroundColor: '#9ecfc2',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
