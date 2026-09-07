import React, { useState } from 'react';
import { Mail, Phone, Lock, KeyRound, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { EmailInput } from './EmailInput';
import { PhoneInput } from './PhoneInput';
import { PasswordInput } from './PasswordInput';
import { OtpInput } from './OtpInput';
import { SocialLogin } from './SocialLogin';

export function AuthCard({ onLoginSuccess, onForgotClick, soundEnabled }) {
  // State
  const [entryMode, setEntryMode] = useState('email'); // 'email' | 'phone'
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'otp'

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('US');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Audio effect helper
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      console.log(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    playClickSound();

    // Validate based on active entry mode
    if (entryMode === 'email') {
      if (!email) {
        setError('Please enter your email address');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Invalid email address format');
        return;
      }
    } else {
      if (!phone || phone.length < 6) {
        setError('Please enter a valid phone number');
        return;
      }
    }

    // Validate based on active auth method
    if (authMethod === 'password') {
      if (!password) {
        setError('Please enter your password');
        return;
      }
    } else {
      const fullOtp = otp.join('');
      if (fullOtp.length < 6) {
        setError('Please enter the full 6-digit OTP code');
        return;
      }
    }

    // Simulate login progress
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        entryMode,
        authMethod,
        email,
        phone,
        country,
      });
    }, 1500);
  };

  const handleSocialLogin = (provider) => {
    playClickSound();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        entryMode: 'email',
        authMethod: `social-${provider.toLowerCase()}`,
        email: `user@${provider.toLowerCase()}.com`,
        phone: '',
        country: 'US',
      });
    }, 1200);
  };

  return (
    <div className="glow-box fade-in" style={cardStyle}>
      {/* Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={titleStyle}>
          Portal <span className="highlight-text">Authentication</span>
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '6px' }}>
          Sign in via Email or Phone Number with high-grade encryption
        </p>
      </div>

      {/* Entry Mode Switcher Tabs (Email vs Phone) */}
      <div className="tabs-container">
        <button
          type="button"
          className={`tab-btn ${entryMode === 'email' ? 'active' : ''}`}
          onClick={() => {
            playClickSound();
            setEntryMode('email');
            setError('');
          }}
        >
          <Mail size={16} /> Email ID
        </button>
        <button
          type="button"
          className={`tab-btn ${entryMode === 'phone' ? 'active' : ''}`}
          onClick={() => {
            playClickSound();
            setEntryMode('phone');
            setError('');
          }}
        >
          <Phone size={16} /> Phone Number
        </button>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit}>
        {/* Entry Field: Email or Phone */}
        {entryMode === 'email' ? (
          <EmailInput
            value={email}
            onChange={setEmail}
            error={error && error.includes('email') ? error : ''}
            setError={setError}
          />
        ) : (
          <PhoneInput
            country={country}
            setCountry={setCountry}
            phone={phone}
            setPhone={setPhone}
            error={error && error.includes('phone') ? error : ''}
            setError={setError}
          />
        )}

        {/* Auth Method Sub-Toggle (Password vs OTP) */}
        <div style={subToggleContainerStyle}>
          <button
            type="button"
            style={{
              ...subToggleStyle,
              color: authMethod === 'password' ? '#ff4d6d' : '#64748b',
              borderColor: authMethod === 'password' ? 'rgba(255, 46, 76, 0.4)' : 'transparent',
              background: authMethod === 'password' ? 'rgba(255, 46, 76, 0.1)' : 'transparent',
            }}
            onClick={() => {
              playClickSound();
              setAuthMethod('password');
            }}
          >
            <Lock size={13} /> Use Password
          </button>

          <button
            type="button"
            style={{
              ...subToggleStyle,
              color: authMethod === 'otp' ? '#ff4d6d' : '#64748b',
              borderColor: authMethod === 'otp' ? 'rgba(255, 46, 76, 0.4)' : 'transparent',
              background: authMethod === 'otp' ? 'rgba(255, 46, 76, 0.1)' : 'transparent',
            }}
            onClick={() => {
              playClickSound();
              setAuthMethod('otp');
            }}
          >
            <KeyRound size={13} /> Use One-Time Passcode (OTP)
          </button>
        </div>

        {/* Auth Input: Password or OTP digits */}
        {authMethod === 'password' ? (
          <PasswordInput
            password={password}
            setPassword={setPassword}
            onForgotClick={onForgotClick}
          />
        ) : (
          <OtpInput
            otp={otp}
            setOtp={setOtp}
            recipientInfo={entryMode === 'email' ? email || 'your email' : `${country} ${phone}` || 'your phone'}
          />
        )}

        {/* Remember Me & Error Message Row */}
        <div style={optionsRowStyle}>
          <label style={rememberStyle}>
            <div
              onClick={() => setRememberMe(!rememberMe)}
              style={{
                ...checkboxStyle,
                background: rememberMe ? 'var(--accent-red-gradient)' : 'rgba(22, 27, 39, 0.8)',
                borderColor: rememberMe ? '#ff2e4c' : 'rgba(255, 255, 255, 0.15)',
              }}
            >
              {rememberMe && <Check size={12} color="#ffffff" />}
            </div>
            <span>Keep me signed in</span>
          </label>
        </div>

        {error && <div style={errorMessageStyle}>{error}</div>}

        {/* Glowing Red Action Button */}
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '16px' }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" style={spinnerStyle} /> Authenticating Session...
            </span>
          ) : (
            <>
              Sign In to Account <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Third Party Social Logins */}
      <SocialLogin onSocialClick={handleSocialLogin} />
    </div>
  );
}

const cardStyle = {
  maxWidth: '460px',
  width: '100%',
  margin: '20px auto 40px auto',
  padding: '36px 32px',
};

const titleStyle = {
  fontSize: '1.75rem',
  fontWeight: 800,
  color: '#ffffff',
  margin: 0,
  letterSpacing: '-0.02em',
};

const subToggleContainerStyle = {
  display: 'flex',
  gap: '8px',
  marginBottom: '16px',
};

const subToggleStyle = {
  flex: 1,
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid transparent',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '5px',
  transition: 'all 0.2s ease',
};

const optionsRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '12px 0 16px 0',
};

const rememberStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  color: '#94a3b8',
  userSelect: 'none',
};

const checkboxStyle = {
  width: '18px',
  height: '18px',
  borderRadius: '5px',
  border: '1px solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const errorMessageStyle = {
  background: 'rgba(255, 46, 76, 0.12)',
  border: '1px solid rgba(255, 46, 76, 0.4)',
  borderRadius: '8px',
  color: '#ff4d6d',
  fontSize: '0.8rem',
  fontWeight: 600,
  padding: '10px 14px',
  marginBottom: '14px',
  textAlign: 'center',
  animation: 'shake 0.35s ease',
};

const spinnerStyle = {
  width: '16px',
  height: '16px',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};
