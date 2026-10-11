import React from 'react';
import { LoginPage } from './LoginPage';

export function AdminLoginView({ onLoginSuccess, onBack }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#060a14',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ════════════════════════════════════════════════════════════════
          TOP 1/4 AREA (25% height) — Admin panel
      ════════════════════════════════════════════════════════════════ */}
      <div
        onClick={onBack}
        style={{
          height: '25%',
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0a1738 0%, #060d20 100%)',
          cursor: 'pointer',
          overflow: 'hidden',
          userSelect: 'none',
          zIndex: 1,
          borderBottom: '1.5px solid rgba(37,99,235,0.3)',
        }}
      >
        {/* Woven fabric texture overlay */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.05,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <pattern id="wab" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="8" height="8" rx="1" fill="white" />
              <rect x="10" y="10" width="8" height="8" rx="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wab)" />
        </svg>

        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at bottom, rgba(37,99,235,0.35) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Admin Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            zIndex: 2,
          }}
        >
          {/* Shield Icon */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: '1px solid rgba(37,99,235,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 34 34" fill="none">
              <path
                d="M17 3 L29 8 V18 C29 24.6 23.6 30.4 17 32 C10.4 30.4 5 24.6 5 18 V8 L17 3Z"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="17" cy="14" r="3.5" fill="white" opacity="0.95" />
              <path d="M10 26 C10 21.6 13.1 18 17 18 C20.9 18 24 21.6 24 26"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          {/* Admin Name */}
          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: '800',
              color: '#ffffff',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Admin
          </h3>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          BOTTOM 3/4 AREA (75% height) — Admin Sign In / Sign Up Page
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          height: '75%',
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      >
        <LoginPage onLoginSuccess={onLoginSuccess} onBack={onBack} theme="blue" />
      </div>
    </div>
  );
}

export default AdminLoginView;
