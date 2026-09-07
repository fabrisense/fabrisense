import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export function OtpInput({ otp, setOtp, recipientInfo }) {
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus next field
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setTimer(45);
    setCanResend(false);
    // Focus first input
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="input-group">
      <div className="input-label">
        <span>6-Digit Verification Code</span>
        <span style={{ fontSize: '0.75rem', color: '#ff6b81', fontWeight: 600 }}>
          Sent to {recipientInfo}
        </span>
      </div>

      <div style={digitsGridStyle}>
        {Array.from({ length: 6 }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index] || ''}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            style={{
              ...digitBoxStyle,
              borderColor: otp[index] ? 'rgba(255, 46, 76, 0.7)' : 'rgba(255, 255, 255, 0.1)',
              background: otp[index] ? 'rgba(255, 46, 76, 0.12)' : 'rgba(22, 27, 39, 0.8)',
              boxShadow: otp[index] ? '0 0 12px rgba(255, 46, 76, 0.3)' : 'none',
            }}
          />
        ))}
      </div>

      <div style={resendRowStyle}>
        {canResend ? (
          <button type="button" onClick={handleResend} style={resendBtnStyle}>
            <RefreshCw size={12} /> Resend OTP Code
          </button>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Resend code in <strong style={{ color: '#ff6b81' }}>{timer}s</strong>
          </span>
        )}
      </div>
    </div>
  );
}

const digitsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gap: '8px',
  margin: '10px 0 14px 0',
};

const digitBoxStyle = {
  width: '100%',
  height: '52px',
  textAlign: 'center',
  fontSize: '1.4rem',
  fontWeight: '700',
  color: '#ffffff',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  outline: 'none',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

const resendRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
};

const resendBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#ff6b81',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: 0,
};
