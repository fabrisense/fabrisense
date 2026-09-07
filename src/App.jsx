import React, { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import './index.css';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [userSession, setUserSession] = useState(null);

  const handleLoginSuccess = (data) => {
    setUserSession(data);
  };

  const handleLogout = () => {
    setUserSession(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Entry Splash Screen (1 Second) */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* 2. Onboarding Flow (3 Slides) */}
      {!showSplash && showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}

      {/* 3. Main Content */}
      {!showSplash && !showOnboarding && (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          {!userSession ? (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Dashboard userData={userSession} onLogout={handleLogout} />
          )}
        </main>
      )}
    </div>
  );
}

export default App;
