import React from 'react';
import { ShieldCheck, Volume2, VolumeX, Sparkles, Flame } from 'lucide-react';

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
          <Flame size={20} color="var(--accent-green)" />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-heading)' }}>
          FABRI<span className="highlight-text">SENSE</span>
        </span>
        <span style={versionTagStyle}>v2.4 SECURE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="security-badge" style={badgeStyle}>
          <ShieldCheck size={14} color="var(--accent-green)" />
          <span>ENCRYPTED DUAL-AUTH</span>
        </div>

        <button 
          onClick={toggleGlow}
          title="Toggle Green Glow Mode"
          style={actionBtnStyle}
        >
          <Sparkles size={16} color="var(--accent-green)" />
          <span style={{ fontSize: '0.75rem' }}>
            {glowIntensity === 'high' ? 'HIGH GLOW' : 'SOFT GLOW'}
          </span>
        </button>

        <button 
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Audio Effects' : 'Enable Audio Effects'}
          style={actionBtnStyle}
        >
          {soundEnabled ? <Volume2 size={16} color="var(--accent-green)" /> : <VolumeX size={16} color="var(--text-muted)" />}
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
  background: 'var(--bg-surface)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid var(--border-subtle)',
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
  background: 'var(--icon-box-bg)',
  border: '1px solid var(--icon-box-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 15px var(--accent-green-glow)',
};

const versionTagStyle = {
  fontSize: '0.65rem',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '20px',
  background: 'var(--badge-bg)',
  color: 'var(--accent-green)',
  border: '1px solid var(--border-subtle)',
};

const badgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '20px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-muted)',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.03em',
};

const actionBtnStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '10px',
  padding: '8px 12px',
  color: 'var(--text-heading)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
};
