import { Package, UserPlus, ClipboardList, Search, Wrench, HelpCircle, Book, Settings, LogOut } from 'lucide-react';
import SidebarItem from '../components/SidebarItem';

export default function AdminSidebar({ activePage }) {
  return (
    <aside className="w-[280px] bg-[#2a2a2a] rounded-xl p-6 flex flex-col gap-4 shrink-0">
      <SidebarItem to="/inventory" icon={<Package size={20} />} label="Inventory" isActive={activePage === 'inventory'} />
      <SidebarItem to="/registration" icon={<UserPlus size={20} />} label="Registration" isActive={activePage === 'registration'} />
      <SidebarItem to="/admin-dashboard" icon={<ClipboardList size={20} />} label="Dashboard" isActive={activePage === 'dashboard'} />
      <SidebarItem to="/search" icon={<Search size={20} />} label="Search" isActive={activePage === 'search'} />
      <SidebarItem to="/admin-maintenance" icon={<Wrench size={20} />} label="Maintenance" isActive={activePage === 'maintenance'} />
      <SidebarItem to="/admin-help" icon={<HelpCircle size={20} />} label="Help" isActive={activePage === 'help'} />
      <SidebarItem to="/admin-about" icon={<Book size={20} />} label="About" isActive={activePage === 'about'} />
      <SidebarItem to="/admin-settings" icon={<Settings size={20} />} label="Settings" isActive={activePage === 'settings'} />
      <SidebarItem to="/login" icon={<LogOut size={20} />} label="Log Out" />
      
    </aside>
  );
}