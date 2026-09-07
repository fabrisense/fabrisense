import React from 'react';
import { ShieldCheck, Volume2, VolumeX, Sparkles, Flame, HelpCircle } from 'lucide-react';

export function Navbar({ soundEnabled, setSoundEnabled, glowIntensity, setGlowIntensity }) {
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const toggleGlow = () => {
    setGlowIntensity(glowIntensity === 'high' ? 'standard' : 'high');
  };

  return (
    <header className="navbar-header" style={navStyle}>
      <div className="nav-logo" style={logoStyle}>
        <div style={iconBadgeStyle}>
          <Flame size={20} color="#ff2e4c" />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em' }}>
          FABRI<span className="highlight-text">SENSE</span>
        </span>
        <span style={versionTagStyle}>v2.4 SECURE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="security-badge" style={badgeStyle}>
          <ShieldCheck size={14} color="#ff2e4c" />
          <span>ENCRYPTED DUAL-AUTH</span>
        </div>

        <button 
          onClick={toggleGlow}
          title="Toggle Red Glow Mode"
          style={actionBtnStyle}
        >
          <Sparkles size={16} color={glowIntensity === 'high' ? '#ff2e4c' : '#94a3b8'} />
          <span style={{ fontSize: '0.75rem', display: 'none', sm: 'inline' }}>
            {glowIntensity === 'high' ? 'NEON RED' : 'SOFT RED'}
          </span>
        </button>

        <button 
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Audio Effects' : 'Enable Audio Effects'}
          style={actionBtnStyle}
        >
          {soundEnabled ? <Volume2 size={16} color="#ff2e4c" /> : <VolumeX size={16} color="#94a3b8" />}
        </button>
      </div>
    </header>
  );
}

const navStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 32px',
  width: '100%',
  zIndex: 10,
  background: 'rgba(8, 10, 15, 0.65)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(255, 46, 76, 0.15)',
};

const logoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const iconBadgeStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'rgba(255, 46, 76, 0.12)',
  border: '1px solid rgba(255, 46, 76, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 15px rgba(255, 46, 76, 0.2)',
};

const versionTagStyle = {
  fontSize: '0.65rem',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '20px',
  background: 'rgba(255, 46, 76, 0.15)',
  color: '#ff4d6d',
  border: '1px solid rgba(255, 46, 76, 0.3)',
};

const badgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '20px',
  background: 'rgba(22, 27, 39, 0.7)',
  border: '1px solid rgba(255, 46, 76, 0.25)',
  color: '#cbd5e1',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.03em',
};

const actionBtnStyle = {
  background: 'rgba(22, 27, 39, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  padding: '8px 12px',
  color: '#f3f4f8',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
};
