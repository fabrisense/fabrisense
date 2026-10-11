import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  AlertCircle,
  Award,
  Users,
  FileText,
  Cpu,
  Settings,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { getAdminUser, clearAdminAuth } from '../../services/adminApi';

const NAV_ITEMS = [
  { path: '/admin/dashboard',   label: 'Dashboard',         icon: LayoutDashboard },
  { path: '/admin/inspections', label: 'Inspections',       icon: ClipboardCheck },
  { path: '/admin/defects',     label: 'Defects',           icon: AlertCircle },
  { path: '/admin/quality',     label: 'Quality Analytics', icon: Award },
  { path: '/admin/users',       label: 'Users',             icon: Users },
  { path: '/admin/reports',     label: 'Reports',           icon: FileText },
  { path: '/admin/model',       label: 'Model / System',    icon: Cpu },
  { path: '/admin/settings',    label: 'Settings',          icon: Settings },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const adminUser = getAdminUser() || {
    name: 'Rajesh Kumar',
    email: 'admin@fabrisense.com',
    role: 'Operations Manager',
  };

  const handleLogout = () => {
    clearAdminAuth();
    navigate('/admin/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/inspections?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Determine current page title matching reference screenshots
  let pageTitle = 'Operations Overview';
  if (location.pathname === '/admin/dashboard') {
    pageTitle = 'Operations Overview';
  } else if (location.pathname === '/admin/inspections') {
    pageTitle = 'Inspection Logs';
  } else if (location.pathname.startsWith('/admin/inspections/')) {
    const parts = location.pathname.split('/');
    pageTitle = `Inspection Detail • ${parts[parts.length - 1] || 'INS-2024-0047'}`;
  } else if (location.pathname.startsWith('/admin/defects')) {
    pageTitle = 'Defect Analytics Portal';
  } else if (location.pathname.startsWith('/admin/quality')) {
    pageTitle = 'Quality Analytics';
  } else if (location.pathname.startsWith('/admin/users')) {
    pageTitle = 'User Management';
  } else if (location.pathname.startsWith('/admin/reports')) {
    pageTitle = 'Quality Reports Panel';
  } else if (location.pathname.startsWith('/admin/model')) {
    pageTitle = 'AI Model Status & System Specs';
  } else if (location.pathname.startsWith('/admin/settings')) {
    pageTitle = 'Settings';
  }

  return (
    <div className="admin-root">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <div className="admin-brand-icon">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <div className="admin-brand-title">FabriSense</div>
              <div className="admin-brand-subtitle">ADMIN PORTAL</div>
            </div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `admin-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Link back to Mobile Inspection Interface */}
        <div style={{ padding: '0 14px 14px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '12.5px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            title="Open Mobile Inspector Screen"
          >
            <span>Mobile App View</span>
            <ExternalLink size={14} />
          </button>
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-system-status">
            <span className="pulse-dot" />
            <span>SYSTEM ONLINE</span>
          </div>
          <div className="admin-system-version">Inspection Engine v4.2.1</div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              className="admin-icon-btn"
              style={{ display: 'none' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="admin-header-title">{pageTitle}</h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="admin-header-search">
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search anything..."
              className="admin-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="admin-header-right">
            <button className="admin-icon-btn" title="System Notifications">
              <Bell size={18} />
              <span className="badge-dot" />
            </button>

            {/* Admin Profile Pill */}
            <div style={{ position: 'relative' }}>
              <div
                className="admin-profile-pill"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="admin-avatar" style={{ overflow: 'hidden', position: 'relative' }}>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"
                    alt={adminUser.name || 'Rajesh Kumar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span style={{ position: 'absolute' }}>
                    {adminUser.name
                      ? adminUser.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : 'RK'}
                  </span>
                </div>
                <div className="admin-user-info">
                  <div className="admin-user-name">{adminUser.name}</div>
                  <div className="admin-user-role">
                    {adminUser.role === 'admin'
                      ? 'Administrator'
                      : adminUser.role || 'Operations Manager'}
                  </div>
                </div>
                <ChevronDown size={14} color="#64748b" />
              </div>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    width: '200px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    padding: '8px',
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#64748b',
                      borderBottom: '1px solid #f1f5f9',
                      marginBottom: '6px',
                    }}
                  >
                    Signed in as <br />
                    <strong style={{ color: '#1e293b' }}>{adminUser.email}</strong>
                  </div>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/admin/settings');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      fontSize: '13px',
                      color: '#334155',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Settings size={14} /> Account Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      fontSize: '13px',
                      color: '#ef4444',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginTop: '4px',
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
