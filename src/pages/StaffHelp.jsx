import { useState, useMemo } from 'react';
import { Search, Filter, X, CheckCircle2 } from 'lucide-react';
import StaffSidebar from '../layouts/StaffSidebar';

const PARTS = ['Dashboard', 'Inventory', 'Settings', 'Account'];

const HELP_DATA = [
  // ── Dashboard ──
  {
    topic: 'How to navigate the Dashboard?',
    part: 'Dashboard',
    steps: [
      'Click "Dashboard" in the sidebar to open the Dashboard page.',
      'The left panel shows the Sales History — a list of all recorded sales transactions sorted by date.',
      'Use the search bar at the top of the Sales History to look up a specific transaction by its Sales ID.',
      'Click "Filter the List" to narrow down transactions by a specific date or date range, or by order mode.',
      'Click "View" on any transaction row to open its full details, including order items, customer info, and payment method.',
      'Click "Download Receipt" inside the view modal to save the receipt as a .txt file.',
      'The top-right panel shows Sales Analytics — the top 5 most ordered menu items for the current week.',
      'Click the expand icon (⤢) on Sales Analytics to open a full modal with date-filtered analytics and a pie chart breakdown.',
      'The bottom-right panel shows Critical Stock — inventory items that are currently low in supply.',
      'Click the refresh icon (↺) on any panel to reload its data.',
    ],
  },
  {
    topic: 'How to use the Sales Analytics?',
    part: 'Dashboard',
    steps: [
      'On the Dashboard, locate the "Sales Analytics" panel on the right side.',
      'By default it displays the top 5 best-selling menu items for the past 7 days.',
      'Click the expand icon (⤢) at the top-right of the Sales Analytics panel to open the full modal.',
      'In the expanded modal, set a specific date in the "Date" field to view analytics for that day.',
      'Check the "Range" checkbox, then set an end date to view analytics across a date range.',
      'The left side of the modal shows a pie chart with color-coded slices for each menu item.',
      'The legend below the pie chart shows each item\'s percentage of total orders for the selected period.',
      'The right side of the modal shows the ranked list of menu items with their order counts.',
      'Close the modal by clicking the X button at the top right.',
    ],
  },

  // ── Inventory ──
  {
    topic: 'How to view and filter the Inventory?',
    part: 'Inventory',
    steps: [
      'Click "Inventory" in the sidebar to open the Inventory page.',
      'The inventory list shows both Materials and Ingredients that are currently active.',
      'Use the search bar at the top to filter items by name or ID.',
      'Click "Filter" to open the filter panel and select a specific type (Material or Ingredient) to display.',
      'You can also filter by status (Normal Supply, Low Supply, Expiring) using the filter options.',
      'Each row shows the item\'s ID, name, category, current stock, status, and available actions.',
      'Stock status is color-coded: Green = Normal Supply, Red = Low Supply, Orange = Low Supply / Expiring.',
      'Click the refresh icon (↺) to reload the inventory list.',
    ],
  },
  {
    topic: 'How to Resupply an item?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, locate the material or ingredient you want to resupply.',
      'Click the "Resupply" button on that item\'s row.',
      'For a Material: enter the additional quantity to add to the current stock, then click "Confirm".',
      'For an Ingredient: enter the new batch\'s quantity and expiration date (maximum 3 batches per ingredient), then click "Confirm".',
      'Review the details in the confirmation dialog and click "Confirm" again to apply.',
      'The stock level will be updated immediately.',
    ],
  },
  {
    topic: 'How to Adjust an item\'s stock?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, locate the item whose stock needs correction.',
      'Click the "Adjust" button on that item\'s row.',
      'For a Material: directly type the new correct stock value in the "New quantity" field.',
      'For an Ingredient: select the batch you want to adjust using the batch tabs, then enter the corrected quantity.',
      'Enter an optional reason for the adjustment in the "Reason" field.',
      'Click "Confirm" to preview the change, then "Confirm" again in the dialog to apply.',
    ],
  },
  {
    topic: 'How to view Ingredient Batches?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, find an ingredient row.',
      'Click the three-dot menu (⋮) at the right end of the ingredient\'s row.',
      'Select "View Batches" from the dropdown.',
      'The Batch List modal will open, showing each batch\'s ID, quantity, and expiration date.',
      'Close the modal by clicking "Close" or the X button.',
    ],
  },

  // ── Settings ──
  {
    topic: 'How to update your account settings?',
    part: 'Settings',
    steps: [
      'Click "Settings" in the sidebar to open the Settings page.',
      'You can update your display name and other personal preferences here.',
      'To change your password, enter your current password, then enter and confirm your new password.',
      'Click "Save Changes" to apply your updates.',
      'Changes to your name will be reflected across the system immediately after saving.',
    ],
  },
  {
    topic: 'How to reset a forgotten password?',
    part: 'Settings',
    steps: [
      'On the Login screen, click the "Forgot Password?" link below the login form.',
      'Enter the email address associated with your account.',
      'An Admin must authorize the password reset using their Admin Passkey.',
      'Once authorized, a new temporary password will be set for your account.',
      'Log in with the temporary password and change it immediately via the Settings page.',
    ],
  },

  // ── Account ──
  {
    topic: 'How to view your Account details?',
    part: 'Account',
    steps: [
      'Click "Account" in the sidebar to open your Account page.',
      'Your Account page displays your personal information: name, employee ID, email, and role.',
      'This page is for viewing purposes — to make changes, go to the Settings page.',
    ],
  },
];

export default function StaffHelp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activePart,  setActivePart]  = useState('');
  const [showFilter,  setShowFilter]  = useState(false);
  const [viewingItem, setViewingItem] = useState(null);

  const filtered = useMemo(() => {
    return HELP_DATA.filter(item => {
      const matchesPart   = !activePart || item.part === activePart;
      const matchesSearch = !searchQuery.trim() ||
        item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.part.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPart && matchesSearch;
    });
  }, [searchQuery, activePart]);

  return (
    <div className="flex w-full h-full">
      <StaffSidebar activePage="staffhelp" />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-5 shrink-0">Help</h1>

        {/* Search + Filter row */}
        <div className="flex items-center gap-4 mb-5 shrink-0">
          <div className="flex items-center gap-2 flex-1 border-b border-gray-300 pb-1">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search here"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xl transition-colors ${
                activePart || showFilter
                  ? 'bg-[#3ca4c7] text-white hover:bg-[#2b8aa8]'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Filter size={16} /> Filter List
            </button>

            {showFilter && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-52 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xl font-semibold text-gray-700">Filter by Part</span>
                  {activePart && (
                    <button
                      onClick={() => { setActivePart(''); setShowFilter(false); }}
                      className="text-xl text-red-400 hover:text-red-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {PARTS.map(part => (
                  <button
                    key={part}
                    onClick={() => { setActivePart(part === activePart ? '' : part); setShowFilter(false); }}
                    className={`w-full text-left px-4 py-3 text-xl transition-colors flex items-center justify-between ${
                      activePart === part
                        ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {part}
                    {activePart === part && <CheckCircle2 size={16} className="text-[#3ca4c7]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active filter chip */}
        {activePart && (
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <span className="text-xl text-gray-500">Filtered by:</span>
            <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
              {activePart}
              <button onClick={() => setActivePart('')} className="hover:text-[#2b8aa8] transition-colors ml-1">
                <X size={14} />
              </button>
            </span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          {/* Column headers */}
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[55%] text-xl font-semibold text-gray-800 text-center">Topic</span>
            <span className="w-[24%] text-xl font-semibold text-gray-800 text-center">Part</span>
            <span className="w-[20%] text-xl font-semibold text-gray-800 text-center">Action</span>
          </div>

          {/* Scrollable card rows */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {filtered.length === 0 ? (
              <p className="py-12 text-gray-400 text-xl text-center">No instructions found.</p>
            ) : (
              filtered.map(item => (
                <div
                  key={item.topic}
                  className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5"
                >
                  <span className="w-[55%] text-xl text-gray-700 text-center">{item.topic}</span>
                  <span className="w-[25%] text-xl text-gray-500 text-center">{item.part}</span>
                  <div className="w-[20%] flex justify-center">
                    <button
                      onClick={() => setViewingItem(item)}
                      className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-6 py-1.5 rounded-full text-xl transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── View Instruction Modal ── */}
      {viewingItem && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setViewingItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[820px] max-h-[88vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-8 py-6 border-b border-gray-200 shrink-0">
              <div>
                <span className="inline-block bg-[#3ca4c7]/10 text-[#3ca4c7] text-lg font-semibold px-3 py-1 rounded-full mb-2">
                  {viewingItem.part}
                </span>
                <h3 className="text-2xl font-bold text-gray-900 leading-snug">{viewingItem.topic}</h3>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors mt-1 shrink-0 ml-6"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-3" style={{ scrollbarGutter: 'stable' }}>
              {viewingItem.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#3ca4c7] text-white text-lg font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xl text-gray-700 leading-relaxed pt-0.5">{step}</p>
                </div>
              ))}
            </div>

            <div className="px-8 py-5 border-t border-gray-100 flex justify-end shrink-0">
              <button
                onClick={() => setViewingItem(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-2.5 rounded-full text-xl font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away to close filter */}
      {showFilter && (
        <div className="fixed inset-0 z-20" onClick={() => setShowFilter(false)} />
      )}
    </div>
  );
}
