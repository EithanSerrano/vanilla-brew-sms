import { Settings as SettingsIcon } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';

export default function Settings({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;

  return (
    <div className="flex w-full h-full gap-6">
      <Sidebar activePage="settings" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl flex flex-col items-center justify-center text-white relative overflow-hidden">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="bg-[#4a4a4a] p-8 rounded-full mb-8 shadow-lg">
            <SettingsIcon size={80} className="text-[#3ca4c7] animate-spin-slow" />
          </div>
          <h1 className="text-5xl font-bold tracking-wide mb-6">Settings</h1>
          <p className="text-xl text-gray-300 tracking-wide text-center leading-relaxed">
            Maintenance ongoing.<br/>
            <span className="text-[#3ca4c7] font-medium">We are currently working on this module.</span>
          </p>
        </div>
      </main>
    </div>
  );
}