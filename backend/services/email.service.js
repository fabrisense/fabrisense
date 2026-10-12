/**
 * backend/services/email.service.js
 * Multi-provider email service supporting Resend API and custom SMTP (Nodemailer).
 * Branded HTML email template for 6-digit OTP delivery.
 * Contains mock injection capabilities for automated test suites.
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import {
  RESEND_API_KEY,
  RESEND_FROM,
  SMTP,
  smtpConfigured,
  resendConfigured,
  getEmailServiceStatus,
} from '../config/env.js';

let mockSender = null;

/**
 * Configure a mock sender for automated tests. Pass null to reset.
 * @param {Function|null} fn - async ({ to, otp, purposeTitle }) => { sent: boolean, error?: string, id?: string }
 */
export function setMockEmailSender(fn) {
  mockSender = fn;
}

/**
 * Returns currently active mock sender if any.
 */
export function getMockEmailSender() {
  return mockSender;
}

/**
 * Build a Nodemailer transporter from env config.
 * Returns null when SMTP credentials are not set.
 */
export function createTransporter() {
  if (!smtpConfigured()) return null;

  return nodemailer.createTransport({
    host:   SMTP.host,
    port:   SMTP.port,
    secure: SMTP.secure,
    auth: {
      user: SMTP.user,
      pass: SMTP.pass,
    },
  });
}

/**
 * Resolve the "From" display address for SMTP.
 */
export function resolveFromAddress() {
  if (SMTP.from) return SMTP.from;
  return `"FabriSense Security" <${SMTP.user}>`;
}

/**
 * Resolve the "From" display address for Resend.
 */
export function resolveResendFromAddress() {
  if (RESEND_FROM) return RESEND_FROM;
  return 'FabriSense <onboarding@resend.dev>';
}

/**
 * Build the branded HTML email body for an OTP.
 * @param {string} otp          - The 6-digit code
 * @param {string} purposeTitle - e.g. "Email Verification" | "Password Reset"
 */
export function buildOtpEmailHtml(otp, purposeTitle) {
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background-color:#0b1118;color:#e2e8f0;border-radius:16px;border:1px solid #1e293b;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="margin:0;font-size:24px;color:#4ade80;font-weight:800;letter-spacing:-0.5px;">FabriSense</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Smart Handloom Defect Detection</p>
      </div>
      <div style="background-color:#131d2a;padding:24px;border-radius:12px;border:1px solid #23354d;text-align:center;">
        <p style="margin:0 0 12px;font-size:15px;color:#cbd5e1;">Your 6-digit ${purposeTitle} code is:</p>
        <div style="display:inline-block;padding:14px 28px;background-color:#0b1118;border:2px solid #4ade80;border-radius:10px;font-size:32px;font-weight:800;letter-spacing:8px;color:#4ade80;font-family:monospace;">
          ${otp}
        </div>
        <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#64748b;text-align:center;line-height:1.5;">
        If you did not request this code, please ignore this email.
      </p>
    </div>
  `;
}

/**
 * Send an OTP email using the active provider (Mock -> Resend -> SMTP -> Unconfigured).
 * @param {{ to: string, otp: string, purposeTitle: string }} params
 * @returns {Promise<{ sent: boolean, error?: string, code?: string, provider?: string, id?: string }>}
 */
export async function sendOtpEmail({ to, otp, purposeTitle }) {
  // 1. Mock sender hook for automated test suites
  if (typeof mockSender === 'function') {
    return await mockSender({ to, otp, purposeTitle });
  }

  // 2. Resend API (Preferred transactional email provider)
  if (resendConfigured()) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const from = resolveResendFromAddress();
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: `[FabriSense] Your 6-digit ${purposeTitle} code: ${otp}`,
        text: `Your FabriSense 6-digit ${purposeTitle} code is: ${otp}. It will expire in 10 minutes.`,
        html: buildOtpEmailHtml(otp, purposeTitle),
      });

      if (error) {
        console.error('[FabriSense Email] Resend API error:', error.message || error);
        return {
          sent: false,
          error: error.message || 'Resend email delivery failed.',
          code: error.name || 'RESEND_ERROR',
          provider: 'resend',
        };
      }

      console.log(`[FabriSense Email] OTP dispatched to ${to} via Resend (ID: ${data?.id})`);
      return { sent: true, id: data?.id, provider: 'resend' };
    } catch (err) {
      console.error('[FabriSense Email] Resend exception:', err.message);
      return {
        sent: false,
        error: err.message,
        code: 'RESEND_EXCEPTION',
        provider: 'resend',
      };
    }
  }

  // 3. Nodemailer Custom SMTP
  if (smtpConfigured()) {
    const transporter = createTransporter();
    if (!transporter) {
      return { sent: false, error: 'SMTP configuration invalid.', code: 'SMTP_CONFIG_INVALID', provider: 'smtp' };
    }

    try {
      const info = await transporter.sendMail({
        from:    resolveFromAddress(),
        to,
        subject: `[FabriSense] Your 6-digit ${purposeTitle} code: ${otp}`,
        text:    `Your FabriSense 6-digit ${purposeTitle} code is: ${otp}. It will expire in 10 minutes.`,
        html:    buildOtpEmailHtml(otp, purposeTitle),
      });

      console.log(`[FabriSense Email] OTP dispatched to ${to} via SMTP (Message ID: ${info.messageId})`);
      return { sent: true, id: info.messageId, provider: 'smtp' };
    } catch (err) {
      console.error('[FabriSense Email] SMTP transport error:', err.message);
      return {
        sent: false,
        error: err.message,
        code: 'SMTP_TRANSPORT_ERROR',
        provider: 'smtp',
      };
    }
  }

  // 4. Neither Resend nor SMTP is configured
  return {
    sent: false,
    error: 'EMAIL_SERVICE_NOT_CONFIGURED',
    code: 'CONFIG_MISSING',
    provider: 'none',
  };
}

export { getEmailServiceStatus };
