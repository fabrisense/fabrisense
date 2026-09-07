import React, { useState } from 'react';
import { X, Mail, Phone, CheckCircle2, ArrowRight } from 'lucide-react';

export function PasswordResetModal({ isOpen, onClose, initialMode = 'email', initialEmail = '', initialPhone = '' }) {
  const [resetMode, setResetMode] = useState(initialMode);
  const [targetVal, setTargetVal] = useState(initialMode === 'email' ? initialEmail : initialPhone);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetVal) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f3f4f8' }}>
            Account <span className="highlight-text">Recovery</span>
          </h3>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '18px', lineHeight: 1.5 }}>
              Choose your recovery method below. We will send a secure password reset link or OTP code.
            </p>

            <div className="tabs-container" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className={`tab-btn ${resetMode === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setResetMode('email');
                  setTargetVal(initialEmail);
                }}
              >
                <Mail size={14} /> Reset via Email
              </button>
              <button
                type="button"
                className={`tab-btn ${resetMode === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setResetMode('phone');
                  setTargetVal(initialPhone);
                }}
              >
                <Phone size={14} /> Reset via SMS
              </button>
            </div>

            <div className="input-group">
              <label className="input-label">
                {resetMode === 'email' ? 'Registered Email' : 'Registered Phone Number'}
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  {resetMode === 'email' ? <Mail size={18} /> : <Phone size={18} />}
                </div>
                <input
                  type={resetMode === 'email' ? 'email' : 'tel'}
                  className="custom-input"
                  placeholder={resetMode === 'email' ? 'you@domain.com' : '+1 (555) 000-0000'}
                  value={targetVal}
                  onChange={(e) => setTargetVal(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? (
                'Sending Recovery Token...'
              ) : (
                <>
                  Send Recovery Link <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255, 46, 76, 0.15)',
                border: '1px solid #ff2e4c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 0 25px rgba(255, 46, 76, 0.4)',
              }}
            >
              <CheckCircle2 size={30} color="#ff2e4c" />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
              Recovery Dispatch Sent!
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              Instructions have been dispatched to <strong style={{ color: '#ff6b81' }}>{targetVal}</strong>. Please check your inbox or mobile device.
            </p>
            <button type="button" className="btn-primary" onClick={handleClose}>
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
