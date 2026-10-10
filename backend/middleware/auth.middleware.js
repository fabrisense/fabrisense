import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import db from '../database/db.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../services/supabase.service.js';

/**
 * Middleware to protect admin routes requiring valid JWT authentication
 * Supports both Supabase Cloud Auth tokens and developer fallback JWT tokens.
 */
export async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  // 1. Try Supabase Cloud token validation if configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data: { user }, error: sbErr } = await supabase.auth.getUser(token);
        if (!sbErr && user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile && profile.status === 'active') {
            req.admin = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              status: profile.status,
            };
            req.user = req.admin;
            return next();
          }
        }
      } catch (_e) {
        // Fall through to developer JWT check
      }
    }
  }

  // 2. Developer / Standard JWT check (ensures full test suite & local stability)
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if admin still exists and is active
    const admin = db.prepare('SELECT id, name, email, role, status FROM admins WHERE id = ?').get(decoded.id);
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Admin account not found or deactivated.',
      });
    }

    req.admin = admin;
    req.user = admin;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please sign in again.',
    });
  }
}
