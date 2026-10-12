import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, User, ArrowLeft, RefreshCw
} from 'lucide-react';
import logoImg from '../assets/logo.jpg';
import {
  getProfileFromUser,
  resendSignupOtp,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  verifySignupOtp,
  sendPasswordRecoveryOtp,
  verifyPasswordRecoveryOtp,
  updatePassword,
} from '../services/supabase.js';
import {
  sendForgotPasswordOtp,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword as backendResetPassword,
} from '../services/api.js';

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
  // Token issued by backend after OTP verification
  const [forgotVerifiedToken, setForgotVerifiedToken] = useState('');

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
    setForgotVerifiedToken('');
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

    setRegLoading(true);
    try {
      const userRole = isBlue ? 'Admin' : 'User';

      // Call Supabase Auth signUp
      const signUpResult = await signUpWithPassword(email, pwd, name);
      const user = signUpResult?.user;
      const session = signUpResult?.session;

      // Check if user already exists (Supabase returns empty identities array when user already registered and email confirmation is on)
      if (user && Array.isArray(user.identities) && user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please sign in or check your email to verify.');
      }

      // Case 1: Session returned immediately (email confirmation disabled in Supabase)
      if (session && user) {
        const profile = getProfileFromUser(user);
        if (isBlue) profile.role = 'Admin';
        storeUser({ name, email, password: pwd, role: userRole, verified: true });
        setRegSuccess('Account created and verified! Entering dashboard…');
        setTimeout(() => {
          onLoginSuccess?.(profile);
        }, 350);
        return;
      }

      // Case 2: User created, awaiting email OTP confirmation
      if (user) {
        setPendingRegUser({ name, email, pwd, role: userRole, supabaseMode: true });
        setRegOtpCooldown(60);
        setRegStep('otp');
        setRegOtp('');
        setRegSuccess(`A 6-digit verification code has been sent to ${email}. Please enter it below to activate your account.`);
        return;
      }

      throw new Error('Registration could not be completed. Please try again.');
    } catch (err) {
      console.error('[FabriSense Auth] Registration error:', err?.message || err);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('already registered')) {
        setRegErr('An account with this email already exists. Please sign in.');
      } else if (msg.toLowerCase().includes('rate limit')) {
        setRegErr('Email rate limit exceeded. Please wait a few minutes before trying again.');
      } else {
        setRegErr(msg || 'Failed to create account. Please try again.');
      }
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
      const email = pendingRegUser?.email;
      if (!email) {
        throw new Error('Registration session expired. Please sign up again.');
      }

      const result = await verifySignupOtp(email, regOtp);
      const user = result?.user;

      if (!user) {
        throw new Error('Verification failed. Invalid or expired verification code.');
      }

      const profile = getProfileFromUser(user);
      if (isBlue) profile.role = 'Admin';

      // Save user to local cache for offline convenience
      storeUser({
        name: pendingRegUser.name,
        email: pendingRegUser.email,
        password: pendingRegUser.pwd,
        role: pendingRegUser.role,
        verified: true,
      });

      setRegSuccess('Account verified successfully! Entering dashboard…');
      setTimeout(() => {
        onLoginSuccess?.(profile);
      }, 400);
    } catch (err) {
      console.error('[FabriSense Auth] Registration OTP verification failed:', err?.message || err);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setRegErr('Invalid or expired verification code. Please check your email or request a new code.');
      } else {
        setRegErr(msg || 'Verification failed. Please try again.');
      }
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleRegResendOtp = async () => {
    setRegErr('');
    setRegSuccess('');
    try {
      const email = pendingRegUser?.email;
      if (!email) {
        setRegErr('Session expired. Please restart registration.');
        return;
      }

      await resendSignupOtp(email);
      setRegOtpCooldown(60);
      setRegOtp('');
      setRegSuccess(`A new verification code has been sent to ${email}.`);
    } catch (err) {
      console.error('[FabriSense Auth] Resend OTP error:', err?.message || err);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setRegErr('Resend rate limit reached. Please wait before trying again.');
      } else {
        setRegErr(msg || 'Could not resend verification code. Please wait and try again.');
      }
    }
  };

  // ── FORGOT PASSWORD — Step 1: request 6-digit OTP ─────────────────────────
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setForgotErr('');
    const email = forgotEmail.trim();
    if (!email)               { setForgotErr('Please enter your email address.'); return; }
    if (!isValidEmail(email)) { setForgotErr('Please enter a valid email address.'); return; }

    setForgotOtpLoading(true);
    try {
      let sentSuccess = false;
      let cooldown = 60;

      // 1. Try backend OTP service
      try {
        const result = await sendForgotPasswordOtp(email);
        cooldown = result?.cooldown || 60;
        sentSuccess = true;
      } catch (backendErr) {
        console.warn('[FabriSense Auth] Backend OTP service:', backendErr?.message);
        // 2. Fallback to Supabase password recovery OTP if backend unconfigured
        try {
          const sbResult = await sendPasswordRecoveryOtp(email);
          cooldown = sbResult?.cooldown || 60;
          sentSuccess = true;
        } catch (sbErr) {
          const stored = getStoredUsers();
          const exists = stored.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (!exists && email.toLowerCase() !== 'inspector@weavesofindia.com' && email.toLowerCase() !== 'admin@fabrisense.com') {
            throw new Error('No registered account found with this email. Please check the address or sign up.');
          }
          throw new Error(backendErr?.message || sbErr?.message || 'Failed to send 6-digit code. Please try again.');
        }
      }

      if (sentSuccess) {
        setForgotOtpCooldown(cooldown);
        setForgotOtp('');
        setForgotVerifiedToken('');
        setForgotStep('otp');
        setForgotSuccess(`A 6-digit password reset code has been sent to ${email}. Please check your inbox.`);
      }
    } catch (err) {
      setForgotErr(err.message || 'Failed to send 6-digit code. Please try again.');
    } finally {
      setForgotOtpLoading(false);
    }
  };

  // ── FORGOT PASSWORD — Step 2: verify 6-digit OTP ───────────────────────────
  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotErr('');
    if (forgotOtp.length !== 6) { setForgotErr('Please enter the complete 6-digit code.'); return; }

    setForgotOtpLoading(true);
    try {
      let verified = false;

      // 1. Try backend verification
      try {
        const result = await verifyForgotPasswordOtp(forgotEmail.trim(), forgotOtp);
        setForgotVerifiedToken(result.verifiedToken || '');
        verified = true;
      } catch (backendErr) {
        // 2. Try Supabase verification
        try {
          await verifyPasswordRecoveryOtp(forgotEmail.trim(), forgotOtp);
          verified = true;
        } catch (sbErr) {
          throw new Error(backendErr?.message || sbErr?.message || 'Invalid or expired 6-digit code. Please check and try again.');
        }
      }

      if (verified) {
        setForgotStep('reset');
        setForgotSuccess('');
        setForgotOtp('');
      }
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
      const email = forgotEmail.trim();
      let resendDone = false;
      let cooldown = 60;

      try {
        const result = await resendForgotPasswordOtp(email);
        cooldown = result?.cooldown || 60;
        resendDone = true;
      } catch {
        try {
          const sbResult = await sendPasswordRecoveryOtp(email);
          cooldown = sbResult?.cooldown || 60;
          resendDone = true;
        } catch (sbErr) {
          throw sbErr;
        }
      }

      if (resendDone) {
        setForgotOtpCooldown(cooldown);
        setForgotOtp('');
        setForgotSuccess('A new 6-digit verification code has been sent to your email.');
      }
    } catch (err) {
      setForgotErr(err.message || 'Could not resend code. Please wait and try again.');
    }
  };

  // ── FORGOT PASSWORD — Step 3: set new password ─────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotErr('');
    if (newPwd.length < 8)        { setForgotErr('Password must be at least 8 characters.'); return; }
    if (newPwd !== newPwdConfirm) { setForgotErr('Passwords do not match.'); return; }

    setForgotOtpLoading(true);
    try {
      let resetDone = false;

      // 1. Backend token-based reset
      if (forgotVerifiedToken) {
        try {
          await backendResetPassword(forgotEmail.trim(), forgotVerifiedToken, newPwd);
          resetDone = true;
        } catch (bErr) {
          console.warn('[FabriSense Auth] Backend reset error:', bErr.message);
        }
      }

      // 2. Supabase password update
      try {
        await updatePassword(newPwd);
        resetDone = true;
      } catch {
        // Ignored if session is not Supabase
      }

      // 3. Keep local registered user's password in sync
      const stored = getStoredUsers();
      const existing = stored.find(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
      if (existing) {
        storeUser({ ...existing, password: newPwd, verified: true });
        resetDone = true;
      }

      setForgotVerifiedToken('');
      setForgotSuccess('Password reset successfully! You can now sign in with your new password.');
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
                  <Lock size={28} color={accentColor} />
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                  Forgot Password?
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Enter your registered email address to receive a 6-digit code for password reset.
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
                  {forgotOtpLoading ? 'Sending 6-digit code…' : 'Send 6-Digit Code for Password Reset'}
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
                  Enter 6-Digit Code
                </h1>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: 0 }}>
                  Enter the 6-digit password reset code sent to<br />
                  <strong style={{ color: 'var(--text-heading)' }}>{forgotEmail}</strong>
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
                  {forgotOtpLoading ? 'Verifying 6-digit code…' : 'Verify 6-Digit Code'}
                </button>

                <ResendButton
                  onResend={handleForgotResendOtp}
                  cooldown={forgotOtpCooldown}
                  setCooldown={setForgotOtpCooldown}
                />

                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <span onClick={() => { setForgotErr(''); setForgotStep('email'); }}
                    style={{ fontSize: '0.84rem', color: 'var(--accent-green)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
                    ← Change Email Address
                  </span>
                </div>
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
