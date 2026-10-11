import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAdminToken } from '../../services/adminApi';
import { AdminLayout } from './AdminLayout';

export function AdminProtectedRoute() {
  const token = getAdminToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <AdminLayout />;
}

export default AdminProtectedRoute;
