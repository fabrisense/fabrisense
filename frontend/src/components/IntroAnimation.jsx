import React, { useEffect, useState } from 'react';
import logoImg from '../assets/logo.jpg';

/*
 * IntroAnimation
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase timeline (ms from mount):
 *   0      → logo appears (scale-in)
 *   600    → threads begin spreading outward
 *   1800   → threads fully extended, glow peaks
 *   2200   → whole screen fades out
 *   2800   → onFinish() called
 */

const THREADS = [
  // { id, angle (degrees), length, delay(ms), curve }
  { id: 't1',  angle: 0,    length: 56, delay: 0,   thick: 2   }, // right
  { id: 't2',  angle: 45,   length: 78, delay: 60,  thick: 1.5 }, // bottom-right
  { id: 't3',  angle: 90,   length: 56, delay: 120, thick: 2   }, // down
  { id: 't4',  angle: 135,  length: 78, delay: 80,  thick: 1.5 }, // bottom-left
  { id: 't5',  angle: 180,  length: 56, delay: 40,  thick: 2   }, // left
  { id: 't6',  angle: 225,  length: 78, delay: 100, thick: 1.5 }, // top-left
  { id: 't7',  angle: 270,  length: 56, delay: 20,  thick: 2   }, // up
  { id: 't8',  angle: 315,  length: 78, delay: 70,  thick: 1.5 }, // top-right
  // Extra thin filaments for organic feel
  { id: 't9',  angle: 22,   length: 65, delay: 150, thick: 1   },
  { id: 't10', angle: 67,   length: 65, delay: 200, thick: 1   },
  { id: 't11', angle: 112,  length: 65, delay: 180, thick: 1   },
  { id: 't12', angle: 157,  length: 65, delay: 130, thick: 1   },
  { id: 't13', angle: 202,  length: 65, delay: 160, thick: 1   },
  { id: 't14', angle: 247,  length: 65, delay: 140, thick: 1   },
  { id: 't15', angle: 292,  length: 65, delay: 110, thick: 1   },
  { id: 't16', angle: 337,  length: 65, delay: 90,  thick: 1   },
];

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function IntroAnimation({ onFinish }) {
  const [phase, setPhase] = useState('enter'); // enter → threads → glow → fadeout

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('threads'), 600);
    const t2 = setTimeout(() => setPhase('glow'),    1500);
    const t3 = setTimeout(() => setPhase('fadeout'), 2200);
    const t4 = setTimeout(() => { if (onFinish) onFinish(); }, 2900);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onFinish]);

  const isThreads = phase === 'threads' || phase === 'glow' || phase === 'fadeout';
  const isGlow    = phase === 'glow'    || phase === 'fadeout';
  const isFadeout = phase === 'fadeout';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: isFadeout ? 0 : 1,
        transition: 'opacity 0.7s ease-out',
        pointerEvents: isFadeout ? 'none' : 'auto',
      }}
    >
      {/* ── SVG thread layer (fills whole screen, origin = center) ── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glowing red filter */}
          <filter id="threadGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Stronger glow filter for peak */}
          <filter id="threadGlowStrong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Each thread radiates from the exact center */}
        <g transform="translate(50%, 50%)">
          {THREADS.map(({ id, angle, length, delay, thick }) => {
            const rad = degToRad(angle);
            // End point in viewport-percentage units — reach well past screen edge
            const ex = Math.cos(rad) * length;
            const ey = Math.sin(rad) * length;

            // Slight organic curve: perpendicular offset
            const perpX = -Math.sin(rad) * (length * 0.08);
            const perpY =  Math.cos(rad) * (length * 0.08);
            const mx = Math.cos(rad) * (length * 0.5) + perpX;
            const my = Math.sin(rad) * (length * 0.5) + perpY;

            const units = 'vmin'; // responsive units

            return (
              <g key={id}>
                {/* Main red thread */}
                <path
                  d={`M 0 0 Q ${mx}${units} ${my}${units} ${ex}${units} ${ey}${units}`}
                  fill="none"
                  stroke="#e02020"
                  strokeWidth={thick}
                  strokeLinecap="round"
                  filter={isGlow ? 'url(#threadGlowStrong)' : 'url(#threadGlow)'}
                  strokeDasharray="200"
                  strokeDashoffset={isThreads ? '0' : '200'}
                  style={{
                    transition: isThreads
                      ? `stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1) ${delay}ms`
                      : 'none',
                    opacity: isThreads ? (isGlow ? 0.95 : 0.8) : 0,
                  }}
                />
                {/* Bright core highlight */}
                <path
                  d={`M 0 0 Q ${mx}${units} ${my}${units} ${ex}${units} ${ey}${units}`}
                  fill="none"
                  stroke="#ff6060"
                  strokeWidth={thick * 0.4}
                  strokeLinecap="round"
                  strokeDasharray="200"
                  strokeDashoffset={isThreads ? '0' : '200'}
                  style={{
                    transition: isThreads
                      ? `stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1) ${delay + 80}ms`
                      : 'none',
                    opacity: isThreads ? 0.6 : 0,
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Radial glow that pulses at peak ── */}
      <div
        style={{
          position: 'absolute',
          width: isGlow ? '600px' : '0px',
          height: isGlow ? '600px' : '0px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,20,20,0.18) 0%, rgba(200,20,20,0.06) 40%, transparent 70%)',
          transition: 'width 0.8s ease-out, height 0.8s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* ── Center logo ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* Logo box */}
        <div
          style={{
            width: '130px',
            height: '130px',
            borderRadius: '28px',
            overflow: 'hidden',
            transform: phase === 'enter' ? 'scale(0.6)' : isGlow ? 'scale(1.06)' : 'scale(1)',
            opacity: phase === 'enter' ? 0 : 1,
            transition:
              phase === 'enter'
                ? 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease'
                : 'transform 0.6s ease-out',
            boxShadow: isGlow
              ? '0 0 80px rgba(220,30,30,0.35), 0 0 160px rgba(220,30,30,0.1)'
              : '0 0 30px rgba(255,255,255,0.08)',
          }}
        >
          <img
            src={logoImg}
            alt="FabriSense"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            draggable={false}
          />
        </div>

        {/* Label */}
        <p
          style={{
            marginTop: '20px',
            fontSize: '0.62rem',
            fontWeight: '700',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: isThreads ? 1 : 0,
            transition: 'opacity 0.6s ease 0.4s',
          }}
        >
          Detecting defects…
        </p>
      </div>
    </div>
  );
}

export default IntroAnimation;
