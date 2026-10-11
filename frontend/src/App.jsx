import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MobileApp } from './components/MobileApp';
import { AdminLogin } from './admin/pages/AdminLogin';
import { AdminProtectedRoute } from './admin/components/AdminProtectedRoute';
import { AdminDashboard } from './admin/pages/AdminDashboard';
import { AdminInspections } from './admin/pages/AdminInspections';
import { AdminInspectionDetail } from './admin/pages/AdminInspectionDetail';
import { AdminDefects } from './admin/pages/AdminDefects';
import { AdminQuality } from './admin/pages/AdminQuality';
import { AdminUsers } from './admin/pages/AdminUsers';
import { AdminReports } from './admin/pages/AdminReports';
import { AdminModel } from './admin/pages/AdminModel';
import { AdminSettings } from './admin/pages/AdminSettings';
import './admin.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Admin Portal Public Authentication ── */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── Admin Portal Protected Routes ── */}
        <Route path="/admin" element={<AdminProtectedRoute />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="inspections" element={<AdminInspections />} />
          <Route path="inspections/:id" element={<AdminInspectionDetail />} />
          <Route path="defects" element={<AdminDefects />} />
          <Route path="quality" element={<AdminQuality />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="model" element={<AdminModel />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* ── User / Mobile Application (Preserved Intact) ── */}
        <Route path="/" element={<MobileApp />} />
        <Route path="/mobile/*" element={<MobileApp />} />
        <Route path="*" element={<MobileApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
