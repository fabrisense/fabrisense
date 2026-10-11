import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bell,
  Sliders,
  Shield,
  Save,
  RefreshCw,
  CheckCircle2,
  Building,
  Mail,
  SlidersHorizontal
} from 'lucide-react';
import { fetchSettings, updateSettingsApi } from '../../services/adminApi';

export function AdminSettings() {
  const [settings, setSettings] = useState({
    companyName: 'FabriSense Industrial Textiles',
    systemEmail: 'admin@fabrisense.com',
    notificationsEnabled: 'true',
    emailAlerts: 'true',
    autoApproveGradeA: 'true',
    confidenceThreshold: '80',
    defectToleranceLow: '3',
    defectToleranceCritical: '1',
    reportFormat: 'PDF',
    theme: 'dark_navy',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSettings();
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.message || 'Unable to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSavedSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await updateSettingsApi(settings);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-box">
        <RefreshCw size={36} className="animate-spin" color="#208c7d" />
        <div>Loading configuration settings...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1f2a44', margin: 0 }}>
            System Settings &amp; Preferences
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0' }}>
            Configure quality tolerance limits, notification webhooks, and account preferences
          </p>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-teal">
          {savedSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : savedSuccess ? 'Preferences Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={loadSettings} className="btn-secondary">Retry</button>
        </div>
      )}

      {savedSuccess && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
            fontWeight: '600',
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          Settings successfully updated and persisted to SQLite database.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Organization & Account */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={18} color="#208c7d" />
              <h3 className="admin-card-title">Organization &amp; Account</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Company / Mill Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                System Notification Email
              </label>
              <input
                type="email"
                value={settings.systemEmail}
                onChange={(e) => handleChange('systemEmail', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Quality Grade Thresholds */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SlidersHorizontal size={18} color="#208c7d" />
              <h3 className="admin-card-title">Quality Grade Tolerances</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                AI Confidence Threshold (%)
              </label>
              <input
                type="number"
                min="50"
                max="99"
                value={settings.confidenceThreshold}
                onChange={(e) => handleChange('confidenceThreshold', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Detections below this confidence will be flagged</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Max Minor Defects (Grade B limit)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.defectToleranceLow}
                onChange={(e) => handleChange('defectToleranceLow', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Exceeding this count automatically assigns Grade C</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Critical Defects Allowed Before Rejection
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={settings.defectToleranceCritical}
                onChange={(e) => handleChange('defectToleranceCritical', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Holes or large weft tears trigger Grade C rejection</span>
            </div>
          </div>
        </div>

        {/* Section 3: Notification Preferences */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={18} color="#208c7d" />
              <h3 className="admin-card-title">Notification Alerts</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.notificationsEnabled === 'true'}
                onChange={(e) => handleChange('notificationsEnabled', e.target.checked ? 'true' : 'false')}
                style={{ accentColor: '#208c7d', width: '18px', height: '18px' }}
              />
              <div>
                <strong style={{ fontSize: '13.5px', color: '#1f2a44' }}>Enable In-App Push Alerts</strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Notify when a Grade C rejection or critical anomaly occurs on floor</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.emailAlerts === 'true'}
                onChange={(e) => handleChange('emailAlerts', e.target.checked ? 'true' : 'false')}
                style={{ accentColor: '#208c7d', width: '18px', height: '18px' }}
              />
              <div>
                <strong style={{ fontSize: '13.5px', color: '#1f2a44' }}>Email Reports to Floor Managers</strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Send daily automated summary email of evaluated rolls</div>
              </div>
            </label>
          </div>
        </div>

        {/* Save button footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={loadSettings}
            className="btn-secondary"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-teal"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminSettings;
