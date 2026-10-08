/**
 * backend/routes/otp.routes.js
 * Express router for all OTP and password-reset endpoints.
 * Route definitions are kept separate from business logic.
 */

import { Router } from 'express';
import {
  sendRegistrationOtp,
  resendRegistrationOtp,
  verifyRegistrationOtp,
  sendForgotPasswordOtp,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  healthCheck,
} from '../controllers/otp.controller.js';

const router = Router();

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', healthCheck);

// ── Registration OTP ──────────────────────────────────────────────────────────
router.post('/otp/send-registration',   sendRegistrationOtp);
router.post('/otp/resend-registration', resendRegistrationOtp);
router.post('/otp/verify-registration', verifyRegistrationOtp);

// ── Forgot-password OTP ───────────────────────────────────────────────────────
router.post('/otp/send-forgot-password',   sendForgotPasswordOtp);
router.post('/otp/resend-forgot-password', resendForgotPasswordOtp);
router.post('/otp/verify-forgot-password', verifyForgotPasswordOtp);

// ── Password reset ────────────────────────────────────────────────────────────
router.post('/otp/reset-password', resetPassword);

// ── Backward-compat aliases (kept so old test scripts still work) ─────────────
router.post('/otp/send',   (req, res) => {
  const purpose = req.body.purpose === 'forgot_password' ? 'forgot_password' : 'registration';
  req.body._purpose = purpose;
  return purpose === 'forgot_password' ? sendForgotPasswordOtp(req, res) : sendRegistrationOtp(req, res);
});
router.post('/otp/verify', (req, res) => {
  const purpose = req.body.purpose === 'forgot_password' ? 'forgot_password' : 'registration';
  req.body._purpose = purpose;
  return purpose === 'forgot_password' ? verifyForgotPasswordOtp(req, res) : verifyRegistrationOtp(req, res);
});

export default router;
