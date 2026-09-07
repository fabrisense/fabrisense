import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export function PasswordInput({ password, setPassword, onForgotClick }) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const getStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'transparent' };
    if (pass.length < 6) return { score: 1, label: 'Weak', color: '#ff4d6d' };
    if (pass.length < 10 || !/\d/.test(pass)) return { score: 2, label: 'Medium', color: '#f59e0b' };
    return { score: 3, label: 'Strong', color: '#10b981' };
  };

  const strength = getStrength(password);

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  return (
    <div className="input-group">
      <div className="input-label">
        <span>Password</span>
        <button
          type="button"
          onClick={onForgotClick}
          style={forgotLinkStyle}
        >
          Forgot password?
        </button>
      </div>

      <div className="input-wrapper">
        <div className="input-icon">
          <Lock size={18} />
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          className="custom-input"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyDown}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={eyeToggleStyle}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} color="#ff4d6d" /> : <Eye size={18} color="#64748b" />}
        </button>
      </div>

      {capsLockActive && (
        <div style={capsWarningStyle}>
          <AlertTriangle size={12} color="#ff4d6d" /> Caps Lock is ON
        </div>
      )}

      {/* Password Strength Meter */}
      {password && (
        <div style={strengthContainerStyle}>
          <div style={{ flex: 1, height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden', display: 'flex', gap: '3px' }}>
            <div style={{ flex: 1, background: strength.score >= 1 ? strength.color : 'transparent', transition: 'all 0.3s' }} />
            <div style={{ flex: 1, background: strength.score >= 2 ? strength.color : 'transparent', transition: 'all 0.3s' }} />
            <div style={{ flex: 1, background: strength.score >= 3 ? strength.color : 'transparent', transition: 'all 0.3s' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 700 }}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}

const forgotLinkStyle = {
  background: 'none',
  border: 'none',
  color: '#ff6b81',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  transition: 'color 0.2s',
};

const eyeToggleStyle = {
  background: 'none',
  border: 'none',
  padding: '0 14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const capsWarningStyle = {
  fontSize: '0.72rem',
  color: '#ff4d6d',
  marginTop: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontWeight: 600,
};

const strengthContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginTop: '6px',
};
