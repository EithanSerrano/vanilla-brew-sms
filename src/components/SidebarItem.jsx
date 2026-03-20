import { NavLink } from 'react-router-dom';

export default function SidebarItem({ icon, label, to }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => 
        `flex items-center gap-4 w-full px-5 py-3 rounded-lg transition-all font-medium text-sm tracking-wide ${
          isActive 
            ? "bg-[#3ca4c7] text-white shadow-md" 
            : "bg-[#4a4a4a] hover:bg-[#5a5a5a] text-white"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}