import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { Dashboard } from './Dashboard';
import { OnboardingFlow } from './OnboardingFlow';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import '../index.css';

export function MobileApp() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem('fabrisense_onboarding_done') !== 'true';
    } catch {
      return false;
    }
  });

  const [userSession, setUserSession] = useState(() => {
    try {
      const saved = localStorage.getItem('fabrisense_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (data) => {
    const sessionData = data || {
      name: 'Ananthi Kumar',
      email: 'inspector@weavesofindia.com',
    };
    setUserSession(sessionData);
    try {
      localStorage.setItem('fabrisense_session', JSON.stringify(sessionData));
      localStorage.setItem('fabrisense_onboarding_done', 'true');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    try {
      localStorage.removeItem('fabrisense_session');
    } catch (e) {
      console.error(e);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem('fabrisense_onboarding_done', 'true');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0c1017', color: 'var(--text-main)', position: 'relative' }}>
      {/* Discreet floating switch to Admin Portal for presentations */}
      <div
        style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 9999,
        }}
      >
        <a
          href="/admin/dashboard"
          style={{
            backgroundColor: '#1f2a44',
            color: '#ffffff',
            border: '1px solid rgba(32, 140, 125, 0.4)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
          }}
          title="Switch to Management Admin Portal"
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#208c7d' }} />
          <span>Admin Portal</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* 1. Onboarding Flow (3 Slides) */}
      {showOnboarding && !userSession && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}

      {/* 2. Login Page */}
      {!showOnboarding && !userSession && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setShowOnboarding(true)}
        />
      )}

      {/* 3. Inspection Dashboard (Post-Login Screen) */}
      {userSession && (
        <Dashboard userData={userSession} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default MobileApp;
