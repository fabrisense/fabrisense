import React, { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { RoleSelect }   from './components/RoleSelect';
import { UserLoginView } from './components/UserLoginView';
import { AdminLoginView } from './components/AdminLoginView';
import { Dashboard }    from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import './index.css';

/*
 * App flow:
 * - Splash Screen
 * - Role Select (User: top green, Admin: bottom blue)
 * - User Login View (slides down from top: 3/4 form + 1/4 User bottom bar)
 * - Admin Login View (slides up from bottom: 1/4 Admin top bar + 3/4 form)
 * - Dashboard (User Dashboard or Admin Dashboard based on active role)
 */

export function App() {
  const [screen, setScreen]       = useState('splash');
  const [viewState, setViewState] = useState('roleSelect'); // 'roleSelect' | 'userLogin' | 'adminLogin'
  const [animating, setAnimating] = useState(null);        // 'userIn' | 'userOut' | 'adminIn' | 'adminOut' | null

  const [userSession, setUserSession] = useState(() => {
    try {
      const saved = localStorage.getItem('fabrisense_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  /* ── User Navigation ── */
  const handleSelectUser = () => {
    setAnimating('userIn');
    setTimeout(() => {
      setViewState('userLogin');
      setAnimating(null);
    }, 450);
  };

  const handleBackFromUser = () => {
    setAnimating('userOut');
    setTimeout(() => {
      setViewState('roleSelect');
      setAnimating(null);
    }, 450);
  };

  /* ── Admin Navigation ── */
  const handleSelectAdmin = () => {
    setAnimating('adminIn');
    setTimeout(() => {
      setViewState('adminLogin');
      setAnimating(null);
    }, 450);
  };

  const handleBackFromAdmin = () => {
    setAnimating('adminOut');
    setTimeout(() => {
      setViewState('roleSelect');
      setAnimating(null);
    }, 450);
  };

  const handleLoginSuccess = (data) => {
    const sessionData = {
      name:  data?.name  || 'Rajesh Kumar',
      email: data?.email || 'rajesh@textileco.com',
      role:  viewState === 'adminLogin' ? 'Admin' : 'User',
      ...data,
    };
    setUserSession(sessionData);
    setScreen('dashboard');
    try {
      localStorage.setItem('fabrisense_session', JSON.stringify(sessionData));
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    setUserSession(null);
    setScreen('main');
    setViewState('roleSelect');
    setAnimating(null);
    try {
      localStorage.removeItem('fabrisense_session');
    } catch (e) { console.error(e); }
  };

  const isSplash    = screen === 'splash';
  const isDashboard = screen === 'dashboard';

  // Splash Screen fills full viewport
  if (isSplash) {
    return <SplashScreen onFinish={() => setScreen(userSession ? 'dashboard' : 'main')} />;
  }

  // Common mobile container shell for Dashboard, Admin Dashboard, and Login/Role screens
  const renderContent = () => {
    if (isDashboard) {
      if (userSession?.role === 'Admin') {
        return <AdminDashboard userData={userSession} onLogout={handleLogout} />;
      }
      return <Dashboard userData={userSession} onLogout={handleLogout} />;
    }

    const isUserActive  = viewState === 'userLogin'  || animating === 'userIn'  || animating === 'userOut';
    const isAdminActive = viewState === 'adminLogin' || animating === 'adminIn' || animating === 'adminOut';

    const roleSelectTransform =
      animating === 'userIn' || viewState === 'userLogin'
        ? 'translateY(100%)'
        : animating === 'adminIn' || viewState === 'adminLogin'
        ? 'translateY(-100%)'
        : 'translateY(0)';

    const userTransform =
      isUserActive
        ? (animating === 'userOut' ? 'translateY(-100%)' : 'translateY(0)')
        : 'translateY(-100%)';

    const adminTransform =
      isAdminActive
        ? (animating === 'adminOut' ? 'translateY(100%)' : 'translateY(0)')
        : 'translateY(100%)';

    return (
      <>
        {/* ── Role Select View ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: roleSelectTransform,
            transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
            zIndex: !isUserActive && !isAdminActive ? 2 : 1,
          }}
        >
          <RoleSelect
            onSelectUser={handleSelectUser}
            onSelectAdmin={handleSelectAdmin}
          />
        </div>

        {/* ── User Login View ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: userTransform,
            transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
            zIndex: isUserActive ? 3 : 1,
          }}
        >
          <UserLoginView
            onLoginSuccess={handleLoginSuccess}
            onBack={handleBackFromUser}
          />
        </div>

        {/* ── Admin Login View ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: adminTransform,
            transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
            zIndex: isAdminActive ? 3 : 1,
          }}
        >
          <AdminLoginView
            onLoginSuccess={handleLoginSuccess}
            onBack={handleBackFromAdmin}
          />
        </div>
      </>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Desktop subtle grid pattern */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Mobile Phone Frame (390×844) ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '390px',
          height: '844px',
          borderRadius: '44px',
          overflow: 'hidden',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.7), 0 0 120px rgba(0,0,0,0.4)',
          flexShrink: 0,
          maxWidth: '100vw',
          maxHeight: '100dvh',
          backgroundColor: '#000000',
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
