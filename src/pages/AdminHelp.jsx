import { useState, useMemo } from 'react';
import { Search, Filter, X, CheckCircle2 } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

const PARTS = ['Dashboard', 'Inventory', 'Menu Items', 'Manage Accounts', 'Audit Logs', 'Documents', 'Settings'];

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
      'The bottom-right panel shows Critical Stock — inventory items with the lowest remaining stock levels.',
      'Click the expand icon (⤢) on Critical Stock to view the complete list of all stock items sorted by stock level.',
      'Click the refresh icon (↺) on any panel to reload its data from Firestore.',
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
      'The inventory list shows both Materials and Ingredients together by default.',
      'Use the search bar at the top to filter items by name or ID.',
      'Click "Filter" to open the filter panel and select a specific type (Material or Ingredient) to display.',
      'You can also filter by status (Normal, Low, Expiring) using the filter options.',
      'Click the toggle at the top right to switch between viewing Active and Hidden (inactive) items.',
      'Each row shows the item\'s ID, name, type, current stock, status, and available actions.',
      'Stock status is color-coded: Green = Normal Supply, Red = Low Supply, Orange = Expiring.',
    ],
  },
  {
    topic: 'How to add a new Material?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, click the "+ New Material" button at the top of the page.',
      'Enter the material name in the "Name" field.',
      'Enable one or more size variants (Small, Medium, Large) by toggling each size checkbox.',
      'For each enabled size, enter the starting stock quantity.',
      'Set the Max Limit — this is used to determine when the stock is considered "Low" (below 10% of max).',
      'Review your entries, then click "Confirm" to save.',
      'A confirmation dialog will appear. Click "Confirm" again to finalize.',
      'The new material(s) will appear in the inventory list immediately.',
    ],
  },
  {
    topic: 'How to add a new Ingredient?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, click the "+ New Ingredient" button at the top of the page.',
      'Enter the ingredient name in the "Name" field.',
      'Select the ingredient type: Dry, Frozen, or Wet.',
      'Choose the unit of measurement: grams, pumps, or scoops.',
      'Toggle "Is Add-On?" if this ingredient can be offered as an optional add-on on menu items.',
      'Enter the Max Limit to set the threshold for "Low Supply" alerts.',
      'Set the expiration date of the first batch.',
      'Enter the starting quantity for the first batch.',
      'Click "Confirm" to preview your entry, then click "Confirm" again in the dialog to save.',
      'The new ingredient will appear in the inventory list with its batch information.',
    ],
  },
  {
    topic: 'How to Resupply an item?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, locate the material or ingredient you want to resupply.',
      'Click the three-dot menu (⋮) at the right end of the item\'s row.',
      'Select "Resupply" from the dropdown options.',
      'For a Material: enter the additional quantity to add to the current stock.',
      'For an Ingredient: enter a new batch\'s quantity and expiration date (max 3 batches per ingredient).',
      'Review the details and click "Confirm".',
      'Confirm again in the confirmation dialog.',
      'The stock level will be updated immediately and a transaction record will be created.',
    ],
  },
  {
    topic: 'How to Adjust an item\'s stock?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, locate the item whose stock needs correction.',
      'Click the three-dot menu (⋮) at the right end of that item\'s row.',
      'Select "Adjust" from the dropdown options.',
      'For a Material: directly set the new correct stock value.',
      'For an Ingredient: adjust the quantity of a specific batch.',
      'Enter the reason or note for the adjustment if prompted.',
      'Click "Confirm" to preview, then "Confirm" again in the dialog to apply.',
      'The change will be logged in the Audit Logs for traceability.',
    ],
  },
  {
    topic: 'How to Hide and Retrieve an item?',
    part: 'Inventory',
    steps: [
      'To hide an item, click the three-dot menu (⋮) on its row and select "Hide".',
      'Confirm the action in the dialog that appears.',
      'Hidden items are removed from the active list and will no longer affect menu item availability.',
      'Any menu items connected to a hidden ingredient or material will be automatically marked as Unavailable.',
      'To retrieve a hidden item, toggle the view to show Hidden items using the toggle at the top right.',
      'Click the three-dot menu on the hidden item and select "Retrieve".',
      'Enter a new starting quantity for the retrieved item.',
      'Confirm the retrieval. The item becomes active again and connected menu items can be re-enabled.',
    ],
  },

  // ── Menu Items ──
  {
    topic: 'How to add a new Menu Item?',
    part: 'Menu Items',
    steps: [
      'Navigate to Administrative → Menu Items in the sidebar.',
      'Click the "+ New Menu Item" button at the top of the list.',
      'Step 1 — Basic Info: Enter the menu item name and select its category (e.g., Shawarma, Milk Tea, Frappe).',
      'Enable the sizes this item is offered in (Small, Medium, Large) and set a price for each enabled size.',
      'If this item offers optional add-ons, select the ingredient add-ons from the list and set their price.',
      'Click "Next" to proceed to Step 2.',
      'Step 2 — Connections: For each enabled size, select the materials and ingredients required to make it.',
      'For each connection, specify the amount consumed per order (e.g., 200 grams of Milk per Medium).',
      'Use the navigation arrows to move between sizes.',
      'Click "Confirm" when all connections are set, then confirm in the dialog to save.',
    ],
  },
  {
    topic: 'How to view and manage Menu Item availability?',
    part: 'Menu Items',
    steps: [
      'On the Menu Items page, each item displays its current status: Available, Low Supply, or Unavailable.',
      '"Available" means all connected ingredients and materials have sufficient stock.',
      '"Low Supply" means at least one connected item is below its minimum stock threshold.',
      '"Unavailable" means the item has been manually disabled or a connected item is hidden.',
      'To manually toggle availability, click the three-dot menu (⋮) on a row and select "Mark Unavailable" or "Mark Available".',
      'To view the full details and connections of a menu item, click the eye icon (👁) on its row.',
      'To hide a menu item (remove it from service), click the three-dot menu and select "Hide".',
      'Hidden items can be restored by switching to the Inactive view and selecting "Retrieve".',
    ],
  },

  // ── Manage Accounts ──
  {
    topic: 'How to register a new account?',
    part: 'Manage Accounts',
    steps: [
      'Navigate to Administrative → Manage Accounts in the sidebar.',
      'Click the "+ Register Account" button.',
      'Fill in the employee\'s full name, email address, and assigned role (Admin or Staff).',
      'Set a temporary initial password for the new account.',
      'Enter your Admin Passkey to authorize the registration.',
      'Click "Confirm" to create the account.',
      'The new user will receive access with the credentials you set.',
      'Inform the new employee to change their password upon first login via the Settings page.',
    ],
  },
  {
    topic: 'How to manage and deactivate accounts?',
    part: 'Manage Accounts',
    steps: [
      'On the Manage Accounts page, you can see a list of all registered users.',
      'Each account shows the employee name, email, role, and online status.',
      'To edit an account\'s details, click the edit icon on the account row.',
      'To deactivate an account, click the three-dot menu and select "Deactivate".',
      'Deactivated accounts cannot log in until reactivated by an Admin.',
      'To reactivate, switch to the inactive accounts view and click "Reactivate" on that account.',
      'Only Admins have permission to create, edit, deactivate, or reactivate accounts.',
    ],
  },

  // ── Audit Logs ──
  {
    topic: 'How to view Audit Logs?',
    part: 'Audit Logs',
    steps: [
      'Navigate to Maintenance → Audit Logs in the sidebar.',
      'Audit Logs record every significant change made in the system — stock adjustments, item additions, account changes, etc.',
      'Each log entry shows the action type, the item or entity affected, who performed it, and the timestamp.',
      'Use the search bar to search for a specific item name, action, or user.',
      'Use the Filter button to narrow logs by action type (e.g., ADD, ADJUST, RESUPPLY, HIDE).',
      'Use the date filter to view logs within a specific date or date range.',
      'Click "View" on any log entry to see the full before-and-after details of the change.',
      'Audit logs cannot be deleted or edited — they are a permanent record for accountability.',
    ],
  },

  // ── Documents ──
  {
    topic: 'How to use Documents?',
    part: 'Documents',
    steps: [
      'Navigate to Maintenance → Documents in the sidebar.',
      'The Documents section stores downloadable reports and system-generated files.',
      'Click on a document row to view its details.',
      'Click "Download" to save the document to your device.',
      'Documents may include inventory reports, sales summaries, and audit exports.',
      'Contact your system administrator if a document you need is not listed.',
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
      'Changes to your name will be reflected in the sidebar greeting immediately after saving.',
    ],
  },
  {
    topic: 'How to reset a forgotten password?',
    part: 'Settings',
    steps: [
      'On the Login screen, click the "Forgot Password?" link below the login form.',
      'Enter the email address associated with the account.',
      'An Admin must enter their Admin Passkey to authorize the password reset.',
      'Once authorized, a new temporary password can be set for the account.',
      'The user should log in with the new temporary password and then change it immediately via Settings.',
    ],
  },
];

export default function AdminHelp() {
  const [searchQuery,    setSearchQuery]    = useState('');
  const [activePart,     setActivePart]     = useState('');
  const [showFilter,     setShowFilter]     = useState(false);
  const [viewingItem,    setViewingItem]    = useState(null);

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
      <AdminSidebar activePage="help" />

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
            {/* Modal header */}
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

            {/* Steps */}
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

            {/* Footer */}
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
