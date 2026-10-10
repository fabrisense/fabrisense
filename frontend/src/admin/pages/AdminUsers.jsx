import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  X,
  Mail,
  Phone,
  Shield,
  Key,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  fetchUsers,
  createUserApi,
  updateUserApi,
  updateUserStatusApi,
} from '../../services/adminApi';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null if adding
  const [viewingUser, setViewingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'inspector',
    status: 'active',
    password: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({
        search,
        role: roleFilter === 'all' ? '' : roleFilter,
        status: statusFilter === 'all' ? '' : statusFilter,
      });
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Unable to retrieve users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'inspector',
      status: 'active',
      password: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'inspector',
      status: user.status || 'active',
      password: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (editingUser) {
        // Update
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        const res = await updateUserApi(editingUser.id, payload);
        if (res.success) {
          setIsModalOpen(false);
          loadUsers();
        }
      } else {
        // Create
        if (!formData.name || !formData.email || !formData.password) {
          throw new Error('Name, email, and password are required.');
        }
        const res = await createUserApi(formData);
        if (res.success) {
          setIsModalOpen(false);
          loadUsers();
        }
      }
    } catch (err) {
      setModalError(err.message || 'Failed to save user.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await updateUserStatusApi(user.id, newStatus);
      if (res.success) {
        loadUsers();
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div>
      {/* ── Controls Row matching Screenshot 1 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 auto', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '9px 12px 9px 38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                backgroundColor: '#ffffff',
                width: '100%',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            />
          </div>

          {/* Role dropdown */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <option value="all">Role: All Roles</option>
              <option value="admin">Role: Admin</option>
              <option value="manager">Role: Manager</option>
              <option value="inspector">Role: Inspector</option>
            </select>
          </div>

          {/* Status dropdown */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <option value="all">Status: All Statuses</option>
              <option value="active">Status: Active Only</option>
              <option value="inactive">Status: Inactive Only</option>
            </select>
          </div>
        </div>

        {/* + Add User Button */}
        <button
          onClick={handleOpenAdd}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            backgroundColor: '#16806e',
            color: '#ffffff',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#137a68'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#16806e'; }}
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* ── Table Card Container ── */}
      {error && (
        <div className="error-banner" style={{ marginBottom: '16px' }}>
          <span>{error}</span>
          <button onClick={loadUsers} className="btn-secondary">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading-box">
          <RefreshCw size={32} className="animate-spin" color="#208c7d" />
          <div>Loading user directory...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-card empty-state">
          <Users className="empty-state-icon" />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2a44', margin: '0 0 6px' }}>
            No Users Found
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            No users match the specified criteria.
          </p>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-container" style={{ border: 'none' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>User Name</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Email</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Role</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Inspections</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Last Active</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isActive = (u.status || '').toLowerCase() === 'active';
                  const roleLower = (u.role || '').toLowerCase();
                  const roleStyle =
                    roleLower === 'admin'
                      ? { bg: '#e0f2fe', color: '#0369a1' }
                      : roleLower === 'manager'
                      ? { bg: '#f1f5f9', color: '#334155' }
                      : { bg: '#f1f5f9', color: '#334155' };

                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#e2e8f0',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : null}
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                              {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div>
                            <strong style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: '700' }}>
                              {u.name}
                            </strong>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569', fontSize: '13px' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            textTransform: 'capitalize',
                            display: 'inline-block',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ color: '#334155', fontWeight: '600', fontSize: '13.5px' }}>
                          {Number(u.inspection_count || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569', fontSize: '13px' }}>
                        {u.last_active_text || (u.last_active ? u.last_active.replace('T', ' ').slice(0, 16) : 'Never')}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: '600',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#15803d' : '#b91c1c',
                            display: 'inline-block',
                          }}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => setViewingUser(u)}
                            style={{
                              backgroundColor: '#16806e',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 14px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#137a68'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#16806e'; }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '5px 14px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View User Drawer / Modal ── */}
      {viewingUser && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1f2a44', margin: 0 }}>
                User Profile
              </h3>
              <button
                onClick={() => setViewingUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#e2e8f0',
                  flexShrink: 0,
                }}
              >
                {viewingUser.avatar_url && (
                  <img src={viewingUser.avatar_url} alt={viewingUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{viewingUser.name}</h4>
                <div style={{ color: '#64748b', fontSize: '13px' }}>{viewingUser.email}</div>
                <div style={{ marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      textTransform: 'capitalize',
                    }}
                  >
                    {viewingUser.role}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TOTAL INSPECTIONS</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1f2a44', marginTop: '4px' }}>
                  {Number(viewingUser.inspection_count || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>STATUS</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: viewingUser.status === 'active' ? '#16a34a' : '#dc2626', marginTop: '6px' }}>
                  {viewingUser.status === 'active' ? '● Active' : '○ Inactive'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setViewingUser(null);
                  navigate(`/admin/inspections?inspector=${encodeURIComponent(viewingUser.name)}`);
                }}
                className="btn-teal"
                style={{ flex: 1, padding: '10px' }}
              >
                View Inspections
              </button>
              <button
                onClick={() => {
                  const u = viewingUser;
                  setViewingUser(null);
                  handleOpenEdit(u);
                }}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Edit Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit User Modal ── */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1f2a44', margin: 0 }}>
                {editingUser ? 'Edit User Details' : 'Add New Operator / User'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="error-banner" style={{ marginBottom: '14px', padding: '10px' }}>
                <AlertCircle size={15} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser}>
              <div className="admin-form-group">
                <label className="admin-form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="admin-form-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aarav.sharma@petrosoft.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="admin-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="admin-form-input"
                  >
                    <option value="inspector">Inspector</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="admin-form-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Account Password *'}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? '••••••••' : 'Enter strong password'}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="admin-form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
