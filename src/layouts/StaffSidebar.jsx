import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  LayoutGrid, Package, Settings, Info, HelpCircle, LogOut, UserCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';

function NavItem({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-all text-white text-xl tracking-widest uppercase ${
          isActive ? 'bg-[#b87050]' : 'hover:bg-white/10'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export default function StaffSidebar() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setUserName(snap.data().name || '');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const d = localStorage.getItem('pref_darkMode');
    if (d !== null) setDarkMode(d === 'true');
    document.documentElement.classList.toggle('dark', d === 'true');
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('pref_darkMode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const userData = snap.exists() ? snap.data() : {};
        await addDoc(collection(db, 'auditlog'), {
          action: 'Logout',
          performedBy: user.email,
          userId: user.uid,
          userName: userData.name || '',
          role: 'staff',
          details: `${userData.name || user.email} logged out.`,
          timestamp: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', user.uid), { isOnline: false });
      }
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className="w-[15%] flex flex-col shrink-0 h-full rounded-r-2xl"
      style={{ backgroundColor: '#614033' }}
    >
      {/* Welcome header */}
      <div className="px-6 pt-8 pb-6 shrink-0">
        <p className="text-white/60 text-xl font-medium">Welcome</p>
        <p className="text-white text-2xl font-bold leading-snug mt-0.5 break-words">
          {userName || '—'}
        </p>
        <p className="text-white text-2xl font-bold tabular-nums mt-2">
          {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-white/60 text-xl mt-0.5">
          {clock.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto pb-2">
        <NavItem to="/staff-dashboard" icon={<LayoutGrid size={17} />} label="Dashboard" />
        <NavItem to="/staff-inventory" icon={<Package size={17} />} label="Inventory" />

        {/* Settings accordion */}
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-white text-xl tracking-widest uppercase hover:bg-white/10 transition-all"
        >
          <span className="flex items-center gap-3">
            <Settings size={17} />
            Settings
          </span>
          {settingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {settingsOpen && (
          <div className="flex flex-col gap-0.5 pl-10 pr-4 pb-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-white/80 text-xl">Dark Mode</span>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-teal-400' : 'bg-white/20'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  darkMode ? 'translate-x-4' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        )}

        <NavItem to="/staff-account" icon={<UserCircle size={17} />} label="Account" />
        <NavItem to="/staff-about" icon={<Info size={17} />} label="About" />
        <NavItem to="/staff-help" icon={<HelpCircle size={17} />} label="Help" />

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-white text-xl tracking-widest uppercase hover:bg-white/10 transition-all"
        >
          <LogOut size={17} />
          <span>Log Out</span>
        </button>
      </nav>

      {/* Version footer */}
      <div className="px-6 py-4 shrink-0">
        <p className="text-white/40 text-xl">Ver.</p>
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-[360px] flex flex-col items-center gap-5">
            <LogOut size={36} className="text-[#b87050]" />
            <p className="text-gray-800 text-xl font-semibold text-center">Are you sure you want to log out?</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-full border border-gray-300 text-gray-700 text-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-full bg-[#b87050] hover:bg-[#9e5e3e] text-white text-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoggingOut && (
                  <svg className="animate-spin h-5 w-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
