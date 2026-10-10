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

  const currentCount = db.prepare('SELECT COUNT(*) as c FROM inspections').get().c;
  if (currentCount < 1000 || forceReseed) {
    seedDatabase(db);
  }
}

/**
 * Seed database with reference demo dataset matching exact specifications
 */
function seedDatabase(database) {
  console.log('[FabriSense DB] Seeding complete 1,247-inspection dataset matching reference designs...');

  // Clear existing to prevent duplicate constraint issues
  database.exec(`
    DELETE FROM defects;
    DELETE FROM reports;
    DELETE FROM inspections;
    DELETE FROM users;
    DELETE FROM admins;
    DELETE FROM model_info;
    DELETE FROM settings;
  `);

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

  // Prepared statements
  const insertInsp = database.prepare(`
    INSERT INTO inspections (
      inspection_id, user_id, fabric_type, fabric_name, image_path,
      inspection_date, defect_count, grade, status, overall_summary,
      recommended_action, model_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDefect = database.prepare(`
    INSERT INTO defects (
      inspection_id, defect_type, confidence, severity, x, y, width, height,
      explanation, recommended_action, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReport = database.prepare(`
    INSERT INTO reports (inspection_id, report_number, report_path, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Execute in single fast SQLite transaction
  const seedTransaction = database.transaction(() => {
    // 3. Primary Reference Inspections from Screenshot 2
    const primaryLogs = [
      {
        id: 'INS-2024-0047',
        user_id: 1, // Rajesh Kumar
        fabric_type: 'Egyptian Cotton Premium',
        fabric_name: 'Egyptian Cotton Premium #102',
        image_path: '/assets/indigo_denim.jpg',
        date: '2026-09-05 10:15:00',
        defect_count: 3,
        grade: 'B',
        status: 'Review',
        summary: 'Minor and moderate defects were detected including weft tear, slub knot, and surface stain. Structurally viable but requires manual review before sewing.',
        action: 'Flag affected roll section for cutting or spot cleaning before batch packaging.',
        defects: [
          { type: 'Weft Tears', conf: 94, sev: 'Critical', x: 28, y: 22, w: 22, h: 26, exp: 'Minor horizontal weft tension split.', act: 'Flag roll section for cutting or mend with micro-stitching.' },
          { type: 'Slub Knot', conf: 81, sev: 'Moderate', x: 46, y: 45, w: 18, h: 24, exp: 'Localized knot and thickened irregularity in raw yarn weave.', act: 'Check finishing loom yarn feed tension.' },
          { type: 'Stains', conf: 72, sev: 'Low', x: 65, y: 60, w: 16, h: 18, exp: 'Discoloration / oil spot on surface.', act: 'Inspect affected area before further rolling.' },
        ],
      },
      {
        id: 'INS-2024-0046',
        user_id: 2, // Anil Mehta
        fabric_type: 'Kanchipuram Silk',
        fabric_name: 'Kanchipuram Silk #384',
        image_path: '/assets/kanchipuram_silk.jpg',
        date: '2026-09-05 09:42:00',
        defect_count: 0,
        grade: 'A',
        status: 'Passed',
        summary: 'Zero defects detected. Fabric conforms to Grade A luxury export standards with excellent weave symmetry.',
        action: 'Approved for immediate dispatch to packaging.',
        defects: [],
      },
      {
        id: 'INS-2024-0045',
        user_id: 3, // Meera Sen
        fabric_type: 'Indigo Denim',
        fabric_name: 'Indigo Denim #383',
        image_path: '/assets/indigo_denim.jpg',
        date: '2026-09-04 17:12:00',
        defect_count: 2,
        grade: 'B',
        status: 'Passed',
        summary: 'Surface slub and slight scratch within allowable industrial denim tolerances.',
        action: 'Pass with standard garment wash finishing.',
        defects: [
          { type: 'Slub Knot', conf: 88, sev: 'Low', x: 25, y: 30, w: 22, h: 18, exp: 'Thickened irregularity in yarn weave.', act: 'Allow within tolerance.' },
          { type: 'Scratches', conf: 84, sev: 'Moderate', x: 60, y: 45, w: 28, h: 20, exp: 'Surface abrasion on warp line.', act: 'Steam press.' },
        ],
      },
      {
        id: 'INS-2024-0044',
        user_id: 1, // Rajesh Kumar
        fabric_type: 'Pure Linen Weave',
        fabric_name: 'Pure Linen Weave #09',
        image_path: '/assets/indigo_denim.jpg',
        date: '2026-09-04 14:30:00',
        defect_count: 1,
        grade: 'B',
        status: 'Passed',
        summary: 'Isolated weft irregularity detected near perimeter salvage.',
        action: 'Mark for edge hem trim.',
        defects: [
          { type: 'Weft Tears', conf: 86, sev: 'Moderate', x: 42, y: 62, w: 25, h: 22, exp: 'Weft tension split.', act: 'Mark for trim.' },
        ],
      },
      {
        id: 'INS-2024-0043',
        user_id: 2, // Anil Mehta
        fabric_type: 'Polyester Blend Yard',
        fabric_name: 'Polyester Blend Yard #11',
        image_path: '/assets/indigo_denim.jpg',
        date: '2026-09-04 11:15:00',
        defect_count: 8,
        grade: 'C',
        status: 'Failed',
        summary: 'Severe cluster of structural punctures and tears exceeding rejection threshold.',
        action: 'Reject batch roll. Route to recycle/reloom unit.',
        defects: [
          { type: 'Holes', conf: 96, sev: 'Critical', x: 18, y: 22, w: 30, h: 25, exp: 'Puncture', act: 'Reject' },
          { type: 'Holes', conf: 95, sev: 'Critical', x: 55, y: 20, w: 28, h: 24, exp: 'Secondary puncture', act: 'Reject' },
          { type: 'Weft Tears', conf: 92, sev: 'Critical', x: 40, y: 40, w: 35, h: 26, exp: 'Tear', act: 'Reject' },
          { type: 'Broken Yarn', conf: 90, sev: 'Moderate', x: 30, y: 60, w: 22, h: 19, exp: 'Broken yarn', act: 'Rework' },
          { type: 'Stains', conf: 89, sev: 'Moderate', x: 70, y: 65, w: 20, h: 22, exp: 'Oil spot', act: 'Clean' },
          { type: 'Scratches', conf: 85, sev: 'Low', x: 15, y: 75, w: 18, h: 15, exp: 'Scratch', act: 'Monitor' },
          { type: 'Slub Knot', conf: 82, sev: 'Low', x: 80, y: 35, w: 15, h: 15, exp: 'Knot', act: 'Monitor' },
          { type: 'Other', conf: 81, sev: 'Low', x: 50, y: 80, w: 16, h: 14, exp: 'Fuzzing', act: 'Monitor' },
        ],
      },
      {
        id: 'INS-2024-0042',
        user_id: 3, // Meera Sen
        fabric_type: 'Lawn Voile Premium',
        fabric_name: 'Lawn Voile Premium #12',
        image_path: '/assets/kanchipuram_silk.jpg',
        date: '2026-09-04 09:05:00',
        defect_count: 0,
        grade: 'A',
        status: 'Passed',
        summary: 'Clean lightweight weave with high uniformity and zero detectable flaws.',
        action: 'Batch approved for garment printing.',
        defects: [],
      },
      {
        id: 'INS-2024-0041',
        user_id: 1, // Rajesh Kumar
        fabric_type: 'Kanchipuram Silk Special',
        fabric_name: 'Kanchipuram Silk Special',
        image_path: '/assets/kanchipuram_silk.jpg',
        date: '2026-09-03 16:50:00',
        defect_count: 1,
        grade: 'B',
        status: 'Passed',
        summary: 'Single loose thread snag on non-critical border fold.',
        action: 'Snip loose thread and verify zari alignment.',
        defects: [
          { type: 'Broken Yarn', conf: 87, sev: 'Low', x: 35, y: 48, w: 24, h: 20, exp: 'Thread snag', act: 'Manual snip' },
        ],
      },
      {
        id: 'INS-2024-0040',
        user_id: 2, // Anil Mehta
        fabric_type: 'Egyptian Cotton',
        fabric_name: 'Egyptian Cotton #098',
        image_path: '/assets/indigo_denim.jpg',
        date: '2026-09-03 14:15:00',
        defect_count: 11,
        grade: 'C',
        status: 'Failed',
        summary: 'Multiple widespread defect clusters resulting from mechanical tension fault during weaving run.',
        action: 'Batch rejection; calibrate mechanical loom feed.',
        defects: [
          { type: 'Holes', conf: 97, sev: 'Critical', x: 20, y: 15, w: 25, h: 20, exp: 'Hole', act: 'Reject' },
          { type: 'Holes', conf: 93, sev: 'Critical', x: 45, y: 25, w: 22, h: 22, exp: 'Hole', act: 'Reject' },
          { type: 'Weft Tears', conf: 94, sev: 'Critical', x: 60, y: 35, w: 30, h: 24, exp: 'Tear', act: 'Reject' },
          { type: 'Stains', conf: 91, sev: 'Moderate', x: 15, y: 50, w: 20, h: 20, exp: 'Stain', act: 'Clean' },
          { type: 'Stains', conf: 89, sev: 'Moderate', x: 35, y: 65, w: 18, h: 18, exp: 'Stain', act: 'Clean' },
          { type: 'Broken Yarn', conf: 88, sev: 'Moderate', x: 75, y: 55, w: 20, h: 20, exp: 'Yarn break', act: 'Trim' },
          { type: 'Broken Yarn', conf: 87, sev: 'Moderate', x: 50, y: 70, w: 18, h: 18, exp: 'Yarn break', act: 'Trim' },
          { type: 'Slub Knot', conf: 85, sev: 'Low', x: 25, y: 80, w: 15, h: 15, exp: 'Slub', act: 'Monitor' },
          { type: 'Slub Knot', conf: 84, sev: 'Low', x: 70, y: 75, w: 15, h: 15, exp: 'Slub', act: 'Monitor' },
          { type: 'Scratches', conf: 83, sev: 'Low', x: 80, y: 20, w: 16, h: 16, exp: 'Scratch', act: 'Monitor' },
          { type: 'Other', conf: 82, sev: 'Low', x: 10, y: 30, w: 14, h: 14, exp: 'Fuzzing', act: 'Singing' },
        ],
      },
    ];

    for (const insp of primaryLogs) {
      insertInsp.run(
        insp.id,
        insp.user_id,
        insp.fabric_type,
        insp.fabric_name,
        insp.image_path,
        insp.date,
        insp.defect_count,
        insp.grade,
        insp.status,
        insp.summary,
        insp.action,
        'FabriSense YOLOv8',
        insp.date,
        insp.date
      );

      for (const d of insp.defects) {
        insertDefect.run(
          insp.id,
          d.type,
          d.conf,
          d.sev,
          d.x,
          d.y,
          d.w,
          d.h,
          d.exp,
          d.act,
          insp.date
        );
      }

      insertReport.run(
        insp.id,
        `REP-${insp.id}`,
        `/reports/${insp.id}.pdf`,
        'Generated',
        insp.date
      );
    }

    // 4. Dashboard Recent Inspections (INS-0498 down to INS-0494) matching Screenshot 1 & 2
    const dashboardRecent = [
      { id: 'INS-0498', user_id: 1, fabric: 'Kanchipuram Silk #384', type: 'Kanchipuram Silk', count: 0, grade: 'A', status: 'Passed', date: '2026-09-05 11:30:00', repId: 'REP-2026-081', repStatus: 'Generated' },
      { id: 'INS-0497', user_id: 2, fabric: 'Indigo Denim #383', type: 'Indigo Denim', count: 2, grade: 'B', status: 'Passed', date: '2026-09-05 11:20:00', repId: 'REP-2026-080', repStatus: 'Generated' },
      { id: 'INS-0496', user_id: 3, fabric: 'Egyptian Cotton #102', type: 'Egyptian Cotton', count: 5, grade: 'C', status: 'Failed', date: '2026-09-04 17:10:00', repId: 'REP-2026-079', repStatus: 'Pending' },
      { id: 'INS-0495', user_id: 1, fabric: 'Pure Linen #09', type: 'Pure Linen Weave', count: 1, grade: 'B', status: 'Passed', date: '2026-09-04 16:00:00', repId: 'REP-2026-078', repStatus: 'Generated' },
      { id: 'INS-0494', user_id: 2, fabric: 'Lawn Voile Premium #12', type: 'Lawn Voile', count: 0, grade: 'A', status: 'Passed', date: '2026-09-04 14:50:00', repId: 'REP-2026-077', repStatus: 'Generated' },
    ];

    for (const r of dashboardRecent) {
      insertInsp.run(
        r.id,
        r.user_id,
        r.type,
        r.fabric,
        '/assets/indigo_denim.jpg',
        r.date,
        r.count,
        r.grade,
        r.status,
        `${r.fabric} batch quality inspection.`,
        r.grade === 'A' ? 'Approved for dispatch.' : r.grade === 'B' ? 'Proceed with finishing.' : 'Batch rejected.',
        'FabriSense YOLOv8',
        r.date,
        r.date
      );

      insertReport.run(
        r.id,
        r.repId,
        `/reports/${r.id}.pdf`,
        r.repStatus,
        r.date
      );
    }

    // 5. Populate remaining records to achieve the exact totals:
    // Total Inspections = 1,247
    // Grade A = 723 (58%)
    // Grade B = 386 (31%)
    // Grade C = 138 (11%)
    // Defect-free = 724
    // Total Defects = 523
    // Holes = 167 (31.9%)
    // Stains = 146 (27.9%)
    // Knots / Broken Yarn = 115 (21.9%)
    // Tears / Scratches = 62 (11.8%)
    // Other = 33 (6.5%)
    // Total = 167 + 146 + 115 + 62 + 33 = 523!

    // Already inserted: 8 (primary) + 5 (recent) = 13 inspections.
    // Grade A: 2 (primary) + 2 (recent) = 4 inserted. Remaining Grade A: 723 - 4 = 719.
    // Grade B: 4 (primary) + 2 (recent) = 6 inserted. Remaining Grade B: 386 - 6 = 380.
    // Grade C: 2 (primary) + 1 (recent) = 3 inserted. Remaining Grade C: 138 - 3 = 135.
    // Total remaining inspections: 719 + 380 + 135 = 1,234 inspections (Total = 1,247!).

    // Defects already inserted in primary:
    // Holes: 1 + 2 + 2 = 5
    // Stains: 1 + 1 + 2 = 4
    // Knots / Broken Yarn: 1 + 1 + 1 + 1 + 2 + 2 = 8
    // Tears / Scratches: 1 + 1 + 1 + 1 + 1 + 1 + 1 = 7
    // Other: 1 + 1 = 2
    // Primary defects total = 26.
    // Remaining defects needed = 523 - 26 = 497 defects!
    // Remaining Holes needed = 167 - 5 = 162
    // Remaining Stains needed = 146 - 4 = 142
    // Remaining Knots needed = 115 - 8 = 107
    // Remaining Tears needed = 62 - 7 = 55
    // Remaining Other needed = 33 - 2 = 31

    const defectPool = [];
    for (let i = 0; i < 162; i++) defectPool.push({ type: 'Holes', sev: i % 2 === 0 ? 'Critical' : 'Moderate', conf: 92 });
    for (let i = 0; i < 142; i++) defectPool.push({ type: 'Stains', sev: i % 3 === 0 ? 'Moderate' : 'Low', conf: 88 });
    for (let i = 0; i < 107; i++) defectPool.push({ type: 'Broken Yarn', sev: i % 4 === 0 ? 'Moderate' : 'Low', conf: 85 });
    for (let i = 0; i < 55; i++) defectPool.push({ type: 'Weft Tears', sev: i % 2 === 0 ? 'Critical' : 'Moderate', conf: 90 });
    for (let i = 0; i < 31; i++) defectPool.push({ type: 'Other', sev: 'Low', conf: 81 });

    let defectIdx = 0;
    const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
    const fabrics = ['Egyptian Cotton', 'Kanchipuram Silk', 'Indigo Denim', 'Pure Linen Weave', 'Polyester Blend', 'Lawn Voile'];

    let seq = 1000;

    // Remaining Grade A (defect count = 0)
    for (let i = 0; i < 719; i++) {
      seq++;
      const m = months[i % months.length];
      const day = (i % 28) + 1;
      const dateStr = `${m}-${day < 10 ? '0' + day : day} 10:00:00`;
      const inspId = `INS-2024-${seq}`;

      insertInsp.run(
        inspId,
        (i % 8) + 1,
        fabrics[i % fabrics.length],
        `${fabrics[i % fabrics.length]} #${100 + (i % 500)}`,
        '/assets/kanchipuram_silk.jpg',
        dateStr,
        0,
        'A',
        'Passed',
        'Batch meets Grade A export quality specifications.',
        'Approved for packaging.',
        'FabriSense YOLOv8',
        dateStr,
        dateStr
      );
    }

    // Remaining Grade B (1 defect each until defectPool runs out, or 0-1)
    for (let i = 0; i < 380; i++) {
      seq++;
      const m = months[i % months.length];
      const day = (i % 28) + 1;
      const dateStr = `${m}-${day < 10 ? '0' + day : day} 14:00:00`;
      const inspId = `INS-2024-${seq}`;
      const hasDefect = defectIdx < 360; // assign defect to first 360 Grade B rolls
      const dCount = hasDefect ? 1 : 0;

      insertInsp.run(
        inspId,
        (i % 8) + 1,
        fabrics[i % fabrics.length],
        `${fabrics[i % fabrics.length]} #${100 + (i % 500)}`,
        '/assets/indigo_denim.jpg',
        dateStr,
        dCount,
        'B',
        i % 4 === 0 ? 'Review' : 'Passed',
        'Batch meets standard Grade B tolerances.',
        'Proceed with garment processing.',
        'FabriSense YOLOv8',
        dateStr,
        dateStr
      );

      if (hasDefect && defectIdx < defectPool.length) {
        const d = defectPool[defectIdx++];
        insertDefect.run(
          inspId,
          d.type,
          d.conf,
          d.sev,
          20 + (i % 50),
          20 + ((i * 3) % 50),
          25,
          22,
          `Detected ${d.type}`,
          'Inspect area',
          dateStr
        );
      }
    }

    // Remaining Grade C (multiple defects from remaining defectPool)
    for (let i = 0; i < 135; i++) {
      seq++;
      const m = months[i % months.length];
      const day = (i % 28) + 1;
      const dateStr = `${m}-${day < 10 ? '0' + day : day} 16:30:00`;
      const inspId = `INS-2024-${seq}`;

      // Distribute remaining defects across Grade C inspections
      const defectsForThis = [];
      const count = (defectIdx < defectPool.length) ? Math.min(3, defectPool.length - defectIdx) : 0;
      for (let c = 0; c < count; c++) {
        if (defectIdx < defectPool.length) {
          defectsForThis.push(defectPool[defectIdx++]);
        }
      }

      insertInsp.run(
        inspId,
        (i % 8) + 1,
        fabrics[i % fabrics.length],
        `${fabrics[i % fabrics.length]} #${100 + (i % 500)}`,
        '/assets/indigo_denim.jpg',
        dateStr,
        defectsForThis.length || 1,
        'C',
        'Failed',
        'Critical weave anomalies detected exceeding threshold.',
        'Reject roll section.',
        'FabriSense YOLOv8',
        dateStr,
        dateStr
      );

      for (const d of defectsForThis) {
        insertDefect.run(
          inspId,
          d.type,
          d.conf,
          d.sev,
          15 + (i % 60),
          15 + ((i * 2) % 60),
          28,
          24,
          `Critical ${d.type} detected`,
          'Reject',
          dateStr
        );
      }
    }

    // Assign any leftover pool items to the last Grade C inspections
    while (defectIdx < defectPool.length) {
      const d = defectPool[defectIdx++];
      insertDefect.run(
        'INS-2024-0043',
        d.type,
        d.conf,
        d.sev,
        30,
        30,
        20,
        20,
        `Defect ${d.type}`,
        'Rework',
        '2026-09-04 11:15:00'
      );
    }

    // 6. Model info
    const insertModel = database.prepare(`
      INSERT INTO model_info (
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

    // 7. Settings
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
  });

  seedTransaction();
  console.log('[FabriSense DB] 1,247 inspections and 523 defects seeded successfully.');
}

export default db;
