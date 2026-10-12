import React, { useEffect, useRef, useState } from 'react';
import { SplashScreen } from './SplashScreen';
import { RoleSelect }   from './RoleSelect';
import { UserLoginView } from './UserLoginView';
import { AdminLoginView } from './AdminLoginView';
import { Dashboard }    from './Dashboard';
import { AdminDashboard } from './AdminDashboard';

import {
  getProfileFromUser,
  getSupabase,
  signOut,
} from '../services/supabase.js';
import '../index.css';

/*
 * MobileApp flow:
 * - Splash Screen
 * - Role Select (User: top green, Admin: bottom blue)
 * - User Login View (slides down from top: 3/4 form + 1/4 User bottom bar)
 * - Admin Login View (slides up from bottom: 1/4 Admin top bar + 3/4 form)
 * - Dashboard (User Dashboard or Admin Dashboard based on active role)
 */

export function MobileApp() {
  const [screen, setScreen]       = useState('splash');
  const [viewState, setViewState] = useState('roleSelect'); // 'roleSelect' | 'userLogin' | 'adminLogin'
  const [animating, setAnimating] = useState(null);        // 'userIn' | 'userOut' | 'adminIn' | 'adminOut' | null

  const [userSession, setUserSession] = useState(null);
  const passwordRecoveryRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      // Supabase not configured — app still works via backend OTP auth
      try {
        localStorage.removeItem('fabrisense_session');
        localStorage.removeItem('fabrisense_users');
      } catch (error) {
        console.error('Failed to clear legacy local authentication data:', error);
      }
      return undefined;
    }

    let subscription;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          passwordRecoveryRef.current = true;
          setUserSession(null);
          setScreen('main');
          setViewState('userLogin');
          setAnimating(null);
          return;
        }

        if (event === 'SIGNED_OUT') {
          passwordRecoveryRef.current = false;
          setUserSession(null);
          return;
        }

        if (passwordRecoveryRef.current) return;

        const profile = session?.user ? getProfileFromUser(session.user) : null;
        setUserSession(profile);
        if (event === 'INITIAL_SESSION' && profile) setScreen('dashboard');
      });
      subscription = data?.subscription;
    } catch (err) {
      console.error('[FabriSense] Supabase auth listener error:', err.message);
    }

    try {
      localStorage.removeItem('fabrisense_session');
      localStorage.removeItem('fabrisense_users');
    } catch (error) {
      console.error('Failed to clear legacy local authentication data:', error);
    }

    return () => {
      try { subscription?.unsubscribe(); } catch (_) {}
    };
  }, []);

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
    const role = data?.role || (viewState === 'adminLogin' ? 'Admin' : 'User');
    const sessionData = {
      ...data,
      name: data?.name || (role === 'Admin' ? 'Rajesh Kumar' : 'User'),
      email: data?.email || '',
      role,
    };
    setUserSession(sessionData);
    setScreen('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.warn('Sign out warning:', error);
    } finally {
      setUserSession(null);
      setScreen('main');
      setViewState('roleSelect');
      setAnimating(null);
    }
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
        return (
          <AdminDashboard
            userData={userSession}
            onLogout={handleLogout}
            onUpdateUserData={(updated) => {
              setUserSession((prev) => ({ ...prev, ...updated }));
              try {
                localStorage.setItem('fabrisense_admin_profile', JSON.stringify(updated));
              } catch (e) {}
            }}
          />
        );
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
      className="app-shell"
      style={{
        backgroundColor: '#0a0a0a',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {renderContent()}
    </div>
  );
}

export default MobileApp;
