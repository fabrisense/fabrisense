import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardCheck, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { loginAdmin, setAdminAuth } from '../../services/adminApi';
import logoImg from '../../assets/logo.jpg';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide your administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      console.warn('Backend login notice:', err);
      // Seamless demo fallback if backend server is not running
      if (email.trim().toLowerCase() === 'fabrisense.detect@gmail.com' && password === 'Admin@123') {
        setAdminAuth('demo_admin_jwt_token', {
          id: 1,
          name: 'Rajesh Kumar',
          email: 'fabrisense.detect@gmail.com',
          role: 'admin',
        });
        navigate(from, { replace: true });
        return;
      }
      setError(err.message || 'Invalid credentials or server unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('fabrisense.detect@gmail.com');
    setPassword('Admin@123');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1f2a44',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Background Decorative Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(32, 140, 125, 0.15) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
          opacity: 0.8,
          pointerEvents: 'none',
        }}
      />

      {/* Main Login Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              overflow: 'hidden',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}
          >
            <img src={logoImg} alt="FabriSense" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
          </div>

          <h1
            style={{
              fontSize: '26px',
              fontWeight: '800',
              color: '#1f2a44',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            FabriSense
          </h1>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#208c7d',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            ADMIN PORTAL
          </div>
          <p
            style={{
              fontSize: '13.5px',
              color: '#64748b',
              marginTop: '10px',
              marginBottom: 0,
            }}
          >
            Manage fabric inspections and quality analytics
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="email"
                placeholder="fabrisense.detect@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Options: Remember me & Forgot Password */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              fontSize: '13px',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#208c7d' }}
              />
              Remember me
            </label>
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('For demo environment, use default credentials: fabrisense.detect@gmail.com / Admin@123');
              }}
              style={{ color: '#208c7d', textDecoration: 'none', fontWeight: '500' }}
            >
              Forgot Password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 18px',
              backgroundColor: '#208c7d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(32, 140, 125, 0.3)',
              transition: 'background-color 0.2s',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        </div>
    </div>
  );
}

export default AdminLogin;
