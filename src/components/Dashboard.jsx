import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck, LogOut, KeyRound, User, Mail, Phone, Lock, Cpu, Sparkles } from 'lucide-react';

export function Dashboard({ userData, onLogout }) {
  useEffect(() => {
    // Launch celebration confetti with red & dark red theme colors
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff2e4c', '#ff003c', '#ffffff', '#e50914'],
      });
    } catch (e) {
      console.log(e);
    }
  }, []);

  const loginId = userData.entryMode === 'email' ? userData.email : `${userData.country} ${userData.phone}`;

  return (
    <div className="fade-in glow-box" style={dashboardContainerStyle}>
      {/* Top Banner Status */}
      <div style={headerStyle}>
        <div style={avatarStyle}>
          <User size={36} color="#ff2e4c" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            Welcome back, <span className="highlight-text">Operator</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Session authenticated securely via dual-factor verification.
          </p>
        </div>
      </div>

      {/* Grid Status Cards */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            {userData.entryMode === 'email' ? <Mail size={18} color="#ff2e4c" /> : <Phone size={18} color="#ff2e4c" />}
          </div>
          <div>
            <div style={labelStyle}>Primary Identifier</div>
            <div style={valStyle}>{loginId || 'user@fabrisense.io'}</div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            {userData.authMethod === 'password' ? <Lock size={18} color="#ff2e4c" /> : <KeyRound size={18} color="#ff2e4c" />}
          </div>
          <div>
            <div style={labelStyle}>Auth Vector</div>
            <div style={valStyle}>
              {userData.authMethod === 'password' ? 'Password Encrypted' : '6-Digit OTP Verified'}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            <ShieldCheck size={18} color="#4ade80" />
          </div>
          <div>
            <div style={labelStyle}>Security Status</div>
            <div style={{ ...valStyle, color: '#4ade80' }}>256-Bit TLS Active</div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            <Cpu size={18} color="#ff2e4c" />
          </div>
          <div>
            <div style={labelStyle}>Session ID</div>
            <div style={{ ...valStyle, fontFamily: 'monospace', fontSize: '0.78rem' }}>
              FS-AUTH-{Math.random().toString(36).substring(2, 9).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onLogout} className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }}>
          <LogOut size={16} /> Sign Out Session
        </button>
      </div>
    </div>
  );
}

const dashboardContainerStyle = {
  maxWidth: '680px',
  width: '100%',
  margin: '40px auto',
  padding: '36px',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '1px solid rgba(255, 46, 76, 0.2)',
};

const avatarStyle = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  background: 'rgba(255, 46, 76, 0.12)',
  border: '2px solid #ff2e4c',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 25px rgba(255, 46, 76, 0.4)',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px',
};

const cardStyle = {
  background: 'rgba(22, 27, 39, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '14px',
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
};

const iconBoxStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  background: 'rgba(255, 46, 76, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(255, 46, 76, 0.2)',
};

const labelStyle = {
  fontSize: '0.72rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 600,
};

const valStyle = {
  fontSize: '0.9rem',
  fontWeight: 700,
  color: '#ffffff',
  marginTop: '2px',
};
