import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export default function ProtectedRoute() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const forceSignOut = useCallback(async () => {
    try {
      const session = JSON.parse(sessionStorage.getItem('sessionUser') || '{}');
      const uid = session.uid;
      if (uid) {
        await Promise.all([
          addDoc(collection(db, 'auditlog'), {
            action: 'Auto Logout',
            performedBy: session.email || '',
            userId: uid,
            userName: session.name || '',
            role: session.role || '',
            details: `${session.name || session.email} was automatically logged out due to inactivity.`,
            timestamp: serverTimestamp(),
          }),
          updateDoc(doc(db, 'users', uid), { isOnline: false }),
        ]);
      }
    } catch {
      // best-effort; sign out regardless
    }
    sessionStorage.removeItem('sessionUser');
    await signOut(auth);
    navigate('/login', { replace: true, state: { reason: 'inactivity' } });
  }, [navigate]);

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(forceSignOut, INACTIVITY_MS);
  }, [forceSignOut]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(user ? 'authenticated' : 'unauthenticated');
    });
    return unsubscribe;
  }, []);

  // Inactivity timer — only active while authenticated
  useEffect(() => {
    if (authState !== 'authenticated') return;

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(timerRef.current);
    };
  }, [authState, resetTimer]);

  if (authState === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#b87050]" />
      </div>
    );
  }

  return authState === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}
