import bcrypt from 'bcryptjs';
import db from '../database/db.js';

function formatRelativeTime(dateStr) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs)) return 'Recently';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  } catch (_e) {
    return 'Recently';
  }
}

/**
 * GET /api/admin/users
 * List users with inspection count, search, and filtering
 */
export function getUsers(req, res) {
  try {
    const { search = '', role = '', status = '' } = req.query;

    const conditions = ['1=1'];
    const params = [];

    if (search.trim()) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (role && role !== 'all') {
      conditions.push('LOWER(u.role) = LOWER(?)');
      params.push(role);
    }

    if (status && status !== 'all') {
      // Support 'active' or 'Active Only'
      const normStatus = status.toLowerCase().includes('active') && !status.toLowerCase().includes('inactive') ? 'active' : status.toLowerCase();
      conditions.push('LOWER(u.status) = LOWER(?)');
      params.push(normStatus);
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.created_at,
        u.last_active,
        COUNT(i.id) as inspection_count
      FROM users u
      LEFT JOIN inspections i ON u.id = i.user_id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY u.id ASC
    `;

    const users = db.prepare(sql).all(...params);

    const enrichedUsers = users.map(u => {
      return {
        ...u,
        inspection_count: u.inspection_count || 0,
        last_active_text: u.last_active ? formatRelativeTime(u.last_active) : 'Never',
        avatar_url: u.avatar_url || null,
      };
    });

    return res.json({
      success: true,
      data: enrichedUsers,
    });
  } catch (error) {
    console.error('[Get Users Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
  }
}

/**
 * GET /api/admin/users/:id
 */
export function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.created_at,
        u.last_active,
        COUNT(i.id) as inspection_count
      FROM users u
      LEFT JOIN inspections i ON u.id = i.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('[Get User By Id Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user details.' });
  }
}

/**
 * POST /api/admin/users
 * Create user with hashed password
 */
export function createUser(req, res) {
  try {
    const { name, email, phone = '', role = 'inspector', status = 'active', password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: 'A user with this email already exists.' });
    }

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO users (name, email, phone, role, status, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      cleanEmail,
      phone.trim(),
      (role || 'inspector').toLowerCase(),
      (status || 'active').toLowerCase(),
      now,
      now
    );

    // If role is admin or manager, optionally create in admins table too so they can sign in to admin portal
    if (['admin', 'manager'].includes(role.toLowerCase()) && password) {
      const existingAdmin = db.prepare('SELECT id FROM admins WHERE LOWER(email) = ?').get(cleanEmail);
      if (!existingAdmin) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        db.prepare(`
          INSERT INTO admins (name, email, password_hash, role, status, created_at, updated_at, last_login)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name.trim(), cleanEmail, hash, role.toLowerCase(), 'active', now, now, now);
      }
    }

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        ...newUser,
        inspection_count: 0,
      },
    });
  } catch (error) {
    console.error('[Create User Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to create user.' });
  }
}

/**
 * PUT /api/admin/users/:id
 */
export function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status } = req.body;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : existing.email;

    // Check duplicate email
    if (cleanEmail !== existing.email) {
      const duplicate = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(cleanEmail, id);
      if (duplicate) {
        return res.status(409).json({ success: false, error: 'Another user with this email already exists.' });
      }
    }

    db.prepare(`
      UPDATE users
      SET 
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      cleanEmail,
      phone !== undefined ? phone.trim() : null,
      role ? role.toLowerCase() : null,
      status ? status.toLowerCase() : null,
      id
    );

    const updated = db.prepare(`
      SELECT 
        u.*,
        COUNT(i.id) as inspection_count
      FROM users u
      LEFT JOIN inspections i ON u.id = i.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(id);

    return res.json({
      success: true,
      message: 'User updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('[Update User Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to update user.' });
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Activate or deactivate user
 */
export function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Status must be either 'active' or 'inactive'.",
      });
    }

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status.toLowerCase(), id);

    // Also update in admins table if present
    db.prepare('UPDATE admins SET status = ? WHERE LOWER(email) = ?').run(status.toLowerCase(), existing.email.toLowerCase());

    const updated = db.prepare(`
      SELECT 
        u.*,
        COUNT(i.id) as inspection_count
      FROM users u
      LEFT JOIN inspections i ON u.id = i.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(id);

    return res.json({
      success: true,
      message: `User status changed to ${status}.`,
      data: updated,
    });
  } catch (error) {
    console.error('[Update User Status Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to update user status.' });
  }
}
