import React, { useEffect, useState } from 'react';

export function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Keep splash page visible for 1 second (1000ms), then start fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Allow fade-out transition (300ms) to complete before triggering onFinish
      const finishTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 300);
      return () => clearTimeout(finishTimer);
    }, 1000);

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
        justifyContent: 'space-between',
        backgroundColor: '#0d182e',
        backgroundImage: 'radial-gradient(circle at 50% 40%, #152646 0%, #0a1325 80%)',
        color: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        overflow: 'hidden',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Intricate Fabric Weave Pattern Overlay */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.22,
          pointerEvents: 'none',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="fabricPattern" width="120" height="120" patternUnits="userSpaceOnUse">
            {/* Diamond weave grid lines */}
            <path
              d="M 60 0 L 120 60 L 60 120 L 0 60 Z"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="0.8"
            />
            <path
              d="M 60 20 L 100 60 L 60 100 L 20 60 Z"
              fill="none"
              stroke="#93c5fd"
              strokeWidth="0.6"
              strokeDasharray="2,2"
            />
            <circle cx="60" cy="60" r="16" fill="none" stroke="#60a5fa" strokeWidth="0.8" />
            <circle cx="60" cy="60" r="32" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3,3" />

            {/* Corner motifs */}
            <path d="M 0 0 Q 30 0 30 30 Q 0 30 0 0 Z" fill="none" stroke="#60a5fa" strokeWidth="0.6" />
            <path d="M 120 0 Q 90 0 90 30 Q 120 30 120 0 Z" fill="none" stroke="#60a5fa" strokeWidth="0.6" />
            <path d="M 0 120 Q 30 120 30 90 Q 0 90 0 120 Z" fill="none" stroke="#60a5fa" strokeWidth="0.6" />
            <path d="M 120 120 Q 90 120 90 90 Q 120 90 120 120 Z" fill="none" stroke="#60a5fa" strokeWidth="0.6" />

            {/* Swirls and curves */}
            <path d="M 30 60 C 30 40 40 30 60 30 C 80 30 90 40 90 60 C 90 80 80 90 60 90 C 40 90 30 80 30 60 Z" fill="none" stroke="#93c5fd" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#fabricPattern)" />
      </svg>



      {/* Center Hero Area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
          zIndex: 2,
          marginTop: '-30px',
        }}
      >
        {/* Rounded Green Icon Container */}
        <div
          style={{
            width: '92px',
            height: '92px',
            borderRadius: '26px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(16, 185, 129, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
            marginBottom: '26px',
          }}
        >
          {/* Custom 3x3 Fabric/Grid Matrix Icon */}
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="10" height="10" rx="2.5" fill="white" />
            <rect x="17" y="5" width="10" height="10" rx="2.5" fill="white" />
            <rect x="29" y="5" width="10" height="10" rx="2.5" fill="white" />
            <rect x="5" y="17" width="10" height="10" rx="2.5" fill="white" />
            <rect x="17" y="17" width="10" height="10" rx="2.5" fill="white" />
            <rect x="29" y="17" width="10" height="10" rx="2.5" fill="white" />
            <rect x="5" y="29" width="10" height="10" rx="2.5" fill="white" />
            <rect x="17" y="29" width="10" height="10" rx="2.5" fill="white" />
            <rect x="29" y="29" width="10" height="10" rx="2.5" fill="white" />
          </svg>
        </div>

        {/* Brand Title */}
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#ffffff',
            margin: '0 0 10px 0',
            letterSpacing: '-0.02em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          FabriSense
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '0.78rem',
            fontWeight: '600',
            color: 'rgba(203, 213, 225, 0.82)',
            letterSpacing: '0.11em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          AI-POWERED FABRIC QUALITY INSPECTION
        </p>
      </div>

      {/* Footer Area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '16px',
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            color: 'rgba(203, 213, 225, 0.7)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '18px',
          }}
        >
          TRUSTED BY WEAVERS & MILLS
        </span>


      </div>
    </div>
  );
}

export default SplashScreen;
