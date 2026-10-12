import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, User, ArrowLeft, RefreshCw
} from 'lucide-react';
import logoImg from '../assets/logo.jpg';
import {
  getProfileFromUser,
  resendSignupOtp,
  sendPasswordRecoveryOtp,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
  verifySignupOtp,
  verifyPasswordRecoveryOtp,
} from '../services/supabase.js';

// ─── Validation & User Store ────────────────────────────────────────────────
const REG_USERS_KEY = 'fabrisense_registered_users';

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(REG_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeUser(user) {
  try {
    const users = getStoredUsers();
    const updated = users.filter(u => u.email.toLowerCase() !== user.email.toLowerCase());
    updated.push(user);
    localStorage.setItem(REG_USERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save user locally', e);
  }
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
function isValidEmail(val) {
  return EMAIL_REGEX.test((val || '').trim());
}


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

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData)?.getData('text');
    if (!paste) return;
    const clean = paste.replace(/\D/g, '').slice(0, 6);
    if (clean) {
      onChange(clean);
      const targetIndex = Math.min(clean.length, 5);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onPaste={handlePaste}>
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
function ResendButton({ onResend, cooldown, setCooldown, loading }) {
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
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              color: loading ? 'var(--text-muted)' : 'var(--accent-green)',
              fontSize: '0.85rem', fontWeight: '700',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Resending code…' : 'Resend Code'}
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
export function LoginPage({ onLoginSuccess, onBack, theme = 'green' }) {
  const isBlue = theme === 'blue';
  const accentColor = isBlue ? '#3b82f6' : 'var(--accent-green)';
  const pillGradient = isBlue ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, var(--accent-green) 0%, #055a44 100%)';
  const pillShadow = isBlue ? '0 4px 14px rgba(37,99,235,0.4)' : '0 4px 14px rgba(8,131,101,0.4)';
  const customBtnStyle = (disabled) => ({
    ...primaryBtn(disabled),
    ...(isBlue ? { background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' } : {})
  });
  // 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd, setLoginPwd]     = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginErr, setLoginErr]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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
  const [regResendLoading, setRegResendLoading] = useState(false);
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
  const [forgotResendLoading, setForgotResendLoading] = useState(false);
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
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');

    const email = loginEmail.trim();
    const pwd   = loginPwd;

    if (!email) { setLoginErr('Please enter your email address.'); return; }
    if (!isValidEmail(email)) { setLoginErr('Please enter a valid email address.'); return; }
    if (!pwd) { setLoginErr('Please enter your password.'); return; }

    setLoginLoading(true);
    try {
      const lowerEmail = email.toLowerCase();
      const isAdminLogin = isBlue;

      // 1. Built-in system administrator verification
      if (lowerEmail === 'admin@fabrisense.com') {
        if (pwd === 'Admin@123') {
          const adminProfile = {
            name: 'Rajesh Kumar',
            email: email,
            role: 'Admin',
          };
          onLoginSuccess?.(adminProfile);
          return;
        } else {
          throw new Error('Incorrect password. Please verify and try again.');
        }
      }

      // 2. Try Supabase Authentication if configured
      let supabaseProfile = null;
      let isUnverifiedEmail = false;

      try {
        const { user } = await signInWithPassword(email, pwd);
        if (user) {
          if (user.confirmed_at === null && user.email_confirmed_at === null) {
            isUnverifiedEmail = true;
          } else {
            supabaseProfile = getProfileFromUser(user);
          }
        }
      } catch (sbErr) {
        const msg = (sbErr?.message || '').toLowerCase();
        if (
          msg.includes('email not confirmed') ||
          msg.includes('not confirmed') ||
          msg.includes('unconfirmed') ||
          msg.includes('not verified')
        ) {
          isUnverifiedEmail = true;
        } else {
          console.warn('Supabase sign-in response:', sbErr?.message);
        }
      }

      if (isUnverifiedEmail) {
        throw new Error('This account is not verified. Please verify your email before signing in.');
      }

      if (supabaseProfile) {
        if (isAdminLogin) {
          supabaseProfile.role = 'Admin';
        }
        onLoginSuccess?.(supabaseProfile);
        return;
      }

      // 3. Check registered users (from signed-up and verified accounts)
      const stored = getStoredUsers();
      const match = stored.find(u => u.email.toLowerCase() === lowerEmail);
      if (match) {
        if (match.verified === false) {
          throw new Error('This account has not been verified. Please complete verification before signing in.');
        }
        if (match.password !== pwd) {
          throw new Error('Incorrect password. Please verify and try again.');
        }
        const profile = {
          name: match.name,
          email: match.email,
          role: isAdminLogin ? 'Admin' : (match.role || 'User'),
        };
        onLoginSuccess?.(profile);
        return;
      }

      // 4. Built-in verified demo inspector account (strictly checks password)
      if (lowerEmail === 'inspector@weavesofindia.com') {
        if (pwd === 'User@123') {
          onLoginSuccess?.({
            name: 'Ananthi Kumar',
            email: lowerEmail,
            role: isAdminLogin ? 'Admin' : 'User',
          });
          return;
        } else {
          throw new Error('Incorrect password. Please verify and try again.');
        }
      }

      // 5. Account does not exist — strictly reject unverified / non-registered users
      throw new Error('No registered account found with this email. Only signed-up accounts can sign in. Please sign up first.');
    } catch (err) {
      setLoginErr(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── REGISTER — Step 1: create account and request verification ──────────
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

    // Check if account is already registered locally
    const stored = getStoredUsers();
    const existing = stored.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing && existing.verified !== false) {
      setRegErr('An account with this email already exists. Please sign in.');
      return;
    }

    setRegLoading(true);
    try {
      const userRole = isBlue ? 'Admin' : 'User';

      // Attempt Supabase sign up
      let supabaseSessionUser = null;

      try {
        const { user, session } = await signUpWithPassword(email, pwd, name);
        if (session && user) {
          // Immediately confirmed and logged in by Supabase session
          supabaseSessionUser = user;
        } else if (user && !session) {
          // Supabase signup requires OTP email verification
          setPendingRegUser({ name, email, pwd, role: userRole, supabaseMode: true });
          setRegOtpCooldown(60);
          setRegStep('otp');
          setRegOtp('');
          setRegSuccess(`Verification code sent to ${email}. Please enter the code to verify your account.`);
          return;
        }
      } catch (sbErr) {
        console.warn('Supabase sign-up note:', sbErr?.message);
        if (sbErr?.message?.toLowerCase().includes('already registered')) {
          throw new Error('An account with this email already exists. Please sign in.');
        }
      }

      if (supabaseSessionUser) {
        const profile = getProfileFromUser(supabaseSessionUser);
        if (isBlue) profile.role = 'Admin';
        storeUser({ name, email, password: pwd, role: userRole, verified: true });
        setRegSuccess('Account created and verified! Entering dashboard…');
        setTimeout(() => {
          onLoginSuccess?.(profile);
        }, 350);
        return;
      }

      // If Supabase requires offline verification or is rate limited:
      // Require entering 6-digit OTP code before the account is activated
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      setPendingRegUser({
        name,
        email,
        pwd,
        role: userRole,
        localOtp: verificationCode,
        supabaseMode: false,
      });
      setRegOtpCooldown(60);
      setRegStep('otp');
      setRegOtp('');
      setRegErr('');
      setRegSuccess(`Verification code sent to ${email}. (Verification code: ${verificationCode})`);
    } catch (err) {
      setRegErr(err.message || 'Failed to create account. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // ── REGISTER — Step 2: verify OTP ────────────────────────────────────────
  const handleRegVerifyOtp = async (e) => {
    e.preventDefault();
    setRegErr('');

    if (!regOtp || regOtp.length !== 6) {
      setRegErr('Please enter the complete 6-digit verification code.');
      return;
    }

    setRegOtpLoading(true);
    try {
      let isVerified = false;
      let profile = null;

      if (pendingRegUser?.supabaseMode) {
        try {
          const { user } = await verifySignupOtp(pendingRegUser?.email, regOtp);
          if (user) {
            isVerified = true;
            profile = getProfileFromUser(user);
            if (isBlue) profile.role = 'Admin';
          }
        } catch (err) {
          console.warn('Supabase OTP verification notice:', err.message);
          // Check if matches local OTP backup if any
          if (pendingRegUser?.localOtp && regOtp === pendingRegUser.localOtp) {
            isVerified = true;
          } else {
            throw new Error(err.message || 'Invalid verification code. Please check and try again.');
          }
        }
      } else {
        if (pendingRegUser?.localOtp && regOtp === pendingRegUser.localOtp) {
          isVerified = true;
        } else {
          throw new Error('Invalid verification code. Please check and try again.');
        }
      }

      if (!isVerified) {
        throw new Error('Verification failed. Invalid code entered.');
      }

      // Store the verified account now that verification succeeded
      storeUser({
        name: pendingRegUser.name,
        email: pendingRegUser.email,
        password: pendingRegUser.pwd,
        role: pendingRegUser.role,
        verified: true,
      });

      if (!profile) {
        profile = {
          name: pendingRegUser.name,
          email: pendingRegUser.email,
          role: pendingRegUser.role,
        };
      }

      setRegSuccess('Account verified successfully! Entering dashboard…');
      setTimeout(() => {
        onLoginSuccess?.(profile);
      }, 400);
    } catch (err) {
      setRegErr(err.message || 'Verification failed. Please try again.');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleRegResendOtp = async () => {
    if (regResendLoading || regOtpCooldown > 0) return;
    setRegErr('');
    setRegSuccess('');
    setRegResendLoading(true);
    try {
      if (pendingRegUser?.supabaseMode) {
        try {
          await resendSignupOtp(pendingRegUser?.email);
          setRegOtpCooldown(60);
          setRegOtp('');
          setRegSuccess('A new verification code has been sent to your email.');
          return;
        } catch (err) {
          console.warn('Supabase resend note:', err.message);
        }
      }
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setPendingRegUser(prev => ({ ...prev, localOtp: newCode }));
      setRegOtpCooldown(60);
      setRegOtp('');
      setRegSuccess(`A new verification code has been sent to ${pendingRegUser?.email}. (Verification code: ${newCode})`);
    } catch (err) {
      if (err.cooldownRemaining) {
        setRegOtpCooldown(err.cooldownRemaining);
      }
      setRegErr(err.message || 'Could not resend code. Please wait and try again.');
    } finally {
      setRegResendLoading(false);
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
      const result = await sendPasswordRecoveryOtp(email);
      setForgotOtpCooldown(result.cooldown || 60);
      setForgotOtp('');
      setForgotStep('otp');
      // Do not reveal whether arbitrary email belongs to an existing account
      setForgotSuccess(`If an account is associated with ${email}, a verification code has been sent.`);
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
      await verifyPasswordRecoveryOtp(forgotEmail.trim(), forgotOtp);
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
    if (forgotResendLoading || forgotOtpCooldown > 0) return;
    setForgotErr('');
    setForgotSuccess('');
    setForgotResendLoading(true);
    try {
      const result = await sendPasswordRecoveryOtp(forgotEmail.trim());
      setForgotOtpCooldown(result.cooldown || 60);
      setForgotOtp('');
      setForgotSuccess(result.message || 'A new verification code has been sent to your email.');
    } catch (err) {
      if (err.cooldownRemaining) {
        setForgotOtpCooldown(err.cooldownRemaining);
      }
      setForgotErr(err.message || 'Could not resend code. Please wait and try again.');
    } finally {
      setForgotResendLoading(false);
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
      await updatePassword(newPwd);
      await signOut();

      // Keep local registered user's password in sync
      const stored = getStoredUsers();
      const existing = stored.find(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
      if (existing) {
        storeUser({ ...existing, password: newPwd, verified: true });
      }

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
  const heroColor = isBlue ? '#2563eb' : '#06b678';
  const heroBg = isBlue
    ? 'linear-gradient(160deg, #050d1f 0%, #0c1a3a 50%, #081428 100%)'
    : 'linear-gradient(160deg, #030e0a 0%, #071a12 50%, #060f0b 100%)';
  const heroGlow = isBlue
    ? 'radial-gradient(circle at 30% 20%, rgba(37,99,235,0.18) 0%, transparent 55%)'
    : 'radial-gradient(circle at 30% 20%, rgba(6,182,120,0.18) 0%, transparent 55%)';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: heroBg,
      color: 'var(--text-main)',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: heroGlow }} />

      {/* ── Hero Header ── */}
      <div style={{
        padding: '20px 20px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '14px', zIndex: 1, flexShrink: 0,
      }}>
        {/* Back button row */}
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '7px 12px',
              color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontWeight: '600',
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        </div>

        {/* Brand hero */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          padding: '10px 20px 20px',
        }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 8px 28px rgba(0,0,0,0.5), 0 0 40px ${heroColor}30`,
          }}>
            <img src={logoImg} alt="FabriSense" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.35rem', fontWeight: '800', color: '#ffffff',
              letterSpacing: '-0.025em', lineHeight: 1.1,
            }}>FabriSense</div>
            <div style={{
              fontSize: '0.62rem', fontWeight: '600',
              color: heroColor, letterSpacing: '0.14em',
              textTransform: 'uppercase', marginTop: '4px', opacity: 0.85,
            }}>
              {isBlue ? 'Admin Access Portal' : 'Inspector Login'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form card ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '0 18px 28px', zIndex: 1,
      }}>
        <div style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '22px',
          padding: '22px 18px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* ── Top Slide Segmented Bar (Sign In / Sign Up) ── */}
          {(mode === 'login' || (mode === 'register' && regStep === null)) && (
            <div style={{
              position: 'relative',
              display: 'flex',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '24px',
              padding: '4px',
              marginBottom: '20px',
              width: '100%',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}>
              {/* Animated Sliding Active Indicator Pill */}
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  bottom: '4px',
                  left: mode === 'login' ? '4px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 6px)',
                  borderRadius: '20px',
                  background: pillGradient,
                  boxShadow: pillShadow,
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />

              {/* Sign In Tab Button */}
              <button
                type="button"
                onClick={() => goMode('login')}
                style={{
                  flex: 1,
                  position: 'relative',
                  zIndex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: 'transparent',
                  color: mode === 'login' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                }}
              >
                Sign In
              </button>

              {/* Sign Up Tab Button */}
              <button
                type="button"
                onClick={() => goMode('register')}
                style={{
                  flex: 1,
                  position: 'relative',
                  zIndex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: 'transparent',
                  color: mode === 'register' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* ================================================================
              MODE: LOGIN (SIGN IN)
          ================================================================ */}
          {mode === 'login' && (
            <>
              {loginErr && <Banner type="error" message={loginErr} />}

              <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Email */}
                <FieldWrapper label="Email Address">
                  <div style={inputWrap(false)}>
                    <Mail size={18} color={accentColor} />
                    <input
                      style={inputStyle}
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      placeholder={isBlue ? "admin@fabrisense.com" : "inspector@weavesofindia.com"}
                      value={loginEmail}
                      onChange={e => { setLoginErr(''); setLoginEmail(e.target.value); }}
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    {loginEmail && isValidEmail(loginEmail) && (
                      <CheckCircle size={17} color={accentColor} />
                    )}
                  </div>
                </FieldWrapper>

                {/* Password */}
                <FieldWrapper label="Password">
                  <div style={inputWrap(false)}>
                    <Lock size={18} color={accentColor} />
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

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{ ...customBtnStyle(loginLoading), marginTop: '6px' }}
                >
                  {loginLoading ? 'Signing in…' : 'Sign In'}
                </button>


              </form>
            </>
          )}

          {/* ================================================================
              MODE: REGISTER (SIGN UP) — Step 1: collect details
          ================================================================ */}
          {mode === 'register' && regStep === null && (
            <>
              {regErr     && <Banner type="error"   message={regErr} />}
              {regSuccess && <Banner type="success" message={regSuccess} />}

              <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Full Name */}
                <FieldWrapper label="Full Name">
                  <div style={inputWrap(false)}>
                    <User size={18} color={accentColor} />
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
                    <Mail size={18} color={accentColor} />
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
                      <CheckCircle size={17} color={accentColor} />
                    }
                  </div>
                </FieldWrapper>

                {/* Password */}
                <FieldWrapper label="Create Password">
                  <div style={inputWrap(pwdStrength === 'weak')}>
                    <Lock size={18} color={accentColor} />
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
                    </div>
                  )}
                </FieldWrapper>

                {/* Confirm Password */}
                <FieldWrapper
                  label="Confirm Password"
                  error={regConfirm && regConfirm !== regPwd ? 'Passwords do not match' : ''}>
                  <div style={inputWrap(regConfirm && regConfirm !== regPwd)}>
                    <Lock size={18} color={accentColor} />
                    <input
                      style={inputStyle}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={regConfirm}
                      onChange={e => { setRegErr(''); setRegConfirm(e.target.value); }}
                    />
                    {regConfirm && regConfirm === regPwd &&
                      <CheckCircle size={17} color={accentColor} />
                    }
                  </div>
                </FieldWrapper>

                <button
                  type="submit"
                  disabled={regLoading}
                  style={{ ...customBtnStyle(regLoading), marginTop: '6px' }}
                >
                  {regLoading ? 'Sending verification code…' : 'Create Account'}
                </button>
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
                  <Mail size={28} color={accentColor} />
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

                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const profile = {
                        name: pendingRegUser?.name || 'User',
                        email: pendingRegUser?.email || '',
                        role: isBlue ? 'Admin' : 'User',
                      };
                      onLoginSuccess?.(profile);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: accentColor,
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    }}
                  >
                    Skip verification & enter dashboard →
                  </button>
                </div>

                <ResendButton
                  onResend={handleRegResendOtp}
                  cooldown={regOtpCooldown}
                  setCooldown={setRegOtpCooldown}
                  loading={regResendLoading}
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
                  <Lock size={28} color={accentColor} />
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
                    <Mail size={18} color={accentColor} />
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
                  <Mail size={28} color={accentColor} />
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
                  loading={forgotResendLoading}
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
                  <Lock size={28} color={accentColor} />
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
                    <Lock size={18} color={accentColor} />
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
                    <Lock size={18} color={accentColor} />
                    <input
                      style={inputStyle}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter new password"
                      value={newPwdConfirm}
                      onChange={e => { setForgotErr(''); setNewPwdConfirm(e.target.value); }}
                    />
                    {newPwdConfirm && newPwdConfirm === newPwd &&
                      <CheckCircle size={17} color={accentColor} />
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
    </div>
  );
}

export default LoginPage;
