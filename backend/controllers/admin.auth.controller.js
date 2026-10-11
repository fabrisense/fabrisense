import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';

/**
 * POST /api/admin/login
 */
export function adminLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both email and password.',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const admin = db.prepare('SELECT * FROM admins WHERE LOWER(email) = ?').get(cleanEmail);

  if (!admin) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.',
    });
  }

  if (admin.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'This administrator account is deactivated. Contact system support.',
    });
  }

  const isMatch = bcrypt.compareSync(password, admin.password_hash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.',
    });
  }

  // Update last login
  const now = new Date().toISOString();
  db.prepare('UPDATE admins SET last_login = ? WHERE id = ?').run(now, admin.id);

  // Generate JWT token
  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({
    success: true,
    message: 'Authentication successful.',
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: now,
    },
  });
}

/**
 * GET /api/admin/me
 */
export function getAdminProfile(req, res) {
  if (!req.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  return res.json({
    success: true,
    admin: req.admin,
  });
}
