import { Package, ClipboardList, Search, Wrench, HelpCircle, Book, Settings, LogOut } from 'lucide-react';
import SidebarItem from '../components/SidebarItem';

export default function StaffSidebar({ activePage }) {
  return (
    <aside className="w-[280px] bg-[#2a2a2a] rounded-xl p-6 flex flex-col gap-4 shrink-0">
      
      <SidebarItem to="/staff-inventory" icon={<Package size={20} />} label="Inventory" isActive={activePage === 'inventory'} />
      <SidebarItem to="/staff-dashboard" icon={<ClipboardList size={20} />} label="Dashboard" isActive={activePage === 'dashboard'} />
      <SidebarItem to="/staff-search" icon={<Search size={20} />} label="Search" isActive={activePage === 'search'} />
      <SidebarItem to="/staff-help" icon={<HelpCircle size={20} />} label="Help" isActive={activePage === 'staffhelp'} />
      <SidebarItem to="/staff-about" icon={<Book size={20} />} label="About" isActive={activePage === 'about'} />
      <SidebarItem to="/staff-settings" icon={<Settings size={20} />} label="Settings" isActive={activePage === 'settings'} />
      <SidebarItem to="/login" icon={<LogOut size={20} />} label="Log Out" />
      
    </aside>
  );
}
