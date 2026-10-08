import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, User, ArrowLeft, RefreshCw
} from 'lucide-react';
import {
  sendRegistrationOtp,
  resendRegistrationOtp,
  verifyRegistrationOtp,
  sendForgotPasswordOtp,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword as apiResetPassword,
} from '../services/api.js';

// ─── Validation ────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
function isValidEmail(val) {
  return EMAIL_REGEX.test((val || '').trim());
}

// ─── Seed users (always available) ─────────────────────────────────────────
const INITIAL_REGISTERED_USERS = [
  { name: 'Ananthi Kumar',   email: 'inspector@weavesofindia.com', password: 'password123' },
  { name: 'Handloom Weaver', email: 'ananthi.weaver@handloom.org',  password: 'password123' },
];

// ─── Small reusable UI pieces ───────────────────────────────────────────────
function Banner({ type, message }) {
  const isError = type === 'error';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      backgroundColor: isError ? 'rgba(239,68,68,0.12)' : 'rgba(15,118,110,0.10)',
      border: `1px solid ${isError ? 'rgba(239,68,68,0.35)' : 'rgba(15,118,110,0.25)'}`,
      borderRadius: '12px', padding: '10px 14px',
      fontSize: '0.82rem', color: isError ? '#ef4444' : '#0f766e',
      marginBottom: '14px', lineHeight: 1.4,
    }}>
      {isError
        ? <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
        : <CheckCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />}
      <span>{message}</span>
    </div>
  );
}

function FieldWrapper({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}>
          <AlertCircle size={13} /><span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── OTP 6-box input component ──────────────────────────────────────────────
function OtpBoxes({ value, onChange, disabled }) {
  const digits = (value || '').split('').concat(Array(6).fill('')).slice(0, 6);
  const inputRefs = useRef([]);

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, -1);
      onChange(next);
      if (i > 0) inputRefs.current[i - 1]?.focus();
      return;
    }
    if (/^\d$/.test(e.key)) {
      const next = (value + e.key).slice(0, 6);
      onChange(next);
      if (i < 5) inputRefs.current[i + 1]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          readOnly
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={() => inputRefs.current[i]?.select()}
          disabled={disabled}
          style={{
            width: '44px', height: '54px',
            textAlign: 'center', fontSize: '1.4rem', fontWeight: '800',
            background: 'var(--bg-input)',
            border: `2px solid ${d ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
            borderRadius: '12px', outline: 'none',
            color: 'var(--text-heading)',
            fontFamily: "'JetBrains Mono', monospace",
            transition: 'border-color 0.15s',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
      ))}
    </div>
  );
}

// ─── Resend countdown button ─────────────────────────────────────────────────
function ResendButton({ onResend, cooldown, setCooldown }) {
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown, setCooldown]);

  return (
    <div style={{ textAlign: 'center', marginTop: '6px' }}>
      {cooldown > 0
        ? <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Resend code in <strong style={{ color: 'var(--accent-green)' }}>{cooldown}s</strong>
          </span>
        : <button
            type="button"
            onClick={onResend}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent-green)', fontSize: '0.85rem', fontWeight: '700',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}
          >
            <RefreshCw size={14} /> Resend Code
          </button>
      }
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const inputWrap = (hasError) => ({
  display: 'flex', alignItems: 'center',
  backgroundColor: 'var(--bg-input)',
  border: `1.5px solid ${hasError ? '#ef4444' : 'var(--border-subtle)'}`,
  borderRadius: '12px', padding: '0 14px',
});

const inputStyle = {
  width: '100%', padding: '13px 10px', background: 'transparent',
  border: 'none', outline: 'none',
  color: 'var(--text-heading)', fontSize: '0.92rem', fontWeight: '500',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

const primaryBtn = (disabled) => ({
  width: '100%', padding: '15px',
  background: disabled ? '#cbd5e1' : 'var(--accent-green-gradient)',
  border: 'none', borderRadius: '14px',
  color: disabled ? '#64748b' : 'var(--btn-text)',
  fontWeight: '800', fontSize: '0.98rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : 'var(--shadow-green-glow)',
  transition: 'all 0.2s ease',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  opacity: disabled ? 0.65 : 1,
});

const outlineBtn = {
  width: '100%', padding: '14px',
  backgroundColor: 'var(--accent-green-soft)',
  border: '1.5px solid var(--accent-green)',
  borderRadius: '14px', color: 'var(--text-green)',
  fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  transition: 'all 0.2s ease',
};

// ─── Main Component ──────────────────────────────────────────────────────────
export function LoginPage({ onLoginSuccess, onBack }) {
  // 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');

  // ── Persisted user list ──
  const [users, setUsers] = useState(() => {
    try {
      const s = localStorage.getItem('fabrisense_users');
      return s ? JSON.parse(s) : INITIAL_REGISTERED_USERS;
    } catch { return INITIAL_REGISTERED_USERS; }
  });

  useEffect(() => {
    try { localStorage.setItem('fabrisense_users', JSON.stringify(users)); }
    catch (e) { console.error(e); }
  }, [users]);

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd, setLoginPwd]     = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginErr, setLoginErr]     = useState('');

  // ── Register state ──
  const [regName, setRegName]       = useState('');
  const [regEmail, setRegEmail]     = useState('');
  const [regPwd, setRegPwd]         = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regErr, setRegErr]         = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Registration OTP step: null | 'otp'
  const [regStep, setRegStep]         = useState(null);
  const [regOtp, setRegOtp]           = useState('');
  const [regOtpCooldown, setRegOtpCooldown] = useState(0);
  const [regOtpLoading, setRegOtpLoading]   = useState(false);
  // Store pending new user until OTP is verified
  const [pendingRegUser, setPendingRegUser] = useState(null);

  // ── Forgot password state ──
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotErr, setForgotErr]     = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [showNewPwd, setShowNewPwd]   = useState(false);
  // forgotStep: 'email' | 'otp' | 'reset'
  const [forgotStep, setForgotStep]   = useState('email');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotOtp, setForgotOtp]         = useState('');
  const [forgotOtpCooldown, setForgotOtpCooldown] = useState(0);
  const [forgotOtpLoading, setForgotOtpLoading]   = useState(false);
  const [forgotResetToken, setForgotResetToken]   = useState('');

  // Derived
  const pwdStrength = regPwd.length === 0 ? null : regPwd.length < 8 ? 'weak' : 'ok';

  const goMode = (m) => {
    setMode(m);
    setLoginErr('');
    setRegErr('');
    setRegSuccess('');
    setForgotErr('');
    setForgotSuccess('');
    setForgotStep('email');
    setRegStep(null);
    setRegOtp('');
    setForgotOtp('');
  };

  // ── LOGIN ────────────────────────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginErr('');

    const email = loginEmail.trim();
    const pwd   = loginPwd;

    if (!email) { setLoginErr('Please enter your email address.'); return; }
    if (!isValidEmail(email)) { setLoginErr('Please enter a valid email address.'); return; }
    if (!pwd) { setLoginErr('Please enter your password.'); return; }

    const user = users.find(u => u.email.trim().toLowerCase() === email.toLowerCase());
    if (!user) {
      setLoginErr('No account found with this email. Please create an account first.');
      return;
    }
    if (user.password !== pwd) {
      setLoginErr('Incorrect password. Please try again.');
      return;
    }

    // Success — navigate to dashboard
    onLoginSuccess?.({ name: user.name, email: user.email });
  };

  // ── REGISTER — Step 1: collect details and send OTP ──────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegErr('');
    setRegSuccess('');

    const name  = regName.trim();
    const email = regEmail.trim();
    const pwd   = regPwd;
    const conf  = regConfirm;

    if (!name)                    { setRegErr('Please enter your full name.'); return; }
    if (!email)                   { setRegErr('Please enter your email address.'); return; }
    if (!isValidEmail(email))     { setRegErr('Please enter a valid email address.'); return; }
    if (pwd.length < 8)           { setRegErr('Password must be at least 8 characters.'); return; }
    if (pwd !== conf)             { setRegErr('Passwords do not match.'); return; }

    const dup = users.find(u => u.email.trim().toLowerCase() === email.toLowerCase());
    if (dup) { setRegErr('An account with this email already exists. Please sign in.'); return; }

    setRegLoading(true);
    try {
      const result = await sendRegistrationOtp(email);
      setPendingRegUser({ name, email, password: pwd });
      setRegOtpCooldown(result.cooldown || 60);
      setRegStep('otp');
      setRegOtp('');
      setRegErr('');
      setRegSuccess(`Verification code sent to ${email}.`);
    } catch (err) {
      setRegErr(err.message || 'Failed to send verification email. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // ── REGISTER — Step 2: verify OTP ────────────────────────────────────────
  const handleRegVerifyOtp = async (e) => {
    e.preventDefault();
    setRegErr('');
    if (regOtp.length !== 6) { setRegErr('Please enter the complete 6-digit code.'); return; }

    setRegOtpLoading(true);
    try {
      await verifyRegistrationOtp(pendingRegUser?.email, regOtp);

      // OTP verified — create the account
      const newUser = pendingRegUser;
      setUsers(prev => [...prev, newUser]);
      setPendingRegUser(null);

      setRegSuccess('Account verified! Redirecting to sign in…');
      setTimeout(() => {
        setLoginEmail(newUser.email);
        setLoginPwd('');
        setRegName('');
        setRegEmail('');
        setRegPwd('');
        setRegConfirm('');
        setRegStep(null);
        setRegOtp('');
        goMode('login');
      }, 1200);
    } catch (err) {
      setRegErr(err.message || 'Verification failed. Please try again.');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleRegResendOtp = async () => {
    setRegErr('');
    setRegSuccess('');
    try {
      const result = await resendRegistrationOtp(pendingRegUser?.email);
      setRegOtpCooldown(result.cooldown || 60);
      setRegOtp('');
      setRegSuccess('A new verification code has been sent.');
    } catch (err) {
      setRegErr(err.message || 'Could not resend code. Please wait and try again.');
    }
  };

  // ── FORGOT PASSWORD — Step 1: request OTP ────────────────────────────────
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setForgotErr('');
    const email = forgotEmail.trim();
    if (!email)               { setForgotErr('Please enter your email address.'); return; }
    if (!isValidEmail(email)) { setForgotErr('Please enter a valid email address.'); return; }

    setForgotOtpLoading(true);
    try {
      const result = await sendForgotPasswordOtp(email);
      setForgotOtpCooldown(result.cooldown || 60);
      setForgotOtp('');
      setForgotStep('otp');
      setForgotSuccess(`Verification code sent to ${email}.`);
    } catch (err) {
      setForgotErr(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setForgotOtpLoading(false);
    }
  };

  // ── FORGOT PASSWORD — Step 2: verify OTP ─────────────────────────────────
  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotErr('');
    if (forgotOtp.length !== 6) { setForgotErr('Please enter the complete 6-digit code.'); return; }

    setForgotOtpLoading(true);
    try {
      const result = await verifyForgotPasswordOtp(forgotEmail.trim(), forgotOtp);
      setForgotResetToken(result.verifiedToken);
      setForgotStep('reset');
      setForgotSuccess('');
      setForgotOtp('');
    } catch (err) {
      setForgotErr(err.message || 'Verification failed. Please try again.');
    } finally {
      setForgotOtpLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    setForgotErr('');
    setForgotSuccess('');
    try {
      const result = await resendForgotPasswordOtp(forgotEmail.trim());
      setForgotOtpCooldown(result.cooldown || 60);
      setForgotOtp('');
      setForgotSuccess('A new verification code has been sent.');
    } catch (err) {
      setForgotErr(err.message || 'Could not resend code. Please wait and try again.');
    }
  };

  // ── FORGOT PASSWORD — Step 3: set new password ────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotErr('');
    if (newPwd.length < 8)        { setForgotErr('Password must be at least 8 characters.'); return; }
    if (newPwd !== newPwdConfirm) { setForgotErr('Passwords do not match.'); return; }

    setForgotOtpLoading(true);
    try {
      await apiResetPassword(forgotEmail.trim(), forgotResetToken, newPwd);

      // Also update the local user store so existing login still works
      setUsers(prev =>
        prev.map(u =>
          u.email.trim().toLowerCase() === forgotEmail.trim().toLowerCase()
            ? { ...u, password: newPwd }
            : u
        )
      );

      setForgotSuccess('Password updated! You can now sign in with your new password.');
      setLoginEmail(forgotEmail.trim());
      setLoginPwd('');

      setTimeout(() => goMode('login'), 1400);
    } catch (err) {
      setForgotErr(err.message || 'Password reset failed. Please try again.');
    } finally {
      setForgotOtpLoading(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'var(--bg-deep)',
      color: 'var(--text-main)',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* ── Top Header ── */}
      <div style={{
        width: '100%', display: 'flex', alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => {
            if (mode === 'login') { onBack?.(); }
            else if (mode === 'register' && regStep === 'otp') { setRegStep(null); setRegErr(''); setRegSuccess(''); }
            else if (mode === 'forgot' && forgotStep === 'otp') { setForgotStep('email'); setForgotErr(''); setForgotSuccess(''); }
            else if (mode === 'forgot' && forgotStep === 'reset') { setForgotStep('otp'); setForgotErr(''); }
            else { goMode('login'); }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent-green)', fontWeight: '700', fontSize: '0.9rem',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            padding: '6px 10px 6px 0',
          }}>
          <ArrowLeft size={20} /> Back
        </button>

        {/* Logo */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginRight: '60px' }}>
          <div style={{ width: '7px', height: '18px', backgroundColor: 'var(--accent-green)', borderRadius: '3px' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>
            FabriSense
          </span>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* ================================================================
              MODE: LOGIN
          ================================================================ */}
          {mode === 'login' && (
            <>
              {/* Icon + Heading */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '68px', height: '68px', margin: '0 auto 16px',
                  borderRadius: '20px', backgroundColor: 'var(--icon-box-bg)',
                  border: '1px solid var(--icon-box-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z"
                      stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2v6h6" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 13h6M9 17h4" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 style={{ fontSize: '1.9rem', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                  Welcome back
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Sign in to inspect your fabric quality
                </p>
              </div>

              {loginErr && <Banner type="error" message={loginErr} />}

              <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email — using type="text" to avoid Chrome blank screen bug */}
                <FieldWrapper label="Email Address">
                  <div style={inputWrap(false)}>
                    <Mail size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="inspector@weavesofindia.com"
                      value={loginEmail}
                      onChange={e => { setLoginErr(''); setLoginEmail(e.target.value); }}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    {loginEmail && isValidEmail(loginEmail) &&
                      users.find(u => u.email.toLowerCase() === loginEmail.trim().toLowerCase()) &&
                      <CheckCircle size={17} color="var(--accent-green)" />
                    }
                  </div>
                </FieldWrapper>

                {/* Password */}
                <FieldWrapper label="Password">
                  <div style={inputWrap(false)}>
                    <Lock size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type={showLoginPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={loginPwd}
                      onChange={e => { setLoginErr(''); setLoginPwd(e.target.value); }}
                    />
                    <button type="button" onClick={() => setShowLoginPwd(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      {showLoginPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      onClick={() => { setForgotEmail(loginEmail); goMode('forgot'); }}
                      style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-green)', cursor: 'pointer', textDecoration: 'underline' }}>
                      Forgot Password?
                    </span>
                  </div>
                </FieldWrapper>

                <button type="submit" style={{ ...primaryBtn(false), marginTop: '6px' }}>
                  Sign In
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                  <span style={{ padding: '0 12px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                </div>

                <button type="button" style={outlineBtn} onClick={() => goMode('register')}>
                  Create Account
                </button>
              </form>
            </>
          )}

          {/* ================================================================
              MODE: REGISTER — Step 1: collect details
          ================================================================ */}
          {mode === 'register' && regStep === null && (
            <>
              <div style={{ marginBottom: '22px' }}>
                <h1 style={{ fontSize: '1.9rem', fontWeight: '800', margin: '0 0 5px', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                  Create Account
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Join weavers and inspectors across the globe
                </p>
              </div>

              {regErr     && <Banner type="error"   message={regErr} />}
              {regSuccess && <Banner type="success" message={regSuccess} />}

              <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Full Name */}
                <FieldWrapper label="Full Name">
                  <div style={inputWrap(false)}>
                    <User size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type="text"
                      autoComplete="name"
                      placeholder="Ananthi Kumar"
                      value={regName}
                      onChange={e => { setRegErr(''); setRegName(e.target.value); }}
                    />
                  </div>
                </FieldWrapper>

                {/* Email */}
                <FieldWrapper label="Email Address">
                  <div style={inputWrap(false)}>
                    <Mail size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="yourname@domain.com"
                      value={regEmail}
                      onChange={e => { setRegErr(''); setRegEmail(e.target.value); }}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    {regEmail && isValidEmail(regEmail) &&
                      <CheckCircle size={17} color="var(--accent-green)" />
                    }
                  </div>
                </FieldWrapper>

                {/* Password */}
                <FieldWrapper label="Create Password">
                  <div style={inputWrap(pwdStrength === 'weak')}>
                    <Lock size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type={showRegPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      value={regPwd}
                      onChange={e => { setRegErr(''); setRegPwd(e.target.value); }}
                    />
                    <button type="button" onClick={() => setShowRegPwd(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      {showRegPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {regPwd.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[...Array(8)].map((_, i) => (
                          <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: '2px',
                            backgroundColor: i < regPwd.length
                              ? (regPwd.length < 8 ? '#ef4444' : 'var(--accent-green)')
                              : 'var(--border-subtle)',
                            transition: 'background-color 0.2s',
                          }} />
                        ))}
                      </div>
                      {pwdStrength === 'weak'
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}>
                            <AlertCircle size={13} /><span>At least 8 characters ({regPwd.length}/8)</span>
                          </div>
                        : <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: '600' }}>
                            <CheckCircle size={13} /><span>Strong password ({regPwd.length} characters)</span>
                          </div>
                      }
                    </div>
                  )}
                </FieldWrapper>

                {/* Confirm Password */}
                <FieldWrapper
                  label="Confirm Password"
                  error={regConfirm && regConfirm !== regPwd ? 'Passwords do not match' : ''}>
                  <div style={inputWrap(regConfirm && regConfirm !== regPwd)}>
                    <Lock size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={regConfirm}
                      onChange={e => { setRegErr(''); setRegConfirm(e.target.value); }}
                    />
                    {regConfirm && regConfirm === regPwd &&
                      <CheckCircle size={17} color="var(--accent-green)" />
                    }
                  </div>
                </FieldWrapper>

                <button
                  type="submit"
                  disabled={regLoading}
                  style={{ ...primaryBtn(regLoading), marginTop: '8px' }}
                >
                  {regLoading ? 'Sending verification code…' : 'Continue'}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Already have an account?{' '}
                  <span
                    onClick={() => goMode('login')}
                    style={{ fontWeight: '700', color: 'var(--accent-green)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Sign In
                  </span>
                </div>
              </form>
            </>
          )}

          {/* ================================================================
              MODE: REGISTER — Step 2: OTP verification
          ================================================================ */}
          {mode === 'register' && regStep === 'otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '68px', height: '68px', margin: '0 auto 16px',
                  borderRadius: '20px', backgroundColor: 'var(--icon-box-bg)',
                  border: '1px solid var(--icon-box-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail size={28} color="var(--accent-green)" />
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                  Verify Your Email
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Enter the 6-digit code sent to<br />
                  <strong style={{ color: 'var(--text-heading)' }}>{pendingRegUser?.email}</strong>
                </p>
              </div>

              {regErr     && <Banner type="error"   message={regErr} />}
              {regSuccess && <Banner type="success" message={regSuccess} />}

              <form onSubmit={handleRegVerifyOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <OtpBoxes value={regOtp} onChange={setRegOtp} disabled={regOtpLoading} />

                <button
                  type="submit"
                  disabled={regOtpLoading || regOtp.length !== 6}
                  style={primaryBtn(regOtpLoading || regOtp.length !== 6)}
                >
                  {regOtpLoading ? 'Verifying…' : 'Verify & Create Account'}
                </button>

                <ResendButton
                  onResend={handleRegResendOtp}
                  cooldown={regOtpCooldown}
                  setCooldown={setRegOtpCooldown}
                />
              </form>
            </>
          )}

          {/* ================================================================
              MODE: FORGOT PASSWORD — Step 1: enter email
          ================================================================ */}
          {mode === 'forgot' && forgotStep === 'email' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '68px', height: '68px', margin: '0 auto 16px',
                  borderRadius: '20px', backgroundColor: 'var(--icon-box-bg)',
                  border: '1px solid var(--icon-box-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lock size={28} color="var(--accent-green)" />
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                  Forgot Password?
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Enter your email to receive a verification code.
                </p>
              </div>

              {forgotErr     && <Banner type="error"   message={forgotErr} />}
              {forgotSuccess && <Banner type="success" message={forgotSuccess} />}

              <form onSubmit={handleForgotSendOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FieldWrapper label="Registered Email Address">
                  <div style={inputWrap(false)}>
                    <Mail size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="yourname@domain.com"
                      value={forgotEmail}
                      onChange={e => { setForgotErr(''); setForgotEmail(e.target.value); }}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                  </div>
                </FieldWrapper>
                <button type="submit" disabled={forgotOtpLoading} style={primaryBtn(forgotOtpLoading)}>
                  {forgotOtpLoading ? 'Sending code…' : 'Send Verification Code'}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <span onClick={() => goMode('login')}
                    style={{ fontSize: '0.84rem', color: 'var(--accent-green)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
                    Back to Sign In
                  </span>
                </div>
              </form>
            </>
          )}

          {/* ================================================================
              MODE: FORGOT PASSWORD — Step 2: verify OTP
          ================================================================ */}
          {mode === 'forgot' && forgotStep === 'otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '68px', height: '68px', margin: '0 auto 16px',
                  borderRadius: '20px', backgroundColor: 'var(--icon-box-bg)',
                  border: '1px solid var(--icon-box-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail size={28} color="var(--accent-green)" />
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                  Enter Verification Code
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Sent to <strong style={{ color: 'var(--text-heading)' }}>{forgotEmail}</strong>
                </p>
              </div>

              {forgotErr     && <Banner type="error"   message={forgotErr} />}
              {forgotSuccess && <Banner type="success" message={forgotSuccess} />}

              <form onSubmit={handleForgotVerifyOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <OtpBoxes value={forgotOtp} onChange={setForgotOtp} disabled={forgotOtpLoading} />

                <button
                  type="submit"
                  disabled={forgotOtpLoading || forgotOtp.length !== 6}
                  style={primaryBtn(forgotOtpLoading || forgotOtp.length !== 6)}
                >
                  {forgotOtpLoading ? 'Verifying…' : 'Verify Code'}
                </button>

                <ResendButton
                  onResend={handleForgotResendOtp}
                  cooldown={forgotOtpCooldown}
                  setCooldown={setForgotOtpCooldown}
                />
              </form>
            </>
          )}

          {/* ================================================================
              MODE: FORGOT PASSWORD — Step 3: set new password
          ================================================================ */}
          {mode === 'forgot' && forgotStep === 'reset' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '68px', height: '68px', margin: '0 auto 16px',
                  borderRadius: '20px', backgroundColor: 'var(--icon-box-bg)',
                  border: '1px solid var(--icon-box-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lock size={28} color="var(--accent-green)" />
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                  Set New Password
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Setting new password for {forgotEmail}
                </p>
              </div>

              {forgotErr     && <Banner type="error"   message={forgotErr} />}
              {forgotSuccess && <Banner type="success" message={forgotSuccess} />}

              <form onSubmit={handleResetPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <FieldWrapper label="New Password">
                  <div style={inputWrap(false)}>
                    <Lock size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type={showNewPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      value={newPwd}
                      onChange={e => { setForgotErr(''); setNewPwd(e.target.value); }}
                    />
                    <button type="button" onClick={() => setShowNewPwd(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </FieldWrapper>

                <FieldWrapper
                  label="Confirm New Password"
                  error={newPwdConfirm && newPwdConfirm !== newPwd ? 'Passwords do not match' : ''}>
                  <div style={inputWrap(newPwdConfirm && newPwdConfirm !== newPwd)}>
                    <Lock size={18} color="var(--accent-green)" />
                    <input
                      style={inputStyle}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter new password"
                      value={newPwdConfirm}
                      onChange={e => { setForgotErr(''); setNewPwdConfirm(e.target.value); }}
                    />
                    {newPwdConfirm && newPwdConfirm === newPwd &&
                      <CheckCircle size={17} color="var(--accent-green)" />
                    }
                  </div>
                </FieldWrapper>

                <button
                  type="submit"
                  disabled={forgotOtpLoading}
                  style={{ ...primaryBtn(forgotOtpLoading), marginTop: '8px' }}
                >
                  {forgotOtpLoading ? 'Saving…' : 'Save New Password'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default LoginPage;
