import React, { useEffect, useRef, useState } from 'react';
import { SplashScreen } from './SplashScreen';
import { RoleSelect }   from './RoleSelect';
import { UserLoginView } from './UserLoginView';
import { AdminLoginView } from './AdminLoginView';
import { Dashboard }    from './Dashboard';
import { AdminDashboard } from './AdminDashboard';
import { ExternalLink } from 'lucide-react';
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
    if (!supabase) return undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

    try {
      localStorage.removeItem('fabrisense_session');
      localStorage.removeItem('fabrisense_users');
    } catch (error) {
      console.error('Failed to clear legacy local authentication data:', error);
    }

    return () => subscription.unsubscribe();
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
        position: 'relative',
      }}
    >
      {/* Floating link to Desktop Admin Portal - Hidden on admin login since admin login leads directly to the admin dashboard */}
      {viewState !== 'adminLogin' && animating !== 'adminIn' && screen !== 'dashboard' && (
        <div
          style={{
            position: 'fixed',
            top: '14px',
            right: '14px',
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
      )}

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

export default MobileApp;
