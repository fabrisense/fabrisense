import { Router } from 'express';
import { adminLogin, getAdminProfile } from '../controllers/admin.auth.controller.js';
import { getDashboardMetrics } from '../controllers/admin.dashboard.controller.js';
import {
  getInspections,
  getInspectionById,
  createInspection,
  updateInspection,
  deleteInspection,
} from '../controllers/admin.inspections.controller.js';
import { getDefects, getDefectAnalytics } from '../controllers/admin.defects.controller.js';
import { getQualityAnalytics } from '../controllers/admin.quality.controller.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
} from '../controllers/admin.users.controller.js';
import { getReports, getReportById } from '../controllers/admin.reports.controller.js';
import { getModelInfo, getSettings, updateSettings } from '../controllers/admin.system.controller.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import { uploadInspectionImage } from '../middleware/upload.middleware.js';

const router = Router();

// ── Public Auth ─────────────────────────────────────────────────────────────
router.post('/login', adminLogin);

// ── Protected Admin Endpoints ───────────────────────────────────────────────
router.use(requireAdminAuth);

// Profile
router.get('/me', getAdminProfile);

// Dashboard
router.get('/dashboard', getDashboardMetrics);

// Inspections CRUD
router.get('/inspections', getInspections);
router.get('/inspections/:id', getInspectionById);
router.post('/inspections', uploadInspectionImage.single('image'), createInspection);
router.put('/inspections/:id', updateInspection);
router.delete('/inspections/:id', deleteInspection);

// Defects & Analytics
router.get('/defects', getDefects);
router.get('/defects/analytics', getDefectAnalytics);

// Quality Analytics
router.get('/quality/analytics', getQualityAnalytics);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', updateUserStatus);

// Reports
router.get('/reports', getReports);
router.get('/reports/:id', getReportById);

// Model & System
router.get('/model', getModelInfo);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
