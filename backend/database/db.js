import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { DATABASE_PATH } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure database directory exists
const dbDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite connection
const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize all database tables and seed data if empty
 */
export function initDatabase(forceReseed = false) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'inspector',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_active TEXT
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      fabric_type TEXT NOT NULL,
      fabric_name TEXT,
      image_path TEXT,
      inspection_date TEXT NOT NULL,
      defect_count INTEGER NOT NULL DEFAULT 0,
      grade TEXT NOT NULL,
      status TEXT NOT NULL,
      overall_summary TEXT,
      recommended_action TEXT,
      model_version TEXT DEFAULT 'FabriSense YOLOv8',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS defects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id TEXT NOT NULL,
      defect_type TEXT NOT NULL,
      confidence REAL NOT NULL,
      severity TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      explanation TEXT,
      recommended_action TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (inspection_id) REFERENCES inspections(inspection_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id TEXT NOT NULL,
      report_number TEXT NOT NULL,
      report_path TEXT,
      status TEXT DEFAULT 'Generated',
      created_at TEXT NOT NULL,
      FOREIGN KEY (inspection_id) REFERENCES inspections(inspection_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS model_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL,
      model_version TEXT NOT NULL,
      status TEXT NOT NULL,
      api_status TEXT NOT NULL,
      dataset_name TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  try {
    db.prepare("ALTER TABLE reports ADD COLUMN status TEXT DEFAULT 'Generated'").run();
  } catch (_e) {}

  // Seed static reference data (admins, users, model, settings) only when the table is empty.
  const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
  if (adminCount === 0) {
    seedDefaults(db);
  }
}

/**
 * Seed only static reference data (admin account, users, model info, settings).
 * Inspection records are NOT pre-seeded; the history starts empty.
 */
function seedDefaults(database) {
  console.log('[FabriSense DB] Seeding default admin, users, model info and settings...');

  const salt = bcrypt.genSaltSync(10);
  const adminPassHash = bcrypt.hashSync('Admin@123', salt);
  const now = new Date().toISOString();

  // 1. Seed Admins
  const insertAdmin = database.prepare(`
    INSERT INTO admins (name, email, password_hash, role, status, created_at, updated_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAdmin.run(
    'Rajesh Kumar',
    'admin@fabrisense.com',
    adminPassHash,
    'admin',
    'active',
    now,
    now,
    now
  );

  // 2. Seed Users
  const insertUser = database.prepare(`
    INSERT INTO users (id, name, email, phone, role, status, created_at, last_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const usersList = [
    [1, 'Rajesh Kumar', 'admin@fabrisense.com', '+91 98765 43210', 'admin', 'active', '2024-01-01 09:00:00', '2026-09-05 10:15:00'],
    [2, 'Anil Mehta', 'anil.mehta@petrosoft.in', '+91 98765 43211', 'inspector', 'active', '2024-01-10 09:00:00', '2026-09-05 09:42:00'],
    [3, 'Meera Sen', 'meera.sen@petrosoft.in', '+91 98765 43212', 'inspector', 'active', '2024-01-15 09:00:00', '2026-09-04 17:12:00'],
    [4, 'Aarav Sharma', 'aarav.sharma@petrosoft.in', '+91 98765 43213', 'inspector', 'active', '2024-02-01 09:00:00', '2026-09-05 10:25:00'],
    [5, 'Priya Patel', 'priya.patel@petrosoft.in', '+91 98765 43214', 'admin', 'active', '2024-02-10 09:00:00', '2026-09-05 10:30:00'],
    [6, 'Amit Kumar', 'amit.kumar@petrosoft.in', '+91 98765 43215', 'manager', 'active', '2024-02-15 09:00:00', '2026-09-05 08:30:00'],
    [7, 'Kiran Rao', 'kiran.rao@petrosoft.in', '+91 98765 43216', 'inspector', 'active', '2024-03-01 09:00:00', '2026-09-04 15:45:00'],
    [8, 'Vikram Malhotra', 'vikram.m@petrosoft.in', '+91 98765 43217', 'inspector', 'inactive', '2024-03-10 09:00:00', '2026-09-02 11:10:00'],
    [9, 'Sunita Reddy', 'sunita.reddy@petrosoft.in', '+91 98765 43218', 'manager', 'active', '2024-03-15 09:00:00', '2026-09-05 10:20:00'],
  ];

  for (const u of usersList) {
    insertUser.run(...u);
  }

  // Model info
  const insertModel = database.prepare(`
    INSERT OR IGNORE INTO model_info (
      model_name, model_version, status, api_status, dataset_name, last_updated, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertModel.run(
    'FabriSense YOLOv8',
    'v4.2.1-textile',
    process.env.AI_MODE === 'yolo' ? 'Active' : 'Demo',
    'Online',
    'TextileDefect-45k-augmented',
    '2024-09-01 00:00:00',
    now
  );

  // Settings
  const insertSetting = database.prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
  `);

  const defaultSettings = {
    companyName: 'FabriSense Industrial Textiles',
    systemEmail: 'admin@fabrisense.com',
    notificationsEnabled: 'true',
    emailAlerts: 'true',
    autoApproveGradeA: 'true',
    confidenceThreshold: '80',
    defectToleranceLow: '3',
    defectToleranceCritical: '1',
    reportFormat: 'PDF',
    theme: 'dark_navy',
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }

  console.log('[FabriSense DB] Default admin, users, model info and settings seeded.');
}

export default db;
