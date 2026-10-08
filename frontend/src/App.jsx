import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { OnboardingFlow } from './components/OnboardingFlow';
import './index.css';

export function App() {
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0c1017', color: 'var(--text-main)' }}>
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

export default App;
