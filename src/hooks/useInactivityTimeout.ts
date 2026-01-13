import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 60 * 1000; // 1 minute in milliseconds

export const useInactivityTimeout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, t } = useApp();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pages that should not trigger auto-logout
  const excludedPaths = ['/', '/scan', '/language', '/admin'];

  const isExcludedPath = useCallback(() => {
    return excludedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith('/admin')
    );
  }, [location.pathname]);

  const signOut = useCallback(() => {
    if (!user || isExcludedPath()) return;
    
    // Clear user session
    setUser(null);
    localStorage.removeItem('kioskUser');
    
    // Show toast notification
    toast.info(t('session.timedOut'), {
      description: t('session.signedOutInactivity'),
      duration: 8000,
    });
    
    // Navigate to scan page
    navigate('/scan');
  }, [user, setUser, navigate, t, isExcludedPath]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (user && !isExcludedPath()) {
      timeoutRef.current = setTimeout(signOut, INACTIVITY_TIMEOUT);
    }
  }, [user, signOut, isExcludedPath]);

  useEffect(() => {
    if (!user || isExcludedPath()) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Reset timeout on activity
    const handleActivity = () => {
      resetTimeout();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimeout, isExcludedPath]);

  return { signOut, resetTimeout };
};
