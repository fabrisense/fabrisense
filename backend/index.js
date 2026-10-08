/**
 * backend/index.js
 * FabriSense Express server — entry point.
 *
 * Start with:
 *   node backend/index.js
 * or (from fabrisense-1/):
 *   npm run backend
 */

import express from 'express';
import cors    from 'cors';
import { PORT, CLIENT_ORIGIN } from './config/env.js';
import otpRoutes from './routes/otp.routes.js';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the Vite dev server and the production frontend origin.
// For Android Capacitor, the origin is 'capacitor://localhost' or 'http://localhost'
// when using a live-reload setup — include both.
const allowedOrigins = [
  CLIENT_ORIGIN,
  'capacitor://localhost',
  'http://localhost',
  'ionic://localhost',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman, Android app)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
  },
  methods:     ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json());

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api', otpRoutes);

// ── 404 catch-all ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[FabriSense] Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 [FabriSense Backend] Running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
