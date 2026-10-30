import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, AlignJustify, Filter, RefreshCw, X, ChevronDown } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

const ACTION_LABELS = {
  ADD_MATERIAL:      'Add Material in Inventory',
  ADD_INGREDIENT:    'Add Ingredient in Inventory',
  HIDE:              'Archive Item in Inventory',
  RETRIEVE:          'Restore Item in Inventory',
  RESUPPLY:          'Resupply in Inventory',
  ADJUST:            'Adjust Stock in Inventory',
  EDIT:              'Edit Item in Inventory',
  ADD_CATEGORY:      'Add Category',
  ADD_SUBCATEGORY:   'Add Subcategory',
  EDIT_CATEGORY:     'Edit Category',
  HIDE_CATEGORY:     'Hide Category',
  RETRIEVE_CATEGORY: 'Retrieve Category',
  CREATE_ACCOUNT:    'Create Employee Account',
  DEACTIVATE_ACCOUNT:'Deactivate Employee Account',
  REACTIVATE_ACCOUNT:'Reactivate Employee Account',
  EDIT_ACCOUNT:      'Edit Employee Account',
  CANCEL_ORDER:      'Cancel Order',
  WASTAGE:           'Record Wastage',
  CLOCK_IN:          'Clock In',
  CLOCK_OUT:         'Clock Out',
};

function splitTimestamp(ts) {
  if (!ts) return { date: '—', time: '—' };
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return { date: '—', time: '—' };
  return {
    date: d.toLocaleDateString('en-US'),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    raw: d,
  };
}

function renderDetails(log) {
  const d = log.details || {};
  switch (log.action) {
    case 'ADD_MATERIAL':
      return [
        { label: 'Size',          value: d.size || '—' },
        { label: 'Starting Qty',  value: d.startingQty != null ? `${d.startingQty} units` : '—' },
        { label: 'Max Limit',     value: d.maxLimit ? `${d.maxLimit} units` : '—' },
      ];
    case 'ADD_INGREDIENT':
      return [
        { label: 'Type',          value: d.type || '—' },
        { label: 'Unit',          value: d.unit || '—' },
        { label: 'Max Limit',     value: d.maxLimit ? `${d.maxLimit} ${d.unit || 'units'}` : '—' },
        { label: 'Batch ID',      value: d.batchId || '—' },
        { label: 'Quantity',      value: d.quantity != null ? `${d.quantity} ${d.unit || 'units'}` : '—' },
      ];
    case 'HIDE':
      return [
        { label: 'Connected Items Affected', value: d.connectedItemsAffected ?? 0 },
      ];
    case 'RETRIEVE':
      if (log.itemType === 'material') {
        return [{ label: 'New Quantity', value: `${d.newQty ?? 0} units` }];
      }
      return [
        { label: 'Batch ID',         value: d.batchId || '—' },
        { label: 'Expiration Date',  value: d.expirationDate || '—' },
        { label: 'Quantity',         value: d.quantity != null ? String(d.quantity) : '—' },
      ];
    case 'RESUPPLY':
      if (log.itemType === 'material') {
        return [
          { label: 'Previous Stock', value: `${d.previousStock ?? 0} units` },
          { label: 'Amount Added',   value: `${d.amountAdded ?? 0} units` },
          { label: 'New Stock',      value: `${d.newStock ?? 0} units` },
        ];
      }
      return [
        { label: 'Batch ID',        value: d.batchId || '—' },
        { label: 'Expiration Date', value: d.expirationDate || '—' },
        { label: 'Quantity Added',  value: d.quantity != null ? String(d.quantity) : '—' },
      ];
    case 'ADJUST':
      if (log.itemType === 'material') {
        return [
          { label: 'Previous Qty', value: `${d.previousQty ?? 0} units` },
          { label: 'New Qty',      value: `${d.newQty ?? 0} units` },
          { label: 'Reason',       value: d.reason || '—' },
        ];
      }
      return [
        ...(d.batches || []).map((b, i) => ({
          label: `Batch ${i + 1}${b.batchId ? ` (${b.batchId})` : ''}`,
          value: `${b.previousQty ?? 0} → ${b.newQty ?? 0}`,
        })),
        { label: 'Reason', value: d.reason || '—' },
      ];
    case 'EDIT':
      return [
        d.previousName !== d.newName
          ? { label: 'Name',      value: `${d.previousName} → ${d.newName}` }
          : { label: 'Name',      value: d.newName || '—' },
        { label: 'Max Limit',     value: `${d.previousMaxLimit ?? 0} → ${d.newMaxLimit ?? 0}` },
        ...(d.previousType != null ? [{ label: 'Type', value: `${d.previousType} → ${d.newType}` }] : []),
        ...(d.previousUnit != null ? [{ label: 'Unit', value: `${d.previousUnit} → ${d.newUnit}` }] : []),
        ...(d.previousIsAddOn != null ? [{ label: 'Is Add-On', value: `${d.previousIsAddOn} → ${d.newIsAddOn}` }] : []),
      ];
    case 'CREATE_ACCOUNT':
      return [
        { label: 'Full Name', value: d.fullName || '—' },
        { label: 'Email',     value: d.email    || '—' },
      ];
    case 'DEACTIVATE_ACCOUNT':
    case 'REACTIVATE_ACCOUNT':
      return [
        { label: 'Full Name', value: d.fullName || '—' },
        { label: 'Email',     value: d.email    || '—' },
      ];
    case 'EDIT_CATEGORY':
      return [
        d.oldName !== d.newName
          ? { label: 'Name', value: `${d.oldName || '—'} → ${d.newName || '—'}` }
          : { label: 'Name', value: d.newName || '—' },
        {
          label: 'Variants',
          value: Array.isArray(d.variants) && d.variants.length > 0
            ? d.variants.map(v => (typeof v === 'object' ? v.name : v)).filter(Boolean).join(', ')
            : '—',
        },
      ];
    case 'ADD_CATEGORY':
      return [
        { label: 'Is Parent', value: d.isParent ? 'Yes' : 'No' },
        {
          label: 'Variants',
          value: Array.isArray(d.variants) && d.variants.length > 0
            ? d.variants.map(v => (typeof v === 'object' ? v.name : v)).filter(Boolean).join(', ')
            : '—',
        },
        ...(Array.isArray(d.subcategories) && d.subcategories.length > 0
          ? [{ label: 'Subcategories', value: d.subcategories.join(', ') }]
          : []),
      ];
    case 'ADD_SUBCATEGORY':
      return [
        { label: 'Parent Category', value: d.parentCategory || '—' },
        {
          label: 'Variants',
          value: Array.isArray(d.variants) && d.variants.length > 0
            ? d.variants.map(v => (typeof v === 'object' ? v.name : v)).filter(Boolean).join(', ')
            : '—',
        },
      ];
    case 'HIDE_CATEGORY':
      return [
        { label: 'Affected Menu Items', value: d.affectedItems ?? '—' },
      ];
    case 'RETRIEVE_CATEGORY':
      return [];
    case 'EDIT_ACCOUNT':
      return [
        { label: 'Full Name',     value: `${d.previousFullName || '—'} → ${d.newFullName || '—'}` },
        { label: 'Display Name',  value: `${d.previousDisplayName || '—'} → ${d.newDisplayName || '—'}` },
      ];
    default:
      if (typeof d !== 'object' || d === null) {
        return [{ label: 'Details', value: String(d) }];
      }
      return Object.entries(d).map(([k, v]) => ({
        label: k,
        value: Array.isArray(v)
          ? v.map(item => typeof item === 'object' && item !== null ? (item.name || JSON.stringify(item)) : String(item)).join(', ')
          : typeof v === 'object' && v !== null
            ? JSON.stringify(v)
            : String(v),
      }));
  }
}

export default function Maintenance() {
  const [logs,        setLogs]        = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLog,     setViewLog]     = useState(null);

  // ── Arrange ──
  const [sortField,   setSortField]   = useState('timestamp');
  const [sortDir,     setSortDir]     = useState('desc');
  const [showArrange, setShowArrange] = useState(false);

  // ── Filter ──
  const [showFilter,     setShowFilter]     = useState(false);
  const [filterDate,     setFilterDate]     = useState('');
  const [filterRangeEnd, setFilterRangeEnd] = useState('');
  const [filterIsRange,  setFilterIsRange]  = useState(false);
  const [filterAction,   setFilterAction]   = useState('');
  const [filterPerformer,setFilterPerformer]= useState('');

  const loadData = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'auditlog'), orderBy('timestamp', 'desc')));
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('Audit log load error:', e); }
  };
  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const close = () => setShowArrange(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Derived values ──
  const actionTypes = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();
  const performers  = [...new Set(logs.map(l => l.performedBy).filter(Boolean))].sort();

  const isFiltered = !!(filterDate || filterAction || filterPerformer);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const displayed = logs
    .filter(l => {
      const label = ACTION_LABELS[l.action] || l.action || '';
      const q = searchQuery.toLowerCase();
      if (searchQuery && !(
        label.toLowerCase().includes(q) ||
        (l.itemName || '').toLowerCase().includes(q) ||
        (l.performedBy || '').toLowerCase().includes(q)
      )) return false;
      if (filterAction && l.action !== filterAction) return false;
      if (filterPerformer && l.performedBy !== filterPerformer) return false;
      if (filterDate) {
        const ts = splitTimestamp(l.timestamp);
        if (!ts.raw) return false;
        if (filterIsRange && filterRangeEnd) {
          const start = new Date(filterDate); start.setHours(0, 0, 0, 0);
          const end   = new Date(filterRangeEnd); end.setHours(23, 59, 59, 999);
          if (ts.raw < start || ts.raw > end) return false;
        } else {
          if (!isSameDay(ts.raw, new Date(filterDate))) return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      let av, bv;
      if (sortField === 'action') {
        av = (ACTION_LABELS[a.action] || a.action || '').toLowerCase();
        bv = (ACTION_LABELS[b.action] || b.action || '').toLowerCase();
      } else if (sortField === 'performedBy') {
        av = (a.performedBy || '').toLowerCase();
        bv = (b.performedBy || '').toLowerCase();
      } else {
        const ta = splitTimestamp(a.timestamp).raw || new Date(0);
        const tb = splitTimestamp(b.timestamp).raw || new Date(0);
        av = ta; bv = tb;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const clearFilters = () => {
    setFilterDate(''); setFilterRangeEnd(''); setFilterIsRange(false);
    setFilterAction(''); setFilterPerformer('');
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Audit Logs</h1>
          <div className="flex items-center justify-between">
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-gray-300 pb-1 flex-1 mr-6">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search here"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Arrange */}
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowArrange(v => !v); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl transition-colors ${
                    showArrange ? 'bg-[#3ca4c7] text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <AlignJustify size={16} /> Arrange
                </button>
                {showArrange && (
                  <div
                    className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-60 py-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="px-4 pt-1 pb-2 text-lg font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">Sort by</p>
                    {[
                      { field: 'timestamp',   labelAsc: 'Date (Oldest)',   labelDesc: 'Date (Newest)' },
                      { field: 'action',      labelAsc: 'Type (A → Z)',    labelDesc: 'Type (Z → A)' },
                      { field: 'performedBy', labelAsc: 'Done by (A → Z)', labelDesc: 'Done by (Z → A)' },
                    ].map(({ field, labelAsc, labelDesc }) => (
                      <div key={field}>
                        {[{ dir: 'asc', label: labelAsc }, { dir: 'desc', label: labelDesc }].map(({ dir, label }) => (
                          <button
                            key={dir}
                            onClick={() => { setSortField(field); setSortDir(dir); setShowArrange(false); }}
                            className={`w-full px-4 py-2.5 text-left text-xl transition-colors ${
                              sortField === field && sortDir === dir
                                ? 'text-[#3ca4c7] font-semibold bg-blue-50'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter */}
              <button
                onClick={() => setShowFilter(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl transition-colors ${
                  isFiltered || showFilter
                    ? 'bg-[#3ca4c7] text-white hover:bg-[#2b8aa8]'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <Filter size={16} /> Filter List
              </button>

              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilter && (
            <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-5 items-end">
              {/* Date */}
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-xl font-medium text-gray-600">{filterIsRange ? 'Start Date' : 'Date'}</label>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input type="checkbox" id="filterRange" checked={filterIsRange} onChange={e => setFilterIsRange(e.target.checked)}
                  className="w-4 h-4 accent-[#3ca4c7]" />
                <label htmlFor="filterRange" className="text-xl text-gray-600 select-none cursor-pointer">Date range</label>
              </div>
              {filterIsRange && (
                <div className="flex flex-col gap-1.5 min-w-[160px]">
                  <label className="text-xl font-medium text-gray-600">End Date</label>
                  <input type="date" value={filterRangeEnd} onChange={e => setFilterRangeEnd(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
              )}

              {/* Action type */}
              <div className="flex flex-col gap-1.5 min-w-[220px]">
                <label className="text-xl font-medium text-gray-600">Action Type</label>
                <div className="relative">
                  <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]">
                    <option value="">All types</option>
                    {actionTypes.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Done by */}
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-xl font-medium text-gray-600">Done by</label>
                <div className="relative">
                  <select value={filterPerformer} onChange={e => setFilterPerformer(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]">
                    <option value="">All</option>
                    {performers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {isFiltered && (
                <button onClick={clearFilters}
                  className="pb-2 text-xl text-gray-500 hover:text-gray-700 underline transition-colors">
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0 shadow-md">
          <div className="flex items-center px-8 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[14%] text-xl font-semibold text-gray-800 text-center">Date</span>
            <span className="w-[12%] text-xl font-semibold text-gray-800 text-center">Time</span>
            <span className="w-[32%] text-xl font-semibold text-gray-800 text-center">Type</span>
            <span className="w-[24%] text-xl font-semibold text-gray-800 text-center">Done by</span>
            <span className="flex-1  text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {displayed.length === 0 && (
              <p className="py-12 text-gray-400 text-xl text-center">No audit logs found.</p>
            )}
            {displayed.map(log => {
              const { date, time } = splitTimestamp(log.timestamp);
              const label = ACTION_LABELS[log.action] || log.action || '—';
              return (
                <div key={log.id} className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5">
                  <span className="w-[14%] text-xl text-gray-700 text-center">{date}</span>
                  <span className="w-[12%] text-xl text-gray-500 text-center">{time}</span>
                  <span className="w-[32%] text-xl text-gray-700 text-center">{label}</span>
                  <span className="w-[24%] text-xl text-gray-700 text-center">{log.performedBy || '—'}</span>
                  <div className="flex-1 flex justify-center">
                    <button
                      onClick={() => setViewLog(log)}
                      className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-6 py-1.5 rounded-full text-xl transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          VIEW LOG MODAL
      ══════════════════════════════════════════ */}
      {viewLog && (() => {
        const { date, time } = splitTimestamp(viewLog.timestamp);
        const label = ACTION_LABELS[viewLog.action] || viewLog.action || '—';
        const details = renderDetails(viewLog);
        const isAuthAction = /login|logout/i.test(viewLog.action || '');
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
                <h3 className="text-2xl font-semibold text-gray-800">Audit Log Details</h3>
                <button onClick={() => setViewLog(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
              </div>
              <div className="px-10 py-8 flex flex-col gap-5">

                {/* General info */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                  {[
                    { label: 'Date & Time',   value: `${date} ${time}` },
                    { label: 'Action',        value: label },
                    ...(!isAuthAction ? [
                      { label: 'Item Type', value: viewLog.itemType ? (viewLog.itemType.charAt(0).toUpperCase() + viewLog.itemType.slice(1)) : '—' },
                      { label: 'Item ID',   value: viewLog.itemId || '—' },
                      { label: 'Item Name', value: viewLog.itemName || '—' },
                    ] : []),
                    { label: 'Performed by',  value: viewLog.performedBy || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start px-5 py-3 gap-4">
                      <span className="w-36 text-xl font-medium text-gray-500 shrink-0">{label}</span>
                      <span className="flex-1 text-xl text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Action-specific details */}
                {details.length > 0 && (
                  <>
                    <p className="text-xl font-semibold text-gray-700">Action Details</p>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                      {details.map(({ label, value }) => (
                        <div key={label} className="flex items-start px-5 py-3 gap-4">
                          <span className="w-44 text-xl font-medium text-gray-500 shrink-0 break-words">{label}</span>
                          <span className="flex-1 text-xl text-gray-800 break-words">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={() => setViewLog(null)}
                  className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xl font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}