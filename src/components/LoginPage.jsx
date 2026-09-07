import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, Phone, User, ArrowLeft, RefreshCw
} from 'lucide-react';

// ─── Validation Helpers ────────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
// Valid phone: 10-digit Indian mobile (starts with 6–9) or international (+ prefix, 7–15 digits)
const PHONE_REGEX = /^(\+?[1-9]\d{6,14}|[6-9]\d{9})$/;

function isValidEmail(val) {
  return EMAIL_REGEX.test(val.trim());
}

function isValidPhone(val) {
  return PHONE_REGEX.test(val.trim().replace(/\s/g, ''));
}

function detectType(val) {
  const v = val.trim();
  if (!v) return null;
  if (/^[+\d]/.test(v)) {
    // looks like phone
    if (!isValidPhone(v)) return 'phone_invalid';
    return 'phone';
  }
  if (!isValidEmail(v)) return 'email_invalid';
  return 'email';
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Seed users ────────────────────────────────────────────────────────────
const INITIAL_REGISTERED_USERS = [
  { name: 'Ananthi Kumar',  emailOrPhone: 'inspector@weavesofindia.com',   password: 'password123' },
  { name: 'Handloom Weaver', emailOrPhone: 'ananthi.weaver@handloom.org',  password: 'password123' },
];

// ─── Sub-components ────────────────────────────────────────────────────────


function Banner({ type, message }) {
  const isError = type === 'error';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      backgroundColor: isError ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${isError ? '#fca5a5' : '#86efac'}`,
      borderRadius: '12px', padding: '10px 14px',
      fontSize: '0.82rem', color: isError ? '#b91c1c' : '#15803d',
      marginBottom: '14px', lineHeight: 1.4,
    }}>
      {isError ? <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} /> : <CheckCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />}
      <span>{message}</span>
    </div>
  );
}

function FieldWrapper({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#2d3748' }}>{label}</label>
      {children}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', fontWeight: '600' }}>
          <AlertCircle size={13} /><span>{error}</span>
        </div>
      )}
    </div>
  );
}

const inputStyle = (hasError) => ({
  width: '100%', padding: '13px 14px', backgroundColor: '#ffffff',
  border: `1.5px solid ${hasError ? '#ef4444' : '#cbd5e1'}`,
  borderRadius: '12px', outline: 'none', color: '#162032',
  fontSize: '0.92rem', fontWeight: '500', boxSizing: 'border-box',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
});

const iconInputWrapper = (hasError) => ({
  display: 'flex', alignItems: 'center', backgroundColor: '#ffffff',
  border: `1.5px solid ${hasError ? '#ef4444' : '#cbd5e1'}`,
  borderRadius: '12px', padding: '0 14px',
});

const innerInput = {
  width: '100%', padding: '13px 10px', background: 'transparent',
  border: 'none', outline: 'none', color: '#162032', fontSize: '0.92rem', fontWeight: '500',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

const primaryBtn = (color = '#138865') => ({
  width: '100%', padding: '15px', backgroundColor: color, border: 'none',
  borderRadius: '14px', color: '#ffffff', fontWeight: '700', fontSize: '0.98rem',
  cursor: 'pointer', boxShadow: `0 4px 14px ${color}44`, transition: 'opacity 0.2s ease',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
});

const outlineBtn = {
  width: '100%', padding: '14px', backgroundColor: '#ffffff',
  border: '1.5px solid #162032', borderRadius: '14px', color: '#162032',
  fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

// ─── Main Component ────────────────────────────────────────────────────────
export function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'otp'

  // Registered users (localStorage-persisted)
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const s = localStorage.getItem('fabrisense_users');
      return s ? JSON.parse(s) : INITIAL_REGISTERED_USERS;
    } catch { return INITIAL_REGISTERED_USERS; }
  });

  useEffect(() => {
    try { localStorage.setItem('fabrisense_users', JSON.stringify(registeredUsers)); }
    catch (e) { console.error(e); }
  }, [registeredUsers]);

  // ── Login state ──
  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginErr, setLoginErr] = useState('');

  // ── Register state ──
  const [regName, setRegName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regContactErr, setRegContactErr] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regErr, setRegErr] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // ── OTP state ──
  const [pendingUser, setPendingUser] = useState(null); // {name, emailOrPhone, password}
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);
  const [otpErr, setOtpErr] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);
  const cooldownRef = useRef(null);

  // Cleanup cooldown timer on unmount
  useEffect(() => () => clearInterval(cooldownRef.current), []);

  // ── Contact field validation ──
  const handleContactChange = (val) => {
    setRegContact(val);
    if (!val) { setRegContactErr(''); return; }
    const t = detectType(val);
    if (t === 'email_invalid') setRegContactErr('Invalid email format (e.g. name@domain.com)');
    else if (t === 'phone_invalid') setRegContactErr('Invalid phone number (10-digit Indian or international with + prefix)');
    else setRegContactErr('');
  };

  // ── Switch helper ──
  const switchMode = (m) => {
    setMode(m);
    setLoginErr(''); setRegErr(''); setRegSuccess(''); setOtpErr(''); setOtpSuccess('');
    setOtpInputs(['', '', '', '', '', '']);
  };

  // ── Login handler ──
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginErr('');
    const clean = loginId.trim().toLowerCase();
    const user = registeredUsers.find(u => u.emailOrPhone.trim().toLowerCase() === clean);
    if (!user) {
      setLoginErr('No account found with this email or phone number. Please create an account first.');
      return;
    }
    if (user.password !== loginPwd) {
      setLoginErr('Incorrect password. Please try again.');
      return;
    }
    onLoginSuccess && onLoginSuccess({ name: user.name, email: user.emailOrPhone });
  };

  // ── Register: send OTP ──
  const handleSendOTP = (e) => {
    e.preventDefault();
    setRegErr('');

    // Validate full name
    if (!regName.trim()) { setRegErr('Please enter your full name.'); return; }

    // Validate contact
    const t = detectType(regContact);
    if (!regContact.trim()) { setRegErr('Please enter your email or mobile number.'); return; }
    if (t === 'email_invalid') { setRegErr('Please enter a valid email address (e.g. name@domain.com).'); return; }
    if (t === 'phone_invalid') { setRegErr('Please enter a valid phone number. Use 10-digit Indian number or international format with + prefix.'); return; }

    // Password length
    if (regPwd.length < 8) { setRegErr('Password must be at least 8 characters long.'); return; }

    // Confirm match
    if (regPwd !== regConfirm) { setRegErr('Passwords do not match. Please re-enter.'); return; }

    // Check duplicate
    const dup = registeredUsers.find(u => u.emailOrPhone.trim().toLowerCase() === regContact.trim().toLowerCase());
    if (dup) { setRegErr('An account with this email/phone already exists. Please sign in.'); return; }

    // Generate & "send" OTP
    const otp = generateOTP();
    setGeneratedOTP(otp);
    setPendingUser({ name: regName.trim(), emailOrPhone: regContact.trim(), password: regPwd });
    setOtpInputs(['', '', '', '', '', '']);
    setOtpErr('');
    setOtpSuccess('');
    startCooldown();
    switchMode('otp');
  };

  // ── OTP input helpers ──
  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpInputs];
    next[idx] = val;
    setOtpInputs(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpInputs[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const startCooldown = () => {
    setResendCooldown(30);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOTP = () => {
    if (resendCooldown > 0) return;
    const otp = generateOTP();
    setGeneratedOTP(otp);
    setOtpInputs(['', '', '', '', '', '']);
    setOtpErr('');
    setOtpSuccess('');
    startCooldown();
    otpRefs.current[0]?.focus();
  };

  // ── Verify OTP & complete registration ──
  const handleVerifyOTP = (e) => {
    e.preventDefault();
    const entered = otpInputs.join('');
    if (entered.length < 6) { setOtpErr('Please enter all 6 digits of the OTP.'); return; }
    if (entered !== generatedOTP) {
      setOtpErr('Incorrect OTP. Please check and try again.');
      setOtpInputs(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      return;
    }

    // Register user
    setRegisteredUsers(prev => [...prev, pendingUser]);
    setOtpSuccess('Verification successful! Account created. Redirecting to sign in…');
    setTimeout(() => {
      setLoginId(pendingUser.emailOrPhone);
      setLoginPwd('');
      setPendingUser(null);
      setGeneratedOTP('');
      switchMode('login');
    }, 1400);
  };

  const pwdStrength = regPwd.length === 0 ? null : regPwd.length < 8 ? 'weak' : 'ok';

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%', maxWidth: '400px', margin: '0 auto',
      backgroundColor: '#ffffff',
      color: '#162032',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ padding: '22px 26px 26px' }}>

        {/* ============================================================
            MODE: LOGIN
        ============================================================ */}
        {mode === 'login' && (
          <>
            {/* Icon + heading */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '62px', height: '62px', margin: '0 auto 14px',
                borderRadius: '20px', backgroundColor: '#138865',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(19,136,101,0.25)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 13h6M9 17h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0 0 5px', letterSpacing: '-0.02em' }}>Welcome back</h1>
              <p style={{ fontSize: '0.87rem', color: '#718096', margin: 0 }}>Sign in to inspect your fabric</p>
            </div>

            {loginErr && <Banner type="error" message={loginErr} />}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <FieldWrapper label="Email or Phone Number">
                <div style={iconInputWrapper(false)}>
                  <Mail size={18} color="#94a3b8" />
                  <input
                    style={innerInput} type="text"
                    placeholder="inspector@weavesofindia.com"
                    value={loginId} onChange={e => { setLoginErr(''); setLoginId(e.target.value); }}
                    required
                  />
                </div>
              </FieldWrapper>

              <FieldWrapper label="Password">
                <div style={iconInputWrapper(false)}>
                  <Lock size={18} color="#94a3b8" />
                  <input
                    style={innerInput} type={showLoginPwd ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={loginPwd} onChange={e => { setLoginErr(''); setLoginPwd(e.target.value); }}
                    required
                  />
                  <button type="button" onClick={() => setShowLoginPwd(p => !p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                    {showLoginPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span onClick={() => alert('A password reset link will be sent to your registered contact.')}
                    style={{ fontSize: '0.82rem', fontWeight: '700', color: '#138865', cursor: 'pointer' }}>
                    Forgot Password?
                  </span>
                </div>
              </FieldWrapper>

              <button type="submit" style={{ ...primaryBtn(), marginTop: '6px' }}>Sign In</button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                <span style={{ padding: '0 12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
              </div>

              <button type="button" style={outlineBtn} onClick={() => switchMode('register')}>
                Create Account
              </button>
            </form>
          </>
        )}

        {/* ============================================================
            MODE: REGISTER
        ============================================================ */}
        {mode === 'register' && (
          <>
            <div style={{ marginBottom: '18px' }}>
              <h1 style={{ fontSize: '1.9rem', fontWeight: '800', margin: '0 0 5px', letterSpacing: '-0.02em' }}>Create Account</h1>
              <p style={{ fontSize: '0.87rem', color: '#718096', margin: 0 }}>Join weavers and inspectors across the globe</p>
            </div>

            {regErr && <Banner type="error" message={regErr} />}

            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              {/* Full Name */}
              <FieldWrapper label="Full Name">
                <div style={iconInputWrapper(false)}>
                  <User size={18} color="#94a3b8" />
                  <input style={innerInput} type="text" placeholder="Ananthi Kumar"
                    value={regName} onChange={e => setRegName(e.target.value)} required />
                </div>
              </FieldWrapper>

              {/* Email or Mobile Number with real-time validation */}
              <FieldWrapper label="Email or Mobile Number" error={regContactErr}>
                <div style={iconInputWrapper(!!regContactErr)}>
                  {/^[+\d]/.test(regContact) ? <Phone size={18} color={regContactErr ? '#ef4444' : '#94a3b8'} /> : <Mail size={18} color={regContactErr ? '#ef4444' : '#94a3b8'} />}
                  <input
                    style={innerInput} type="text"
                    placeholder="email@domain.com or 9876543210"
                    value={regContact}
                    onChange={e => handleContactChange(e.target.value)}
                    required
                  />
                  {regContact && !regContactErr && (
                    <CheckCircle size={17} color="#16a34a" />
                  )}
                  {regContactErr && <AlertCircle size={17} color="#ef4444" />}
                </div>
                {/* Helper hint */}
                {!regContact && (
                  <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                    Enter a valid email (name@domain.com) or 10-digit mobile number
                  </span>
                )}
              </FieldWrapper>

              {/* Create Password */}
              <FieldWrapper label="Create Password">
                <div style={iconInputWrapper(pwdStrength === 'weak')}>
                  <Lock size={18} color="#94a3b8" />
                  <input
                    style={innerInput} type={showRegPwd ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={regPwd} onChange={e => setRegPwd(e.target.value)} required
                  />
                  <button type="button" onClick={() => setShowRegPwd(p => !p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                    {showRegPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength bar */}
                {regPwd.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[...Array(8)].map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: '4px', borderRadius: '2px',
                          backgroundColor: i < regPwd.length ? (regPwd.length < 8 ? '#ef4444' : '#16a34a') : '#e2e8f0',
                          transition: 'background-color 0.2s',
                        }} />
                      ))}
                    </div>
                    {pwdStrength === 'weak' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', fontWeight: '600' }}>
                        <AlertCircle size={13} />
                        <span>Password must contain at least 8 characters ({regPwd.length}/8)</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.75rem', fontWeight: '600' }}>
                        <CheckCircle size={13} />
                        <span>Strong enough ({regPwd.length} characters)</span>
                      </div>
                    )}
                  </div>
                )}
              </FieldWrapper>

              {/* Confirm Password */}
              <FieldWrapper label="Confirm Password"
                error={regConfirm && regConfirm !== regPwd ? 'Passwords do not match' : ''}>
                <div style={iconInputWrapper(regConfirm && regConfirm !== regPwd)}>
                  <Lock size={18} color="#94a3b8" />
                  <input
                    style={innerInput} type="password" placeholder="Re-enter your password"
                    value={regConfirm} onChange={e => setRegConfirm(e.target.value)} required
                  />
                  {regConfirm && regConfirm === regPwd && <CheckCircle size={17} color="#16a34a" />}
                </div>
              </FieldWrapper>

              <button type="submit" style={{ ...primaryBtn(), marginTop: '8px' }}>
                Send OTP to Verify
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.84rem', color: '#64748b', marginTop: '4px' }}>
                Already have an account?{' '}
                <span onClick={() => switchMode('login')}
                  style={{ fontWeight: '700', color: '#138865', cursor: 'pointer' }}>
                  Login
                </span>
              </div>
            </form>
          </>
        )}

        {/* ============================================================
            MODE: OTP VERIFICATION
        ============================================================ */}
        {mode === 'otp' && (
          <>
            {/* Back button */}
            <button onClick={() => switchMode('register')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#138865', fontWeight: '700', fontSize: '0.88rem', padding: 0, marginBottom: '18px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              <ArrowLeft size={18} /> Back
            </button>

            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              {/* OTP shield icon */}
              <div style={{
                width: '64px', height: '64px', margin: '0 auto 14px',
                borderRadius: '20px', backgroundColor: '#138865',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(19,136,101,0.25)',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 5v6c0 5.25 3.5 10.14 8 11.36C16.5 21.14 20 16.25 20 11V5l-8-3z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.7rem', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Verify OTP</h1>
              <p style={{ fontSize: '0.87rem', color: '#718096', margin: 0 }}>
                We sent a 6-digit code to
              </p>
              <p style={{ fontSize: '0.87rem', fontWeight: '700', color: '#162032', marginTop: '3px' }}>
                {pendingUser?.emailOrPhone}
              </p>
            </div>

            {/* Demo Notice – simulated OTP (remove in production) */}
            <div style={{
              backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
              borderRadius: '12px', padding: '10px 14px', marginBottom: '16px',
              fontSize: '0.8rem', color: '#92400e', textAlign: 'center',
            }}>
              🔔 <strong>Demo Mode:</strong> Your OTP is <strong style={{ fontSize: '1rem', letterSpacing: '0.15em' }}>{generatedOTP}</strong>
            </div>

            {otpErr && <Banner type="error" message={otpErr} />}
            {otpSuccess && <Banner type="success" message={otpSuccess} />}

            <form onSubmit={handleVerifyOTP}>
              {/* 6-digit OTP boxes */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                {otpInputs.map((v, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                      width: '46px', height: '54px', textAlign: 'center',
                      fontSize: '1.4rem', fontWeight: '800', color: '#162032',
                      border: `2px solid ${v ? '#138865' : '#cbd5e1'}`,
                      borderRadius: '12px', outline: 'none', backgroundColor: '#ffffff',
                      transition: 'border-color 0.2s',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                ))}
              </div>

              <button type="submit" style={primaryBtn()}>Verify &amp; Create Account</button>
            </form>

            {/* Resend OTP */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.84rem', color: '#718096' }}>
              Didn't receive the code?{' '}
              {resendCooldown > 0 ? (
                <span style={{ color: '#94a3b8' }}>Resend in {resendCooldown}s</span>
              ) : (
                <span onClick={handleResendOTP}
                  style={{ fontWeight: '700', color: '#138865', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={14} /> Resend OTP
                </span>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default LoginPage;
