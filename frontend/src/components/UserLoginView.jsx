import React from 'react';
import { LoginPage } from './LoginPage';

export function UserLoginView({ onLoginSuccess, onBack }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#060e0c',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ════════════════════════════════════════════════════════════════
          TOP 3/4 AREA (75% height) — Sign In / Sign Up Page
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          height: '75%',
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          borderBottom: '1.5px solid rgba(8,131,101,0.3)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      >
        <LoginPage onLoginSuccess={onLoginSuccess} onBack={onBack} theme="green" />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          BOTTOM 1/4 AREA (25% height) — User panel
      ════════════════════════════════════════════════════════════════ */}
      <div
        onClick={onBack}
        style={{
          height: '25%',
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'linear-gradient(180deg, #061813 0%, #030a08 100%)',
          cursor: 'pointer',
          overflow: 'hidden',
          userSelect: 'none',
          zIndex: 1,
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
            <pattern id="wub" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="8" height="8" rx="1" fill="white" />
              <rect x="10" y="10" width="8" height="8" rx="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wub)" />
        </svg>

        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at top, rgba(8,131,101,0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* User Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            zIndex: 2,
          }}
        >
          {/* Small User Icon */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #088365 0%, #055a44 100%)',
              border: '1px solid rgba(8,131,101,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(8,131,101,0.35)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="12" r="6" fill="white" opacity="0.95" />
              <path
                d="M4 31 C4 23.3 9.9 18 17 18 C24.1 18 30 23.3 30 31"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* User Name */}
          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: '800',
              color: '#ffffff',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            User
          </h3>
        </div>
      </div>
    </div>
  );
}

export default UserLoginView;
