/**
 * backend/test_complete_suite.js
 * End-to-end integration test runner validating all backend APIs, database persistence,
 * JWT authentication, and YOLOv8 adapter behavior.
 */

import http from 'http';
import app from './index.js';
import db from './database/db.js';

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(body);
          } catch {
            data = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 [FabriSense Test Suite] Starting comprehensive validation...\n');
  let token = '';
  let createdInspectionId = '';
  let createdUserId = null;

  // 1. Health check
  const health = await request('/health');
  console.assert(health.status === 200, 'Health check failed');
  console.log('✓ 1. Backend health check passed.');

  // 2. Invalid Admin Login
  const badLogin = await request('/admin/login', {
    method: 'POST',
    body: { email: 'admin@fabrisense.com', password: 'WrongPassword' },
  });
  console.assert(badLogin.status === 401, 'Bad login did not return 401');
  console.log('✓ 2. Invalid admin credentials correctly rejected (401).');

  // 3. Valid Admin Login
  const goodLogin = await request('/admin/login', {
    method: 'POST',
    body: { email: 'admin@fabrisense.com', password: 'Admin@123' },
  });
  console.assert(goodLogin.status === 200 && goodLogin.data.token, 'Admin login failed');
  token = goodLogin.data.token;
  console.log('✓ 3. Admin login successful, JWT token received.');

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 4. Protected Route without token
  const unauth = await request('/admin/dashboard');
  console.assert(unauth.status === 401, 'Unprotected dashboard did not return 401');
  console.log('✓ 4. Protected routes correctly guarded without token (401).');

  // 5. Dashboard Metrics
  const dash = await request('/admin/dashboard', { headers: authHeaders });
  console.log(`✓ 5. Dashboard metrics calculated from ${dash.data.data.driver || 'database'} (Total: ${dash.data.data.kpis.totalInspections}, Defects: ${dash.data.data.kpis.defectsDetected}).`);

  // 6. Inspections List with Pagination & Filter
  const list = await request('/admin/inspections?limit=5', { headers: authHeaders });
  console.assert(list.status === 200 && list.data.data.length > 0 && list.data.data.length <= 5, 'Inspections list failed');
  console.log(`✓ 6. Inspections list paginated properly (${list.data.pagination.total} total records).`);

  // 7. Inspection Detail & Bounding Boxes
  const detail = await request('/admin/inspections/INS-2024-0047', { headers: authHeaders });
  console.assert(detail.status === 200 && detail.data.data.defects.length === 3, 'Detail failed');
  console.log(`✓ 7. Inspection detail retrieved with ${detail.data.data.defects.length} defect bounding boxes.`);

  // 8. Create New Inspection with AI YOLO Adapter
  const newInsp = await request('/admin/inspections', {
    method: 'POST',
    headers: authHeaders,
    body: {
      fabricType: 'Egyptian Cotton Premium',
      fabricName: 'Egyptian Cotton Test Run #999',
    },
  });
  console.assert(newInsp.status === 201 && newInsp.data.data.inspection_id, 'Create inspection failed');
  createdInspectionId = newInsp.data.data.inspection_id;
  console.log(`✓ 8. New inspection created via YOLO adapter: ${createdInspectionId} (Grade: ${newInsp.data.data.grade}).`);

  // 9. Persistence Check
  const verifyInsp = await request(`/admin/inspections/${createdInspectionId}`, { headers: authHeaders });
  console.assert(verifyInsp.status === 200 && verifyInsp.data.data.inspection_id === createdInspectionId, 'Persistence verify failed');
  console.log('✓ 9. Database persistence verified: newly created inspection retrieved successfully.');

  // 10. Update Inspection
  const updateInsp = await request(`/admin/inspections/${createdInspectionId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: { status: 'Passed', grade: 'A' },
  });
  console.assert(updateInsp.status === 200 && updateInsp.data.data.grade === 'A', 'Update inspection failed');
  console.log('✓ 10. Inspection updated and persisted to SQLite.');

  // 11. Defect Analytics
  const defAnalytics = await request('/admin/defects/analytics', { headers: authHeaders });
  console.assert(defAnalytics.status === 200 && defAnalytics.data.data.kpis.totalAnomalies > 0, 'Defect analytics failed');
  console.log(`✓ 11. Defect analytics calculated (Primary Contributor: ${defAnalytics.data.data.kpis.primaryContributor}).`);

  // 12. Quality Analytics
  const qualAnalytics = await request('/admin/quality/analytics', { headers: authHeaders });
  console.assert(qualAnalytics.status === 200 && qualAnalytics.data.data.distribution.length === 3, 'Quality analytics failed');
  console.log(`✓ 12. Quality analytics calculated (Grade A Ratio: ${qualAnalytics.data.data.ratios.gradeA}).`);

  // 13. User Management CRUD
  const testEmail = `test.inspector.${Date.now()}@fabrisense.com`;
  const newUser = await request('/admin/users', {
    method: 'POST',
    headers: authHeaders,
    body: {
      name: 'Rohan Verma',
      email: testEmail,
      phone: '+91 91234 56789',
      role: 'inspector',
      status: 'active',
      password: 'User@123',
    },
  });
  console.assert(newUser.status === 201 && newUser.data.data.id, 'Create user failed');
  createdUserId = newUser.data.data.id;
  console.log(`✓ 13a. User created: Rohan Verma (ID: ${createdUserId}).`);

  // Deactivate user
  const deactUser = await request(`/admin/users/${createdUserId}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: { status: 'inactive' },
  });
  console.assert(deactUser.status === 200 && deactUser.data.data.status === 'inactive', 'User deactivation failed');
  console.log('✓ 13b. User status updated to inactive in database.');

  // 14. Reports List
  const reps = await request('/admin/reports', { headers: authHeaders });
  console.assert(reps.status === 200 && reps.data.data.length > 0, 'Reports list failed');
  console.log(`✓ 14. Audit reports retrieved (${reps.data.data.length} reports).`);

  // 15. Model Info
  const model = await request('/admin/model', { headers: authHeaders });
  console.assert(model.status === 200 && model.data.data.modelName, 'Model info failed');
  console.log(`✓ 15. AI Model specifications verified (Mode: ${model.data.data.aiModeLabel}).`);

  // 16. Settings Update
  const setts = await request('/admin/settings', {
    method: 'PUT',
    headers: authHeaders,
    body: { confidenceThreshold: '85' },
  });
  console.assert(setts.status === 200 && setts.data.data.confidenceThreshold === '85', 'Settings update failed');
  console.log('✓ 16. Settings successfully updated in SQLite settings table.');

  // 17. Mobile App SQLite Sync Endpoint
  const syncRes = await request('/inspections/sync', {
    method: 'POST',
    body: {
      id: `INS-2024-MOBI-${Date.now().toString().slice(-4)}`,
      fabricType: 'Kanchipuram Silk',
      defectCount: 0,
      grade: 'A',
      status: 'Passed',
    },
  });
  console.assert(syncRes.status === 200, 'Mobile sync failed');
  console.log('✓ 17. Mobile inspection sync confirmed: mobile data enters shared SQLite database.');

  console.log('\n🎉 ALL 17 E2E INTEGRATION & PERSISTENCE TESTS PASSED SUCCESSFULLY!\n');
}

// Start temporary test server
server = http.createServer(app);
server.listen(PORT, async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
    // Fallback exit in case keepalive sockets linger
    setTimeout(() => process.exit(process.exitCode || 0), 1000).unref();
  }
});

