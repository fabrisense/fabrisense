import React from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

const COMMON_DOMAINS = ['@gmail.com', '@outlook.com', '@yahoo.com', '@icloud.com'];

export function EmailInput({ value, onChange, error, setError }) {
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    if (error && isValidEmail(newVal)) {
      setError('');
    }
  };

  const handleChipClick = (domain) => {
    if (!value) {
      onChange(`user${domain}`);
      return;
    }
    const atIndex = value.indexOf('@');
    if (atIndex !== -1) {
      const prefix = value.substring(0, atIndex);
      onChange(`${prefix}${domain}`);
    } else {
      onChange(`${value}${domain}`);
    }
    setError('');
  };

  return (
    <div className="input-group">
      <div className="input-label">
        <span>Email Address</span>
        {value && isValidEmail(value) && (
          <span className="label-badge" style={{ color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Valid Format
          </span>
        )}
        {error && (
          <span className="label-badge" style={{ color: '#ff4d6d', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={12} /> {error}
          </span>
        )}
      </div>

      <div className={`input-wrapper ${error ? 'error' : ''}`}>
        <div className="input-icon">
          <Mail size={18} />
        </div>
        <input
          type="email"
          className="custom-input"
          placeholder="name@example.com"
          value={value}
          onChange={handleChange}
          required
          autoComplete="email"
        />
      </div>

      {/* Domain Suggestion Quick Chips */}
      <div style={chipsContainerStyle}>
        <span style={{ fontSize: '0.7rem', color: '#507d64', marginRight: '4px' }}>Quick domain:</span>
        {COMMON_DOMAINS.map((domain) => (
          <button
            key={domain}
            type="button"
            onClick={() => handleChipClick(domain)}
            style={chipStyle}
          >
            {domain}
          </button>
        ))}
      </div>
    </div>
  );
}

const chipsContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '6px',
  marginTop: '4px',
};

const chipStyle = {
  background: 'rgba(134, 239, 172, 0.08)',
  border: '1px solid rgba(124, 232, 163, 0.28)',
  borderRadius: '12px',
  color: '#86efac',
  fontSize: '0.7rem',
  fontWeight: 600,
  padding: '3px 8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};
