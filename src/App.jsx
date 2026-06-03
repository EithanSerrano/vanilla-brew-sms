import { useEffect } from "react";
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import { startSalesInventoryListener } from "./utils/inventoryDeduction";

// Pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

// Shared Pages
import Dashboard from "./pages/Dashboard";

// Admin Pages
import AdminHome from "./pages/AdminHome";
import Inventory from "./pages/Inventory";
import AdminRegistration from "./pages/AdminRegistration";
import MenuItems from "./pages/MenuItems";
import MenuCategories from "./pages/MenuCategories";
import Promotions from "./pages/Promotions";
import AdminHelp from "./pages/AdminHelp";

// Staff Pages
import StaffHome from "./pages/StaffHome";
import StaffInventory from "./pages/StaffInventory";
import StaffHelp from "./pages/StaffHelp";

// Placeholder Pages
import Maintenance from "./pages/Maintenance";
import Documents from "./pages/Documents";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Account from "./pages/Account";
import PaymentQR from "./pages/PaymentQR";
import BackupRecovery from "./pages/BackupRecovery";

function RootLayout() {
  useEffect(() => {
    const unsubscribe = startSalesInventoryListener();
    return () => unsubscribe();
  }, []);

  return (
    <div className="h-screen font-sans flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/",                  element: <Navigate to="/login" replace /> },
      { path: "/login",             element: <Login /> },
      { path: "/reset-password",    element: <ResetPassword /> },

      // Admin routes
      { path: "/admin",             element: <AdminHome /> },
      { path: "/admin-dashboard",   element: <Dashboard role="admin" /> },
      { path: "/inventory",         element: <Inventory /> },
      { path: "/menu-items",        element: <MenuItems /> },
      { path: "/menu-categories",   element: <MenuCategories /> },
      { path: "/promotions",        element: <Promotions /> },
      { path: "/registration",      element: <AdminRegistration /> },
      { path: "/admin-maintenance", element: <Maintenance role="admin" /> },
      { path: "/documents",         element: <Documents /> },
      { path: "/admin-help",        element: <AdminHelp /> },
      { path: "/admin-about",       element: <About role="admin" /> },
      { path: "/admin-settings",    element: <Settings role="admin" /> },
      { path: "/admin-account",     element: <Account role="admin" /> },
      { path: "/payment-qr",        element: <PaymentQR /> },
      { path: "/backup-recovery",   element: <BackupRecovery /> },

      // Staff routes
      { path: "/staff",             element: <StaffHome /> },
      { path: "/staff-dashboard",   element: <Dashboard role="staff" /> },
      { path: "/staff-inventory",   element: <StaffInventory /> },
      { path: "/staff-help",        element: <StaffHelp /> },
      { path: "/staff-about",       element: <About role="staff" /> },
      { path: "/staff-settings",    element: <Settings role="staff" /> },
      { path: "/staff-account",     element: <Account role="staff" /> },

      { path: "*",                  element: <Navigate to="/login" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
