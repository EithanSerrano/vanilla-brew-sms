import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getHomeRoute, hasRole } from '../constants/roles';

// Restricts a group of routes to certain roles. Render it inside ProtectedRoute
// (which handles sign-in), e.g. { element: <RoleRoute allow={ACCESS.accounts} />, children: [...] }.
// The role is read from the user's Firestore document, not from localStorage.
// Users without access are sent to the home page for their own role.
export default function RoleRoute({ allow }) {
  const [role, setRole] = useState(null); // null = loading, '' = no valid role

  useEffect(() => {
    let cancelled = false;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setRole('');
      return undefined;
    }
    getDoc(doc(db, 'users', uid))
      .then((snap) => { if (!cancelled) setRole(snap.exists() ? snap.data().role || '' : ''); })
      .catch(() => { if (!cancelled) setRole(''); });
    return () => { cancelled = true; };
  }, []);

  if (role === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#b87050]" />
      </div>
    );
  }

  if (hasRole(role, allow)) return <Outlet />;
  return <Navigate to={getHomeRoute(role) || '/login'} replace />;
}
