import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ClipboardList, AlertTriangle, TrendingUp, Users,
  FileText, Cpu, Settings, Search, Plus, Bell, ChevronRight, X,
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Eye, Download, LogOut,
  Filter, Calendar, RefreshCw
} from 'lucide-react';

/* ── Initial Mock Data based on exact reference image ── */
const INITIAL_STATS = {
  totalInspections: 1247,
  totalInspectionsWeeklyChange: '+12% this week',
  defectsDetected: 523,
  anomalyRate: '42.1% anomaly rate',
  defectFree: 724,
  cleanRate: '57.9% clean rate',
  gradeA: { percentage: 58, batches: 723 },
  gradeB: { percentage: 31, batches: 386 },
  gradeC: { percentage: 11, batches: 137 },
};

const INITIAL_RECENT_INSPECTIONS = [
  { id: 'INS-0406', fabric: 'Kanchipuram Silk #394', defects: 0, grade: 'Grade A', status: 'Passed', inspector: 'Rajesh Kumar', date: 'Sep 5, 2024 10:15 AM' },
  { id: 'INS-0407', fabric: 'Indigo Denim #303', defects: 2, grade: 'Grade B', status: 'Passed', inspector: 'Anil Mehta', date: 'Sep 5, 2024 09:42 AM' },
  { id: 'INS-0496', fabric: 'Egyptian Cotton #102', defects: 5, grade: 'Grade C', status: 'Failed', inspector: 'Meera Sen', date: 'Sep 4, 2024 05:12 PM' },
  { id: 'INS-0405', fabric: 'Pure Linen #09', defects: 1, grade: 'Grade B', status: 'Passed', inspector: 'Rajesh Kumar', date: 'Sep 4, 2024 02:30 PM' },
  { id: 'INS-0404', fabric: 'Lawn Voile Premium #12', defects: 0, grade: 'Grade A', status: 'Passed', inspector: 'Anil Mehta', date: 'Sep 4, 2024 11:15 AM' },
];

const INITIAL_INSPECTION_LOGS = [
  { id: 'INS-2024-0047', date: 'Sep 5, 2024 10:15 AM', inspector: 'Rajesh Kumar', fabric: 'Egyptian Cotton Premium #102', defects: 3, grade: 'Grade B', status: 'Review' },
  { id: 'INS-2024-0046', date: 'Sep 5, 2024 09:42 AM', inspector: 'Anil Mehta', fabric: 'Kanchipuram Silk #394', defects: 0, grade: 'Grade A', status: 'Passed' },
  { id: 'INS-2024-0045', date: 'Sep 4, 2024 05:12 PM', inspector: 'Meera Sen', fabric: 'Indigo Denim #303', defects: 2, grade: 'Grade B', status: 'Passed' },
  { id: 'INS-2024-0044', date: 'Sep 4, 2024 02:30 PM', inspector: 'Rajesh Kumar', fabric: 'Pure Linen Premium #09', defects: 1, grade: 'Grade B', status: 'Passed' },
  { id: 'INS-2024-0043', date: 'Sep 4, 2024 11:15 AM', inspector: 'Anil Mehta', fabric: 'Polyester Blend Yarn #81', defects: 8, grade: 'Grade C', status: 'Failed' },
  { id: 'INS-2024-0042', date: 'Sep 4, 2024 09:05 AM', inspector: 'Meera Sen', fabric: 'Lawn Voile Premium #12', defects: 0, grade: 'Grade A', status: 'Passed' },
  { id: 'INS-2024-0041', date: 'Sep 3, 2024 04:50 PM', inspector: 'Rajesh Kumar', fabric: 'Kanchipuram Silk Special', defects: 1, grade: 'Grade B', status: 'Passed' },
  { id: 'INS-2024-0040', date: 'Sep 3, 2024 02:15 PM', inspector: 'Anil Mehta', fabric: 'Egyptian Cotton #088', defects: 11, grade: 'Grade C', status: 'Failed' },
];

const LIVE_DEFECTS = [
  { name: 'Slub Knot', fabric: 'Kanchipuram Silk #102', time: '2m ago', severity: 'Critical' },
  { name: 'Broken Weft', fabric: 'Indigo Denim #303', time: '14m ago', severity: 'Moderate' },
  { name: 'Oil Stain', fabric: 'Egyptian Cotton #09', time: '45m ago', severity: 'Low' },
];

const DEFECT_DISTRIBUTION = [
  { type: 'Holes', percentage: 32, color: '#ef4444' },
  { type: 'Stains', percentage: 28, color: '#f59e0b' },
  { type: 'Broken Yarn', percentage: 22, color: '#3b82f6' },
  { type: 'Tears & Scratches', percentage: 12, color: '#10b981' },
  { type: 'Other', percentage: 6, color: '#8b5cf6' },
];

export function AdminDashboard({ userData = {}, onLogout }) {
  const [activeNav, setActiveNav] = useState('dashboard'); // 'dashboard' | 'inspections' | 'defects' | 'analytics' | 'users' | 'reports' | 'settings'
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [stats, setStats] = useState(INITIAL_STATS);
  const [inspectionLogs, setInspectionLogs] = useState(INITIAL_INSPECTION_LOGS);
  const [recentInspections, setRecentInspections] = useState(INITIAL_RECENT_INSPECTIONS);

  // Filters for Inspections Log page
  const [gradeFilter, setGradeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);

  // Add Data Form State
  const [newFabric, setNewFabric] = useState('');
  const [newInspector, setNewInspector] = useState('Rajesh Kumar');
  const [newDefects, setNewDefects] = useState('0');
  const [newGrade, setNewGrade] = useState('Grade A');
  const [newStatus, setNewStatus] = useState('Passed');

  const handleAddInspectionSubmit = (e) => {
    e.preventDefault();
    if (!newFabric.trim()) return;

    const newId = `INS-2024-0${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
                    ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newEntry = {
      id: newId,
      date: dateStr,
      inspector: newInspector,
      fabric: newFabric.trim(),
      defects: parseInt(newDefects, 10) || 0,
      grade: newGrade,
      status: newStatus,
    };

    setInspectionLogs(prev => [newEntry, ...prev]);
    setRecentInspections(prev => [newEntry, ...prev.slice(0, 4)]);

    // Update stats
    setStats(prev => ({
      ...prev,
      totalInspections: prev.totalInspections + 1,
      defectsDetected: parseInt(newDefects, 10) > 0 ? prev.defectsDetected + 1 : prev.defectsDetected,
      defectFree: parseInt(newDefects, 10) === 0 ? prev.defectFree + 1 : prev.defectFree,
    }));

    // Reset form
    setNewFabric('');
    setNewDefects('0');
    setShowAddModal(false);
  };

  // Filtered Logs
  const filteredLogs = inspectionLogs.filter(log => {
    const matchesSearch =
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.fabric.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.inspector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'All' || log.grade === gradeFilter;
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#070d19',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >

      {/* ════════════════════════════════════════════════════════════════
          1. TOP APP BAR
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          padding: '14px 16px 10px',
          backgroundColor: '#0a1428',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo & Portal Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
              }}
            >
              <Cpu size={16} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
                FabriSense
              </span>
              <span
                style={{
                  fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em',
                  color: '#60a5fa', backgroundColor: 'rgba(37,99,235,0.2)',
                  padding: '2px 6px', borderRadius: '4px', marginLeft: '6px',
                  textTransform: 'uppercase',
                }}
              >
                ADMIN
              </span>
            </div>
          </div>

          {/* Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 12px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700',
                cursor: 'pointer', boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
              }}
            >
              <Plus size={14} /> Add Data
            </button>
            <button
              onClick={onLogout}
              title="Logout"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94a3b8', cursor: 'pointer',
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* System Online Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span>SYSTEM ONLINE • Engine v2.23</span>
          </div>
          <span>Admin: {userData?.name || 'Rajesh Kumar'}</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          2. SCROLLABLE HORIZONTAL NAVIGATION TABS
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: '#091224',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'auto',
          flexShrink: 0,
          scrollbarWidth: 'none',
        }}
      >
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inspections', label: 'Inspections', icon: ClipboardList },
          { id: 'defects', label: 'Defects', icon: AlertTriangle },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeNav === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveNav(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '18px',
                border: isActive ? '1px solid rgba(37,99,235,0.5)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(37,99,235,0.2)' : 'transparent',
                color: isActive ? '#60a5fa' : '#94a3b8',
                fontSize: '0.78rem', fontWeight: isActive ? '700' : '600',
                whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          3. MAIN SCROLLABLE CONTENT (VERTICAL MOBILE SCROLL)
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >

        {/* ──────────────────────────────────────────────────────────────
            NAV VIEW 1: DASHBOARD (Operations Overview)
        ────────────────────────────────────────────────────────────── */}
        {activeNav === 'dashboard' && (
          <>
            {/* Title Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Operations Overview
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Real-time fabric inspection analytics
                </p>
              </div>

              {/* Search Bar */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: '#0d1a32', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', padding: '6px 10px', width: '130px',
                }}
              >
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: '#f8fafc', fontSize: '0.75rem', width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Stat Cards Grid (Exact data from reference image) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Card 1: Total Inspections */}
              <div style={cardStyle}>
                <span style={cardLabel}>TOTAL INSPECTIONS</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: '4px 0 2px' }}>
                  {stats.totalInspections.toLocaleString()}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700' }}>
                  {stats.totalInspectionsWeeklyChange}
                </span>
              </div>

              {/* Card 2: Defects Detected */}
              <div style={cardStyle}>
                <span style={cardLabel}>DEFECTS DETECTED</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444', margin: '4px 0 2px' }}>
                  {stats.defectsDetected}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: '600' }}>
                  {stats.anomalyRate}
                </span>
              </div>

              {/* Card 3: Defect-Free */}
              <div style={cardStyle}>
                <span style={cardLabel}>DEFECT-FREE</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981', margin: '4px 0 2px' }}>
                  {stats.defectFree}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: '600' }}>
                  {stats.cleanRate}
                </span>
              </div>

              {/* Card 4: Grade Breakdown */}
              <div style={cardStyle}>
                <span style={cardLabel}>QUALITY GRADES</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#10b981', fontWeight: '700' }}>Grade A</span>
                    <span style={{ color: '#ffffff', fontWeight: '700' }}>{stats.gradeA.percentage}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>Grade B</span>
                    <span style={{ color: '#ffffff', fontWeight: '700' }}>{stats.gradeB.percentage}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: '700' }}>Grade C</span>
                    <span style={{ color: '#ffffff', fontWeight: '700' }}>{stats.gradeC.percentage}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inspection Trends (6 Months Line Graph) */}
            <div style={sectionCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Inspection Trends (6 Months)
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: '700' }}>Apr – Sep</span>
              </div>

              {/* Line Graph SVG */}
              <div style={{ width: '100%', height: '110px', position: 'relative' }}>
                <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

                  {/* Area fill */}
                  <polygon points="10,65 60,55 110,68 160,35 210,42 280,18 280,95 10,95" fill="url(#trendGrad)" />

                  {/* Trend line */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="10,65 60,55 110,68 160,35 210,42 280,18"
                  />

                  {/* Points */}
                  <circle cx="10" cy="65" r="3" fill="#3b82f6" />
                  <circle cx="60" cy="55" r="3" fill="#3b82f6" />
                  <circle cx="110" cy="68" r="3" fill="#3b82f6" />
                  <circle cx="160" cy="35" r="3" fill="#3b82f6" />
                  <circle cx="210" cy="42" r="3" fill="#3b82f6" />
                  <circle cx="280" cy="18" r="4" fill="#60a5fa" stroke="#ffffff" strokeWidth="1.5" />
                </svg>

                {/* X Axis Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', color: '#64748b' }}>
                  <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
                </div>
              </div>
            </div>

            {/* Defect Distribution (Donut Chart) */}
            <div style={sectionCardStyle}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: '800', margin: '0 0 12px 0', color: '#ffffff' }}>
                Defect Distribution
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Donut Chart SVG */}
                <div style={{ width: '90px', height: '90px', flexShrink: 0, position: 'relative' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="4.5" strokeDasharray="32 68" strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray="28 72" strokeDashoffset="-32" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="4.5" strokeDasharray="22 78" strokeDashoffset="-60" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="4.5" strokeDasharray="12 88" strokeDashoffset="-82" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8b5cf6" strokeWidth="4.5" strokeDasharray="6 94" strokeDashoffset="-94" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff' }}>523</span>
                    <span style={{ fontSize: '0.55rem', color: '#64748b' }}>Defects</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {DEFECT_DISTRIBUTION.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color }} />
                        <span style={{ color: '#cbd5e1' }}>{item.type}</span>
                      </div>
                      <span style={{ color: '#ffffff', fontWeight: '700' }}>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Defects List */}
            <div style={sectionCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Live Defects
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: '700' }}>● Realtime Feed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {LIVE_DEFECTS.map((defect, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px', borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{defect.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{defect.fabric}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.62rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                          backgroundColor: defect.severity === 'Critical' ? 'rgba(239,68,68,0.2)' : defect.severity === 'Moderate' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                          color: defect.severity === 'Critical' ? '#ef4444' : defect.severity === 'Moderate' ? '#f59e0b' : '#10b981',
                        }}
                      >
                        {defect.severity}
                      </span>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px' }}>{defect.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Inspections Cards */}
            <div style={sectionCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Recent Inspections
                </h3>
                <span onClick={() => setActiveNav('inspections')} style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: '700', cursor: 'pointer' }}>
                  View All →
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentInspections.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedInspection(item)}
                    style={{
                      padding: '10px', borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#3b82f6' }}>{item.id}</div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{item.fabric}</div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: item.grade === 'Grade A' ? '#10b981' : item.grade === 'Grade B' ? '#f59e0b' : '#ef4444' }}>
                          {item.grade}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{item.defects} defects</div>
                      </div>
                      <ChevronRight size={14} color="#64748b" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ──────────────────────────────────────────────────────────────
            NAV VIEW 2: INSPECTIONS LOGS (Exact admin-inspections format)
        ────────────────────────────────────────────────────────────── */}
        {activeNav === 'inspections' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Inspection Logs
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Showing {filteredLogs.length} entries
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 10px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none', color: '#ffffff', fontSize: '0.72rem', fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> New
              </button>
            </div>

            {/* Search Input */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: '#0d1a32', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', padding: '8px 12px', width: '100%',
              }}
            >
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search ID, inspector, fabric..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: '#f8fafc', fontSize: '0.82rem', width: '100%',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['All', 'Grade A', 'Grade B', 'Grade C'].map(g => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  style={{
                    padding: '5px 12px', borderRadius: '16px',
                    border: gradeFilter === g ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: gradeFilter === g ? 'rgba(37,99,235,0.2)' : 'transparent',
                    color: gradeFilter === g ? '#60a5fa' : '#94a3b8',
                    fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {g}
                </button>
              ))}

              {['All', 'Passed', 'Review', 'Failed'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '5px 12px', borderRadius: '16px',
                    border: statusFilter === s ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: statusFilter === s ? 'rgba(37,99,235,0.2)' : 'transparent',
                    color: statusFilter === s ? '#60a5fa' : '#94a3b8',
                    fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Status: {s}
                </button>
              ))}
            </div>

            {/* Inspection Logs Cards List (Mobile Table Equivalent) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLogs.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px', borderRadius: '14px',
                    backgroundColor: '#0d1a32', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                  }}
                >
                  {/* Top Row: ID, Grade, Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#60a5fa' }}>{item.id}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: item.grade === 'Grade A' ? 'rgba(16,185,129,0.18)' : item.grade === 'Grade B' ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)',
                          color: item.grade === 'Grade A' ? '#34d399' : item.grade === 'Grade B' ? '#fbbf24' : '#f87171',
                          border: `1px solid ${item.grade === 'Grade A' ? 'rgba(16,185,129,0.3)' : item.grade === 'Grade B' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}
                      >
                        {item.grade}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: item.status === 'Passed' ? 'rgba(16,185,129,0.1)' : item.status === 'Review' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: item.status === 'Passed' ? '#10b981' : item.status === 'Review' ? '#f59e0b' : '#ef4444',
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Fabric & Inspector */}
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{item.fabric}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                    <span>Inspector: <strong style={{ color: '#cbd5e1' }}>{item.inspector}</strong></span>
                    <span>Defects: <strong style={{ color: item.defects > 0 ? '#f87171' : '#34d399' }}>{item.defects}</strong></span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569' }}>{item.date}</div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      onClick={() => setSelectedInspection(item)}
                      style={{
                        flex: 1, padding: '6px', borderRadius: '8px',
                        backgroundColor: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.35)',
                        color: '#60a5fa', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      }}
                    >
                      <Eye size={12} /> View Details
                    </button>
                    <button
                      style={{
                        flex: 1, padding: '6px', borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#cbd5e1', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      }}
                    >
                      <Download size={12} /> Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ──────────────────────────────────────────────────────────────
            NAV VIEW 3-7: DEFECTS, ANALYTICS, USERS, REPORTS, SETTINGS
        ────────────────────────────────────────────────────────────── */}
        {activeNav !== 'dashboard' && activeNav !== 'inspections' && (
          <div
            style={{
              padding: '32px 16px', textAlign: 'center', display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px', height: '56px', borderRadius: '18px',
                backgroundColor: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa',
              }}
            >
              {activeNav === 'defects' && <AlertTriangle size={24} />}
              {activeNav === 'analytics' && <TrendingUp size={24} />}
              {activeNav === 'users' && <Users size={24} />}
              {activeNav === 'reports' && <FileText size={24} />}
              {activeNav === 'settings' && <Settings size={24} />}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, textTransform: 'capitalize' }}>
              {activeNav} Portal
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '240px', margin: 0 }}>
              Live data synced with Admin Portal. Select Dashboard or Inspections to view operations logs.
            </p>
            <button
              onClick={() => setActiveNav('dashboard')}
              style={{
                marginTop: '8px', padding: '8px 18px', borderRadius: '20px',
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
              }}
            >
              Return to Dashboard
            </button>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════
          4. ADD DATA MODAL (BOTTOM SHEET)
      ════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%', backgroundColor: '#0d1a32',
              borderRadius: '24px 24px 0 0', borderTop: '1px solid rgba(255,255,255,0.12)',
              padding: '20px 16px 28px', display: 'flex', flexDirection: 'column', gap: '14px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                Add New Inspection Data
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddInspectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={formLabelStyle}>Fabric Name &amp; Code</label>
                <input
                  type="text"
                  placeholder="e.g. Kanchipuram Silk #501"
                  value={newFabric}
                  onChange={e => setNewFabric(e.target.value)}
                  style={formInputStyle}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={formLabelStyle}>Inspector</label>
                  <input
                    type="text"
                    value={newInspector}
                    onChange={e => setNewInspector(e.target.value)}
                    style={formInputStyle}
                  />
                </div>
                <div>
                  <label style={formLabelStyle}>Defect Count</label>
                  <input
                    type="number"
                    min="0"
                    value={newDefects}
                    onChange={e => setNewDefects(e.target.value)}
                    style={formInputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={formLabelStyle}>Quality Grade</label>
                  <select
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    style={formInputStyle}
                  >
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                    <option value="Grade C">Grade C</option>
                  </select>
                </div>
                <div>
                  <label style={formLabelStyle}>Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    style={formInputStyle}
                  >
                    <option value="Passed">Passed</option>
                    <option value="Review">Review</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%', padding: '12px', marginTop: '6px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none', borderRadius: '12px', color: '#ffffff',
                  fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                }}
              >
                Save Inspection Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          5. INSPECTION DETAIL MODAL
      ════════════════════════════════════════════════════════════════ */}
      {selectedInspection && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%', backgroundColor: '#0d1a32', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.12)', padding: '18px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#60a5fa' }}>
                {selectedInspection.id}
              </span>
              <button
                onClick={() => setSelectedInspection(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff' }}>
              {selectedInspection.fabric}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
              <div>Inspector: <strong style={{ color: '#ffffff' }}>{selectedInspection.inspector}</strong></div>
              <div>Grade: <strong style={{ color: selectedInspection.grade === 'Grade A' ? '#10b981' : '#f59e0b' }}>{selectedInspection.grade}</strong></div>
              <div>Defects: <strong style={{ color: selectedInspection.defects > 0 ? '#ef4444' : '#10b981' }}>{selectedInspection.defects}</strong></div>
              <div>Status: <strong style={{ color: '#ffffff' }}>{selectedInspection.status}</strong></div>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Recorded on {selectedInspection.date}</div>

            <button
              onClick={() => setSelectedInspection(null)}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              Close Record
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#0d1a32',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  padding: '10px 12px',
};

const sectionCardStyle = {
  backgroundColor: '#0d1a32',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '12px',
};

const cardLabel = {
  fontSize: '0.62rem',
  fontWeight: '800',
  letterSpacing: '0.06em',
  color: '#64748b',
};

const formLabelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#cbd5e1',
  marginBottom: '4px',
};

const formInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#ffffff',
  fontSize: '0.82rem',
  outline: 'none',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

export default AdminDashboard;
