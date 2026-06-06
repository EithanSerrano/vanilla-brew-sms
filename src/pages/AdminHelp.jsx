import { useState, useMemo } from 'react';
import { Search, Filter, X, CheckCircle2 } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

const PARTS = ['Dashboard', 'Inventory', 'Menu Categories', 'Menu Items', 'Promotions', 'Manage Accounts', 'Audit Logs', 'Documents', 'Settings'];

const HELP_DATA = [
  // ── Dashboard ──
  {
    topic: 'How to navigate the Dashboard?',
    part: 'Dashboard',
    steps: [
      'Click "Dashboard" in the sidebar to open the Dashboard page.',
      'The left panel shows Sales History — all recorded transactions sorted by date.',
      'Use the search bar at the top of Sales History to look up a transaction by its Sales ID.',
      'Click "Filter the List" to narrow transactions by date, date range, or order mode.',
      'Click "View" on any transaction row to see full details: order items, customer info, and payment method.',
      'Click "Download Receipt" inside the view modal to save the receipt as a .txt file.',
      'The top-right panel shows Sales Analytics — the top 5 most ordered menu items for the current week.',
      'Click the expand icon (⤢) on Sales Analytics to open a full modal with date-filtered analytics and a pie chart breakdown.',
      'The bottom-right panel shows Critical Stock — inventory items currently at their lowest stock levels.',
      'Click the expand icon (⤢) on Critical Stock to view the complete stock list sorted by level.',
      'Click the refresh icon (↺) on any panel to reload its data.',
    ],
  },
  {
    topic: 'How to use Sales Analytics?',
    part: 'Dashboard',
    steps: [
      'On the Dashboard, locate the "Sales Analytics" panel on the right side.',
      'By default it shows the top 5 best-selling items for the past 7 days.',
      'Click the expand icon (⤢) at the top-right of the panel to open the full modal.',
      'In the modal, set a specific date to view analytics for that single day.',
      'Check the "Range" checkbox and set an end date to view analytics across a date range.',
      'The left side shows a pie chart with color-coded slices per menu item.',
      'The legend below the chart shows each item\'s percentage share of total orders.',
      'The right side shows a ranked list with order counts per item.',
      'Close the modal by clicking the X button.',
    ],
  },

  // ── Inventory ──
  {
    topic: 'How to view and filter the Inventory?',
    part: 'Inventory',
    steps: [
      'Click "Inventory" in the sidebar to open the Inventory page.',
      'The list shows both Materials and Ingredients together by default.',
      'Use the search bar to filter items by name or ID.',
      'Click "Filter" to open the filter panel. Select a type (Material or Ingredient) or a status to narrow the list.',
      'Status options: Normal Supply (green), Low Supply (red), Low Supply / Expiring (orange), Normal Supply / Expiring (yellow).',
      'Toggle the switch at the top left to switch between the Active and Inactive (hidden) lists.',
      'Each row shows the item\'s ID, name, category, stock quantity, status, and last updated date.',
      'Click the refresh icon (↺) to reload the list.',
    ],
  },
  {
    topic: 'How to add a new Material?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, click the "+ New Material" button at the top.',
      'Enter the material name.',
      'Enter the Starting Quantity — the initial stock amount.',
      'Enter the Maximum Limit — the threshold used to flag the item as "Low Supply" when stock falls below 10% of this value.',
      'If the starting quantity exceeds the maximum limit, a notice will appear. You may still proceed.',
      'Click "Save Material", review the confirmation dialog, and click "Confirm" to save.',
      'The new material will appear in the inventory list immediately.',
    ],
  },
  {
    topic: 'How to add a new Ingredient?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, click the "+ New Ingredient" button.',
      'Enter the ingredient name.',
      'Select the ingredient type: Dry, Frozen, or Wet.',
      'Set the Maximum Limit and choose the unit of measurement (grams, mL, pumps, or scoops).',
      'Check "Consider Ingredient as an Add-On?" if it can be offered as an optional add-on for menu items.',
      'Check "Ingredient Has Levels?" if the POS should let customers choose a level (0%, 25%, 50%, 75%, 100%).',
      'Set the expiration date of the first batch and enter its quantity.',
      'If the batch quantity exceeds the maximum limit, a notice will appear. You may still proceed.',
      'Click "Save Ingredient", then confirm in the dialog to save.',
    ],
  },
  {
    topic: 'How to Resupply an item?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, locate the item to resupply and click the "Resupply" button on its row.',
      'For a Material: enter the amount to add. The new total stock is shown next to the field.',
      'For an Ingredient: enter a new batch\'s expiration date and quantity (maximum 3 batches at a time).',
      'If the new total would exceed the maximum limit, an orange notice will appear — you may still confirm.',
      'Click "Confirm", then confirm again in the dialog to apply the resupply.',
      'The stock level updates immediately.',
    ],
  },
  {
    topic: 'How to Adjust an item\'s stock?',
    part: 'Inventory',
    steps: [
      'On the Inventory page, click the "Adjust" button on the item\'s row.',
      'For a Material: the current stock is shown. Enter the corrected quantity in the "New quantity" field.',
      'For an Ingredient: use the arrow buttons to navigate between batches, then enter the corrected quantity for each batch.',
      'If the adjusted total exceeds the maximum limit, an orange notice will appear — you may still confirm.',
      'Enter an optional reason in the "Reason" field for audit log purposes.',
      'Click "Confirm", then confirm again in the dialog to apply the change.',
      'The adjustment is recorded in the Audit Logs with the reason provided.',
    ],
  },
  {
    topic: 'How to Hide and Retrieve an item?',
    part: 'Inventory',
    steps: [
      'To hide an item, click the three-dot menu (⋮) on its row and select "Hide".',
      'A dialog will appear listing any connected menu items that will be affected.',
      'Choose how to handle each connected menu item: remove it from connections or mark it as Unavailable.',
      'Click "Confirm and Hide" to proceed. The item moves to the Inactive list.',
      'To retrieve a hidden item, toggle the list view to show inactive items using the switch at the top.',
      'Locate the item in the inactive list and click "Retrieve".',
      'For a Material: enter the new starting quantity. For an Ingredient: set a new batch with an expiration date and quantity.',
      'Confirm the retrieval. The item becomes active again.',
    ],
  },

  // ── Menu Categories ──
  {
    topic: 'How to create a Menu Category?',
    part: 'Menu Categories',
    steps: [
      'Navigate to Administrative → Menu Categories in the sidebar.',
      'Click the "+ New Category" button.',
      'Enter the Category Name (e.g., Milk Tea, Coffee, Shawarma).',
      'If this category will NOT have subcategories, add its Variants / Sizes (e.g., Small, Regular, Large). These become the size options for all menu items in this category.',
      'If this category WILL have subcategories, check the "This category will have subcategories" box. Variants are defined on each subcategory instead.',
      'For each subcategory, enter its name and its own set of variants/sizes.',
      'Click "Save Category", review the confirmation summary, and click "Confirm" to save.',
      'The new category (and subcategories) will appear in the list immediately.',
    ],
  },
  {
    topic: 'How to edit a Menu Category?',
    part: 'Menu Categories',
    steps: [
      'On the Menu Categories page, find the category you want to update.',
      'Click the "Edit" button on its row.',
      'Update the Category Name and/or its Variants / Sizes as needed.',
      'If you rename a category, an orange notice will warn you that all menu items in that category will be updated automatically.',
      'Variants shown in the edit form only apply to categories that do not have subcategories.',
      'If you close the form with unsaved changes, a discard confirmation dialog will appear.',
      'Click "Save Changes", then confirm in the dialog to apply.',
    ],
  },
  {
    topic: 'How to hide and retrieve a Menu Category?',
    part: 'Menu Categories',
    steps: [
      'On the Menu Categories page, click the "Hide" button on the category row.',
      'If there are menu items in that category, a list of those items will be shown — they will be marked as Unavailable when the category is hidden.',
      'Confirm the action. The category moves to the inactive list.',
      'To view inactive categories, toggle the switch at the top left to "Showing Inactive List".',
      'Click "Retrieve" on the category row and confirm to restore it to the active list.',
      'Note: Retrieving a category does not automatically re-enable the menu items that were marked Unavailable — those must be re-enabled manually.',
    ],
  },

  // ── Menu Items ──
  {
    topic: 'How to add a new Menu Item?',
    part: 'Menu Items',
    steps: [
      'Navigate to Administrative → Menu Items in the sidebar.',
      'Click the "+ New Menu Item" button at the top.',
      'Step 1 — General Info: Enter the menu item name and select its Menu Category.',
      'The variants defined for the selected category will appear as checkboxes. Check the sizes this item is available in.',
      'For each checked variant, enter the price in the price field next to it.',
      'If the selected category has no variants defined, an orange notice will appear. Add variants to the category first before proceeding.',
      'To add optional add-ons, click "Add another Add-On", select an add-on ingredient, and enter the amount and price.',
      'Click "Next" to proceed to Step 2 — Connections.',
      'Step 2 shows each checked variant one at a time. Use the arrow buttons to navigate between them.',
      'For each variant, click "Add an Ingredient" or "Add a Material" to link what is consumed per order, and specify the quantity.',
      'Click "Confirm" once all connections are done, then confirm in the dialog to save.',
    ],
  },
  {
    topic: 'How to edit a Menu Item?',
    part: 'Menu Items',
    steps: [
      'On the Menu Items page, locate the item to update and click the "Edit" button on its row.',
      'The same two-step form opens, pre-filled with the current data.',
      'In Step 1, you can change the item name, category, checked variants, prices, and add-ons.',
      'Changing the category will reset the variant checkboxes to match the new category\'s variants. Any existing connections for variants no longer in the category will be shown as legacy (not in category).',
      'Proceed to Step 2 to update ingredient and material connections per variant.',
      'Click "Save Changes" and confirm in the dialog to apply.',
    ],
  },
  {
    topic: 'How to manage Menu Item availability?',
    part: 'Menu Items',
    steps: [
      'On the Menu Items page, each item displays its status: Available, Low Supply, or Unavailable.',
      '"Available" — all connected ingredients and materials have sufficient stock.',
      '"Low Supply" — at least one connected item is below its stock threshold.',
      '"Unavailable" — the item was manually marked unavailable, or its category was hidden.',
      'To manually mark an item as unavailable, click "Mark as Unavailable" on its row.',
      'To re-enable it, click "Mark as Available" on the same row.',
      'To view all variants, connections, and add-ons, click the "View" button on the row.',
      'To hide an item from the active list, click "Hide" and confirm.',
      'To restore a hidden item, toggle to the Inactive list and click "Retrieve".',
    ],
  },

  // ── Promotions ──
  {
    topic: 'How to create a Menu Item promotion?',
    part: 'Promotions',
    steps: [
      'Navigate to Administrative → Promotions in the sidebar.',
      'Click the "+ New Promo" button.',
      'Select "Menu Item" as the Promo Type.',
      'Optionally enter a Promo Name. If left blank, one will be auto-generated from the item and variant.',
      'Select the Menu Item from the dropdown.',
      'Select the Variant / Size the promotion applies to.',
      'Set the Buy Quantity (minimum 2) — the number of units a customer must purchase to get the deal.',
      'Set the Bundle Price — the total price for that quantity.',
      'Review the live preview (e.g., "Buy 2× Classic Milk Tea (Regular) for ₱99").',
      'Click "Save Promo", then confirm in the dialog to save.',
    ],
  },
  {
    topic: 'How to create a Menu Category promotion?',
    part: 'Promotions',
    steps: [
      'Navigate to Administrative → Promotions in the sidebar.',
      'Click the "+ New Promo" button.',
      'Select "Menu Category" as the Promo Type.',
      'Optionally enter a Promo Name.',
      'Select the Menu Category from the dropdown. Categories are grouped by parent/subcategory.',
      'Select the Variant / Size the promotion applies to (populated from the category\'s defined variants).',
      'Set the Buy Quantity (minimum 2) and the Bundle Price.',
      'Review the live preview (e.g., "Buy 2× any Milk Tea (Regular) for ₱99").',
      'Click "Save Promo" and confirm in the dialog to save.',
    ],
  },
  {
    topic: 'How to edit, archive, and retrieve a promotion?',
    part: 'Promotions',
    steps: [
      'On the active Promotions list, click "Edit" on any promo to open it for changes.',
      'Update the fields as needed and click "Save Changes", then confirm.',
      'To archive a promo (deactivate without deleting), click "Archive" on its row and confirm.',
      'Archived promos move to the Archived List. Toggle the switch at the top left to view them.',
      'To restore an archived promo, click "Retrieve" on its row and confirm.',
      'Retrieved promos return to the active list immediately.',
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
      'Inform the new employee to change their password upon first login via the Settings page.',
    ],
  },
  {
    topic: 'How to manage and deactivate accounts?',
    part: 'Manage Accounts',
    steps: [
      'On the Manage Accounts page, all registered users are listed with their name, email, role, and status.',
      'To edit an account\'s name or role, click the edit icon on that row.',
      'To deactivate an account, select "Deactivate" from the account\'s action options.',
      'Deactivated accounts cannot log in until reactivated by an Admin.',
      'Toggle the view to show inactive accounts, then click "Reactivate" to restore access.',
      'Only Admins can create, edit, deactivate, or reactivate accounts.',
    ],
  },

  // ── Audit Logs ──
  {
    topic: 'How to view and search Audit Logs?',
    part: 'Audit Logs',
    steps: [
      'Navigate to Maintenance → Audit Logs in the sidebar.',
      'Audit Logs record every significant action in the system: stock changes, item additions, account updates, promotions, and more.',
      'Each entry shows the action type, the affected item, who performed it, and the timestamp.',
      'Use the search bar to find logs by item name, action type, or user.',
      'Use the Filter button to narrow logs by action category (e.g., ADD, ADJUST, RESUPPLY, HIDE, EDIT).',
      'Use the date filter to view logs within a specific date or range.',
      'Click "View" on any entry to see the full details of the change.',
      'Audit logs are permanent and cannot be deleted or edited.',
    ],
  },

  // ── Documents ──
  {
    topic: 'How to use Documents?',
    part: 'Documents',
    steps: [
      'Navigate to Maintenance → Documents in the sidebar.',
      'Documents stores downloadable reports and system-generated files.',
      'Click on a document row to view its details.',
      'Click "Download" to save the file to your device.',
      'Documents may include inventory reports, sales summaries, and audit exports.',
      'Contact your system administrator if a required document is not listed.',
    ],
  },

  // ── Settings ──
  {
    topic: 'How to update your account settings?',
    part: 'Settings',
    steps: [
      'Click "Settings" in the sidebar.',
      'Update your display name or other personal preferences as needed.',
      'To change your password, enter your current password, then enter and confirm the new one.',
      'Click "Save Changes" to apply. Your name updates in the sidebar immediately.',
    ],
  },
  {
    topic: 'How to reset a forgotten password?',
    part: 'Settings',
    steps: [
      'On the Login screen, click the "Forgot Password?" link.',
      'Enter the email address for the account.',
      'An Admin must enter their Admin Passkey to authorize the reset.',
      'Once authorized, a new temporary password is set.',
      'The user should log in with the temporary password and change it immediately in Settings.',
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
