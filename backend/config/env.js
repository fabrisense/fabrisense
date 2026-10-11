/**
 * backend/config/env.js
 * Centralised environment configuration for the FabriSense backend.
 * All process.env access for secrets should go through this file so that
 * a missing variable is caught in one place at startup.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from backend/.env first, fall back to root .env, then process.cwd() .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const PORT   = parseInt(process.env.PORT || '5000', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS: browser dev origin + optional additional origins (comma-separated)
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'fabrisense_super_secret_jwt_key_2024_textile_ai_inspection';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Database Path
export const DATABASE_PATH = process.env.DATABASE_PATH || path.resolve(__dirname, '../database/fabrisense.db');

// AI / YOLO Configuration
export const AI_MODE = process.env.AI_MODE || 'mock'; // 'mock' | 'yolo'
export const YOLO_API_URL = process.env.YOLO_API_URL || 'http://localhost:8000/predict';

// Uploads Directory
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads/inspections');

// Email / SMTP — supports both EMAIL_* and SMTP_* variable naming conventions
export const SMTP = {
  host:   (process.env.EMAIL_HOST   || process.env.SMTP_HOST   || 'smtp.gmail.com').trim(),
  port:   parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user:   (process.env.EMAIL_USER   || process.env.SMTP_USER   || '').trim(),
  pass:   (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim(),
  from:   (process.env.EMAIL_FROM   || process.env.SMTP_FROM   || '').trim(),
};

/** Returns true when SMTP credentials have been set in .env */
export function smtpConfigured() {
  return !!(SMTP.user && SMTP.pass);
}

