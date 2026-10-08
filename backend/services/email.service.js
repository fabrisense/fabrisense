/**
 * backend/services/email.service.js
 * Nodemailer transport factory + branded HTML email template.
 * This module never touches OTP logic — it only knows how to send emails.
 */

import nodemailer from 'nodemailer';
import { SMTP, smtpConfigured } from '../config/env.js';

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
 * Resolve the "From" display address.
 */
export function resolveFromAddress() {
  if (SMTP.from) return SMTP.from;
  return `"FabriSense Security" <${SMTP.user}>`;
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
 * Send an OTP email.
 * @returns {{ sent: boolean, error?: string }}
 */
export async function sendOtpEmail({ to, otp, purposeTitle }) {
  const transporter = createTransporter();

  if (!transporter) {
    return { sent: false, error: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    await transporter.sendMail({
      from:    resolveFromAddress(),
      to,
      subject: `[FabriSense] Your 6-digit ${purposeTitle} code: ${otp}`,
      text:    `Your FabriSense 6-digit ${purposeTitle} code is: ${otp}. It will expire in 10 minutes.`,
      html:    buildOtpEmailHtml(otp, purposeTitle),
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}
