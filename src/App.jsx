import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword"; // <-- Added this import

// Shared Pages
import Dashboard from "./pages/Dashboard";

// Admin Pages
import AdminHome from "./pages/AdminHome";
import Inventory from "./pages/Inventory";
import AdminRegistration from "./pages/AdminRegistration";
import MenuItems from "./pages/MenuItems";
import AdminHelp from "./pages/AdminHelp";
import AdminSearch from "./pages/AdminSearch";

// Staff Pages
import StaffHome from "./pages/StaffHome";
import StaffInventory from "./pages/StaffInventory";
import StaffSearch from "./pages/StaffSearch";
import StaffHelp from "./pages/StaffHelp";

// Placeholder Pages
import Maintenance from "./pages/Maintenance";
import Documents from "./pages/Documents";
import About from "./pages/About";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen font-sans flex flex-col">
        <div className="flex-1 overflow-hidden">
          <Routes>
            {/* Default redirect is strictly to LOGIN */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            
            {/* --- ADDED RESET PASSWORD ROUTE HERE --- */}
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* --- ADMIN ROUTES --- */}
            <Route path="/admin" element={<AdminHome />} /> 
            <Route path="/admin-dashboard" element={<Dashboard role="admin" />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/menu-items" element={<MenuItems />} />
            <Route path="/registration" element={<AdminRegistration />} />
            <Route path="/search" element={<AdminSearch />} />
            
            {/* Admin Dedicated Placeholders */}
            <Route path="/admin-maintenance" element={<Maintenance role="admin" />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/admin-help" element={<AdminHelp />} />
            <Route path="/admin-about" element={<About role="admin" />} />
            <Route path="/admin-settings" element={<Settings role="admin" />} />
            
            {/* --- STAFF ROUTES --- */}
            <Route path="/staff" element={<StaffHome />} />
            <Route path="/staff-dashboard" element={<Dashboard role="staff" />} />
            <Route path="/staff-inventory" element={<StaffInventory />} />
            <Route path="/staff-search" element={<StaffSearch />} />
            
            <Route path="/staff-help" element={<StaffHelp />} />
            <Route path="/staff-about" element={<About role="staff" />} />
            <Route path="/staff-settings" element={<Settings role="staff" />} />
            
            {/* Catch-all: Must be at the bottom */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
