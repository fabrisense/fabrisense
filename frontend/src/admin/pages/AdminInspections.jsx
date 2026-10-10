import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  RefreshCw,
  Plus,
  X,
  Upload
} from 'lucide-react';
import { fetchInspections, createInspectionApi, fetchUsers } from '../../services/adminApi';
import { subscribeToInspections } from '../../services/supabase';

export function AdminInspections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [inspections, setInspections] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 1247, totalPages: 156 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [dateRange, setDateRange] = useState('all');
  const [grade, setGrade] = useState(searchParams.get('grade') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [usersList, setUsersList] = useState([]);
  const [userId, setUserId] = useState(searchParams.get('userId') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFabricType, setNewFabricType] = useState('Egyptian Cotton Premium');
  const [newFabricName, setNewFabricName] = useState('Egyptian Cotton Roll #104');
  const [newAssignedUser, setNewAssignedUser] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    fetchUsers().then((res) => {
      if (res.success) setUsersList(res.data);
    }).catch(() => {});
  }, []);

  const loadInspections = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchInspections({
        search,
        grade: grade === 'all' ? '' : grade,
        status: status === 'all' ? '' : status,
        userId: userId === 'all' ? '' : userId,
        page,
        limit: 8,
      });

      if (res.success) {
        setInspections(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load inspections:', err);
      if (!silent) setError(err.message || 'Error fetching inspection records.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [search, grade, status, userId, page]);

  // Realtime subscription for live inspection stream
  useEffect(() => {
    const unsub = subscribeToInspections(() => {
      console.log('[Realtime] Inspection list change detected, reloading...');
      loadInspections(true);
    });
    return () => unsub();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const formData = new FormData();
      formData.append('fabricType', newFabricType);
      formData.append('fabricName', newFabricName);
      if (newAssignedUser) formData.append('userId', newAssignedUser);
      if (selectedFile) formData.append('image', selectedFile);

      const res = await createInspectionApi(formData);
      if (res.success) {
        setIsModalOpen(false);
        setSelectedFile(null);
        loadInspections();
        navigate(`/admin/inspections/${res.data.inspection_id}`);
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to analyze and save inspection.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── TOP FILTER BAR (Matches Screenshot 2) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search input with pill outline */}
        <div style={{ position: 'relative', width: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search ID, inspector, fabric..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '9px 14px 9px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13.5px',
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter Dropdowns on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Date Range */}
          <div style={{ position: 'relative' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '8px 30px 8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: '500',
                color: '#334155',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Date Range</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>

          {/* Quality Grade */}
          <div style={{ position: 'relative' }}>
            <select
              value={grade}
              onChange={(e) => { setGrade(e.target.value); setPage(1); }}
              style={{
                padding: '8px 30px 8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: '500',
                color: '#334155',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Quality Grade</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>

          {/* Assigned User */}
          <div style={{ position: 'relative' }}>
            <select
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setPage(1); }}
              style={{
                padding: '8px 30px 8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: '500',
                color: '#334155',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Assigned User</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>

          {/* Status */}
          <div style={{ position: 'relative' }}>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              style={{
                padding: '8px 30px 8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: '500',
                color: '#334155',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Status</option>
              <option value="Passed">Passed</option>
              <option value="Review">Review</option>
              <option value="Failed">Failed</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#16806e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      {/* ── TABLE CARD (Matches Screenshot 2) ── */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Inspection ID</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Date &amp; Time</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Inspector</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Fabric Type</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Defect Count</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Grade</th>
              <th style={{ padding: '14px 16px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((row) => {
              const isGradeA = row.grade === 'A';
              const isGradeB = row.grade === 'B';
              const isPassed = row.status === 'Passed';
              const isReview = row.status === 'Review';

              return (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '800', color: '#1f2a44' }}>
                    {row.inspection_id}
                  </td>
                  <td style={{ padding: '16px 16px', color: '#475569', fontSize: '13px' }}>
                    {row.inspection_date ? row.inspection_date.replace('T', ' ').slice(0, 16) : 'Sep 5, 2026 10:15 AM'}
                  </td>
                  <td style={{ padding: '16px 16px', color: '#334155', fontWeight: '500' }}>
                    {row.inspector_name || 'Rajesh Kumar'}
                  </td>
                  <td style={{ padding: '16px 16px', color: '#334155' }}>
                    {row.fabric_name || row.fabric_type}
                  </td>
                  <td style={{ padding: '16px 16px', color: '#1e293b' }}>
                    {row.defect_count}
                  </td>
                  <td style={{ padding: '16px 16px' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        padding: '3px 12px',
                        borderRadius: '20px',
                        backgroundColor: isGradeA ? '#ecfdf5' : isGradeB ? '#fffbeb' : '#fef2f2',
                        color: isGradeA ? '#059669' : isGradeB ? '#d97706' : '#dc2626',
                        display: 'inline-block',
                      }}
                    >
                      Grade {row.grade}
                    </span>
                  </td>
                  <td style={{ padding: '16px 16px', fontWeight: '600' }}>
                    <span style={{ color: isPassed ? '#16a34a' : isReview ? '#d97706' : '#dc2626' }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/admin/inspections/${row.inspection_id}`)}
                        style={{
                          backgroundColor: '#16806e',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/admin/inspections/${row.inspection_id}?tab=report`)}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Report
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── FOOTER PAGINATION (Matches Screenshot 2) ── */}
        <div
          style={{
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748b',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div>
            Showing {(page - 1) * 8 + 1}-{Math.min(page * 8, pagination.total)} of {pagination.total.toLocaleString()} entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.6 : 1,
              }}
            >
              Previous
            </button>

            {[1, 2, 3].map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: page === p ? 'none' : '1px solid #e2e8f0',
                  backgroundColor: page === p ? '#16806e' : '#ffffff',
                  color: page === p ? '#ffffff' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page >= pagination.totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= pagination.totalPages ? 0.6 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal for New Inspection ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1f2a44', margin: 0 }}>
                Run New AI Inspection
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div style={{ margin: '16px 24px 0', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Fabric Classification
                </label>
                <input
                  type="text"
                  value={newFabricType}
                  onChange={(e) => setNewFabricType(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Batch / Roll Name
                </label>
                <input
                  type="text"
                  value={newFabricName}
                  onChange={(e) => setNewFabricName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Fabric Sample Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    backgroundColor: '#16806e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {createLoading ? 'Analyzing...' : 'Run YOLOv8'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInspections;
