/**
 * backend/index.js
 * FabriSense Express server — entry point.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT, CLIENT_ORIGIN, UPLOADS_DIR } from './config/env.js';
import { initDatabase } from './database/db.js';
import otpRoutes from './routes/otp.routes.js';
import adminRoutes from './routes/admin.routes.js';
import commonInspectionsRoutes from './routes/common.inspections.routes.js';

// Initialize SQLite Database schema & seeds
initDatabase();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5000',
  'capacitor://localhost',
  'http://localhost',
  'ionic://localhost',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // Allow all dev origins while retaining credentials header
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Static uploads ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR));

// ── API routes ─────────────────────────────────────────────────────────────────
// Mobile & Auth OTP
app.use('/api', otpRoutes);

// Shared Inspection API (Mobile & Admin)
app.use('/api/inspections', commonInspectionsRoutes);

// Admin Portal APIs
app.use('/api/admin', adminRoutes);

// ── 404 catch-all ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[FabriSense] Unhandled error:', err.message);
  res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 [FabriSense Backend] Running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Admin Login: http://localhost:${PORT}/api/admin/login`);
    console.log(`   Uploads: http://localhost:${PORT}/uploads\n`);
  });
}

export default app;
