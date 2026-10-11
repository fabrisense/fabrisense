import React, { useEffect, useState } from 'react';
import logoImg from '../assets/logo.jpg';

export function RoleSelect({ onSelectUser, onSelectAdmin }) {
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (role) => {
    setPressed(role);
    setTimeout(() => {
      if (role === 'user') onSelectUser();
      else onSelectAdmin();
    }, 300);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >

      {/* ════════════════════════════════
          TOP HALF — USER (GREEN)
      ════════════════════════════════ */}
      <div
        onClick={() => handleSelect('user')}
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #060e0c 0%, #0a1f18 100%)',
          transform: pressed === 'user' ? 'scale(0.98)' : 'scale(1)',
          transition: 'transform 0.25s ease',
          paddingBottom: '32px',
        }}
      >
        {/* Woven fabric texture */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.04,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <pattern id="wu" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="8" height="8" rx="1" fill="white" />
              <rect x="10" y="10" width="8" height="8" rx="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wu)" />
        </svg>

        {/* Radial glow at bottom (toward center divider) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at bottom, rgba(8,131,101,0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            zIndex: 1,
            textAlign: 'center',
            padding: '0 32px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #088365 0%, #055a44 100%)',
              border: '1.5px solid rgba(8,131,101,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(8,131,101,0.35)',
              marginBottom: '4px',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="12" r="6" fill="white" opacity="0.95" />
              <path
                d="M4 31 C4 23.3 9.9 18 17 18 C24.1 18 30 23.3 30 31"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <h2
              style={{
                fontSize: '1.7rem',
                fontWeight: '800',
                color: '#ffffff',
                margin: '0 0 6px 0',
                letterSpacing: '-0.025em',
              }}
            >
              User
            </h2>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.4)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Fabric inspection &amp; quality reporting
            </p>
          </div>

          {/* Sign In pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 24px',
              borderRadius: '24px',
              background: 'rgba(8,131,101,0.18)',
              border: '1.5px solid rgba(8,131,101,0.45)',
              fontSize: '0.82rem',
              fontWeight: '700',
              color: '#4ecfab',
              marginTop: '4px',
            }}
          >
            <span>Sign In</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7H11.5M8 4l3.5 3L8 10" stroke="#4ecfab" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          CENTER DIVIDER — FabriSense branding
      ════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          height: '64px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          backgroundColor: '#000000',
        }}
      >
        {/* Horizontal line left */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: '50%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))',
            marginRight: '88px',
          }}
        />

        {/* Logo + brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '0 16px',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}
          >
            <img
              src={logoImg}
              alt="FabriSense"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              draggable={false}
            />
          </div>
          <span
            style={{
              fontSize: '1.05rem',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            FabriSense
          </span>
        </div>

        {/* Horizontal line right */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            right: 0,
            height: '1px',
            background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))',
            marginLeft: '88px',
          }}
        />
      </div>

      {/* ════════════════════════════════
          BOTTOM HALF — ADMIN (BLUE)
      ════════════════════════════════ */}
      <div
        onClick={() => handleSelect('admin')}
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          background: 'linear-gradient(0deg, #050b18 0%, #0a1738 100%)',
          transform: pressed === 'admin' ? 'scale(0.98)' : 'scale(1)',
          transition: 'transform 0.25s ease',
          paddingTop: '32px',
        }}
      >
        {/* Woven fabric texture */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.04,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <pattern id="wa" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="8" height="8" rx="1" fill="white" />
              <rect x="10" y="10" width="8" height="8" rx="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wa)" />
        </svg>

        {/* Radial glow at top (toward center divider) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at top, rgba(37,99,235,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            zIndex: 1,
            textAlign: 'center',
            padding: '0 32px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: '1.5px solid rgba(37,99,235,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(37,99,235,0.35)',
              marginBottom: '4px',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
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

          <div>
            <h2
              style={{
                fontSize: '1.7rem',
                fontWeight: '800',
                color: '#ffffff',
                margin: '0 0 6px 0',
                letterSpacing: '-0.025em',
              }}
            >
              Admin
            </h2>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.4)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              System management &amp; analytics
            </p>
          </div>

          {/* Sign In pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 24px',
              borderRadius: '24px',
              background: 'rgba(37,99,235,0.18)',
              border: '1.5px solid rgba(37,99,235,0.45)',
              fontSize: '0.82rem',
              fontWeight: '700',
              color: '#60a5fa',
              marginTop: '4px',
            }}
          >
            <span>Sign In</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7H11.5M8 4l3.5 3L8 10" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}

export default RoleSelect;
