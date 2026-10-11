import React, { useEffect, useState } from 'react';
import logoImg from '../assets/logo.jpg';

export function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('idle'); // idle → pulse → fadeout

  useEffect(() => {
    // Start subtle pulse animation immediately
    const pulseTimer = setTimeout(() => setPhase('pulse'), 100);

    // Begin fade-out after 2.2 seconds
    const fadeTimer = setTimeout(() => {
      setPhase('fadeout');
      const finishTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 600);
      return () => clearTimeout(finishTimer);
    }, 2200);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(fadeTimer);
    };
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
        backgroundColor: '#000000',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        overflow: 'hidden',
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
        pointerEvents: phase === 'fadeout' ? 'none' : 'auto',
      }}
    >
      {/* Subtle radial glow behind logo */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(220,220,220,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Center Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          zIndex: 2,
          gap: 0,
        }}
      >
        {/* Logo Image */}
        <div
          style={{
            width: '150px',
            height: '150px',
            borderRadius: '32px',
            overflow: 'hidden',
            marginBottom: '28px',
            transform: phase === 'pulse' ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 0.8s ease-in-out',
            boxShadow:
              phase === 'pulse'
                ? '0 0 60px rgba(255,255,255,0.12), 0 0 120px rgba(255,255,255,0.04)'
                : '0 0 0px rgba(255,255,255,0)',
          }}
        >
          <img
            src={logoImg}
            alt="FabriSense Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            draggable={false}
          />
        </div>

        {/* Brand Title */}
        <h1
          style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            color: '#ffffff',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: phase === 'pulse' || phase === 'fadeout' ? 1 : 0,
            transform:
              phase === 'pulse' || phase === 'fadeout'
                ? 'translateY(0)'
                : 'translateY(10px)',
            transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
          }}
        >
          FabriSense
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '0.68rem',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            margin: '0 0 40px 0',
            opacity: phase === 'pulse' || phase === 'fadeout' ? 1 : 0,
            transform:
              phase === 'pulse' || phase === 'fadeout'
                ? 'translateY(0)'
                : 'translateY(10px)',
            transition: 'opacity 0.6s ease 0.45s, transform 0.6s ease 0.45s',
          }}
        >
          AI-POWERED FABRIC QUALITY INSPECTION
        </p>

        {/* Loading bar */}
        <div
          style={{
            width: '48px',
            height: '2px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: '2px',
            overflow: 'hidden',
            opacity: phase === 'pulse' || phase === 'fadeout' ? 1 : 0,
            transition: 'opacity 0.4s ease 0.6s',
          }}
        >
          <div
            style={{
              height: '100%',
              width: phase === 'pulse' ? '100%' : '0%',
              background: 'linear-gradient(90deg, #e0e0e0, #ffffff)',
              borderRadius: '2px',
              transition: 'width 1.8s ease-out 0.3s',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
