import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';

export default function About({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;

  return (
    <div className="flex w-full h-full">
      <Sidebar activePage="about" />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-5 shrink-0">About</h1>

        {/* Top row — two side-by-side containers */}
        <div className="flex gap-5 mb-5 shrink-0">
          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm" style={{ minHeight: '280px' }}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">System Information</h2>
            </div>
            <div className="p-6 bg-gray-50 h-full" />
          </div>

          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm" style={{ minHeight: '280px' }}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">Company Information</h2>
            </div>
            <div className="p-6 bg-gray-50 h-full" />
          </div>
        </div>

        {/* Bottom row — full-width container */}
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm min-h-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800">Contacts and Addresses</h2>
          </div>
          <div className="p-6 bg-gray-50 h-full" />
        </div>
      </main>
    </div>
  );
}
