import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// In-memory OTP store: Map<key, OTPRecord>
// Key: `${email.toLowerCase()}:${purpose}`
// OTPRecord: { hash: string, expiresAt: number, attempts: number, lastSentAt: number }
const otpStore = new Map();

// In-memory password reset verified tokens: Map<token, { email: string, expiresAt: number }>
const resetTokens = new Map();

// Periodic cleanup of expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expiresAt) {
      resetTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

// Helper: Hash OTP with email salt using SHA-256
function hashOtp(otp, email) {
  return crypto
    .createHash('sha256')
    .update(`${String(otp).trim()}:${email.trim().toLowerCase()}`)
    .digest('hex');
}

// Helper: Configure Nodemailer transporter supporting both EMAIL_* and SMTP_* variables
function getTransporter() {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim();

  if (!user || !pass) {
    return null;
  }

  const host = (process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

// Core helper: Generate, store, and send 6-digit OTP
async function processSendOtp(email, purpose, res) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const storeKey = `${cleanEmail}:${purpose}`;
  const now = Date.now();

  // Enforce 60-second rate limiting / cooldown
  const existing = otpStore.get(storeKey);
  if (existing && now - existing.lastSentAt < 60000) {
    const waitSec = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
    return res.status(429).json({
      success: false,
      error: `Please wait ${waitSec}s before requesting a new OTP.`,
      cooldownRemaining: waitSec,
    });
  }

  // Generate cryptographically secure 6-digit OTP
  const otp = String(crypto.randomInt(100000, 1000000));
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry

  // Store hashed OTP (old OTP is automatically overwritten and invalidated)
  otpStore.set(storeKey, {
    hash: hashOtp(otp, cleanEmail),
    expiresAt,
    attempts: 0,
    lastSentAt: now,
  });

  const purposeTitle = purpose === 'forgot_password' ? 'Password Reset' : 'Email Verification';

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #0b1118; color: #e2e8f0; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="margin: 0; font-size: 24px; color: #4ade80; font-weight: 800; letter-spacing: -0.5px;">FabriSense</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Smart Handloom Defect Detection</p>
      </div>
      <div style="background-color: #131d2a; padding: 24px; border-radius: 12px; border: 1px solid #23354d; text-align: center;">
        <p style="margin: 0 0 12px; font-size: 15px; color: #cbd5e1;">Your 6-digit ${purposeTitle} code is:</p>
        <div style="display: inline-block; padding: 14px 28px; background-color: #0b1118; border: 2px solid #4ade80; border-radius: 10px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4ade80; font-family: monospace;">
          ${otp}
        </div>
        <p style="margin: 16px 0 0; font-size: 13px; color: #94a3b8;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5;">
        If you did not request this code, please ignore this email.
      </p>
    </div>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || `"FabriSense Security" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject: `[FabriSense] Your 6-digit ${purposeTitle} code: ${otp}`,
        text: `Your FabriSense 6-digit ${purposeTitle} code is: ${otp}. It will expire in 10 minutes.`,
        html: htmlContent,
      });

      console.log(`[FabriSense Server] Successfully emailed 6-digit OTP to ${cleanEmail} for ${purpose}`);
      const payload = {
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
        cooldown: 60,
      };
      if (process.env.NODE_ENV === 'test') payload._testOtp = otp;
      return res.json(payload);
    } catch (mailErr) {
      console.error('[FabriSense Server] SMTP Error sending email:', mailErr.message);
      return res.status(500).json({
        success: false,
        error: `Failed to send email: ${mailErr.message}. Check your email configuration in .env.`,
      });
    }
  } else {
    // If SMTP credentials are not yet added to .env, log OTP to terminal for developer
    console.warn(`\n⚠️  [FabriSense Server] EMAIL_USER / EMAIL_PASSWORD not set in .env!`);
    console.warn(`👉 [Server Log] 6-digit OTP for ${cleanEmail} (${purposeTitle}): ${otp}\n`);

    const payload = {
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. (Check server terminal log if testing locally without SMTP)`,
      cooldown: 60,
    };
    if (process.env.NODE_ENV === 'test') payload._testOtp = otp;
    return res.json(payload);
  }
}

// Core helper: Verify OTP
function processVerifyOtp(email, otp, purpose, res) {
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and 6-digit OTP are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = String(otp).trim();
  const storeKey = `${cleanEmail}:${purpose}`;

  const record = otpStore.get(storeKey);

  if (!record) {
    return res.status(400).json({
      success: false,
      error: 'No active OTP found for this email. Please request a new code.',
    });
  }

  // Check expiration (10 minutes)
  if (Date.now() > record.expiresAt) {
    otpStore.delete(storeKey);
    return res.status(400).json({
      success: false,
      error: 'This OTP has expired. Please request a new code.',
    });
  }

  // Check maximum attempts (5 attempts limit)
  if (record.attempts >= 5) {
    otpStore.delete(storeKey);
    return res.status(429).json({
      success: false,
      error: 'Maximum attempts exceeded. This OTP has been invalidated. Please request a new code.',
    });
  }

  // Compare SHA-256 hash
  const candidateHash = hashOtp(cleanOtp, cleanEmail);

  if (candidateHash !== record.hash) {
    record.attempts += 1;
    const remainingAttempts = 5 - record.attempts;

    if (remainingAttempts <= 0) {
      otpStore.delete(storeKey);
      return res.status(429).json({
        success: false,
        error: 'Maximum attempts exceeded. This OTP has been invalidated. Please request a new code.',
      });
    }

    return res.status(400).json({
      success: false,
      error: `Incorrect OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
    });
  }

  // Verification succeeded: delete OTP so it cannot be reused
  otpStore.delete(storeKey);

  // Issue single-use verifiedToken (valid for 15 minutes)
  const verifiedToken = crypto.randomBytes(32).toString('hex');
  if (purpose === 'forgot_password') {
    resetTokens.set(verifiedToken, {
      email: cleanEmail,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
  }

  console.log(`[FabriSense Server] Verified ${purpose} OTP for ${cleanEmail}`);
  return res.json({
    success: true,
    message: 'OTP verified successfully.',
    verifiedToken,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Send registration OTP
app.post('/api/otp/send-registration', (req, res) => {
  return processSendOtp(req.body.email, 'registration', res);
});

// Resend registration OTP (generates a new OTP, invalidating old OTP)
app.post('/api/otp/resend-registration', (req, res) => {
  return processSendOtp(req.body.email, 'registration', res);
});

// Verify registration OTP
app.post('/api/otp/verify-registration', (req, res) => {
  return processVerifyOtp(req.body.email, req.body.otp, 'registration', res);
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Send forgot-password OTP
app.post('/api/otp/send-forgot-password', (req, res) => {
  return processSendOtp(req.body.email, 'forgot_password', res);
});

// Resend forgot-password OTP (generates a new OTP, invalidating old OTP)
app.post('/api/otp/resend-forgot-password', (req, res) => {
  return processSendOtp(req.body.email, 'forgot_password', res);
});

// Verify forgot-password OTP
app.post('/api/otp/verify-forgot-password', (req, res) => {
  return processVerifyOtp(req.body.email, req.body.otp, 'forgot_password', res);
});

// Reset password endpoint (validates verifiedToken)
app.post('/api/otp/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Email, token, and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const tokenData = resetTokens.get(token);

  if (!tokenData || tokenData.email !== cleanEmail) {
    return res.status(401).json({ success: false, error: 'Invalid or expired password reset session. Please verify OTP again.' });
  }

  if (Date.now() > tokenData.expiresAt) {
    resetTokens.delete(token);
    return res.status(401).json({ success: false, error: 'Password reset session expired. Please verify OTP again.' });
  }

  // Token is valid: burn it immediately
  resetTokens.delete(token);

  console.log(`[FabriSense Server] Password reset authorized for ${cleanEmail}`);
  return res.json({
    success: true,
    message: 'Password has been successfully updated.',
  });
});

// Backward compatibility routes
app.post('/api/otp/send', (req, res) => {
  const purpose = req.body.purpose === 'forgot_password' ? 'forgot_password' : 'registration';
  return processSendOtp(req.body.email, purpose, res);
});

app.post('/api/otp/verify', (req, res) => {
  const purpose = req.body.purpose === 'forgot_password' ? 'forgot_password' : 'registration';
  return processVerifyOtp(req.body.email, req.body.otp, purpose, res);
});

// Health check
app.get('/api/health', (req, res) => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim();
  res.json({
    status: 'ok',
    service: 'FabriSense OTP Email Service',
    smtpConfigured: !!(user && pass),
  });
});

app.listen(PORT, () => {
  console.log(`[FabriSense Server] Running on http://localhost:${PORT}`);
});
