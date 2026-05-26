import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  LayoutGrid, Package, Settings, Info, HelpCircle, LogOut
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setUserName(snap.data().name || '');
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      if (user) await updateDoc(doc(db, 'users', user.uid), { isOnline: false });
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
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
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto pb-2">
        <NavItem to="/staff-dashboard" icon={<LayoutGrid size={17} />} label="Dashboard" />
        <NavItem to="/staff-inventory" icon={<Package size={17} />} label="Inventory" />
        <NavItem to="/staff-settings" icon={<Settings size={17} />} label="Settings" />
        <NavItem to="/staff-about" icon={<Info size={17} />} label="About" />
        <NavItem to="/staff-help" icon={<HelpCircle size={17} />} label="Help" />

        <button
          onClick={handleLogout}
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
    </aside>
  );
}