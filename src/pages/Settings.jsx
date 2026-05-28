import { useState, useEffect } from 'react';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';
import { ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? 'bg-teal-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Settings({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;
  const [open, setOpen] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const a = localStorage.getItem('pref_animations');
    const d = localStorage.getItem('pref_darkMode');
    if (a !== null) setAnimations(a === 'true');
    if (d !== null) setDarkMode(d === 'true');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleSave = () => {
    localStorage.setItem('pref_animations', String(animations));
    localStorage.setItem('pref_darkMode', String(darkMode));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex w-full h-full">
      <Sidebar activePage="settings" />

      <main className="flex-1 bg-white overflow-y-auto flex flex-col p-8 gap-5">
        <h1 className="text-3xl font-bold text-gray-900 shrink-0">Settings</h1>

        <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl font-semibold text-gray-800">System Preferences</span>
            {open
              ? <ChevronUp size={20} className="text-gray-500" />
              : <ChevronDown size={20} className="text-gray-500" />
            }
          </button>

          {open && (
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Enable Animations</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Show transitions and motion effects throughout the system.
                  </p>
                </div>
                <Toggle checked={animations} onChange={setAnimations} />
              </div>

              <div className="border-t border-gray-200" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Dark Mode</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Switch the interface to a dark color scheme.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun size={15} className="text-yellow-400" />
                  <Toggle checked={darkMode} onChange={setDarkMode} />
                  <Moon size={15} className="text-gray-400" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Save Preferences
                </button>
                {saved && (
                  <span className="text-sm text-green-600 font-medium">Preferences saved!</span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
