import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Search, Filter, X, RefreshCw, MoreVertical, AlertTriangle } from 'lucide-react';
import { formatBatchId } from '../utils/idFormats';
import { logRestock, addDaysISO } from '../utils/supply';
import { syncMenuAvailability } from '../utils/menuAvailability';
import StaffSidebar from '../layouts/StaffSidebar';

const STATUS_STYLES = {
  normal:          { label: 'Normal Supply',            className: 'text-[#06BC2E]'  },
  low:             { label: 'Low Supply',               className: 'text-[#DF0C0C]'  },
  expiring_low:    { label: 'Low Supply / Expiring',    className: 'text-orange-600' },
  expiring_normal: { label: 'Normal Supply / Expiring', className: 'text-yellow-600' },
};

const EXPIRING_DAYS = 7;

function computeMaterialStatus(mat) {
  const stock = mat.stock ?? 0;
  const max   = mat.maxLimit || 0;
  if (max === 0) return 'normal';
  return stock < max * 0.1 ? 'low' : 'normal';
}

function computeIngredientStatus(ing) {
  const now    = new Date();
  const cutoff = new Date(now.getTime() + EXPIRING_DAYS * 86400000);
  const bats   = ing.batches || [];
  const max    = ing.maxLimit || 0;
  const total  = bats.reduce((s, b) => s + (b.quantity || 0), 0);
  const isLow  = max > 0 && total < max * 0.1;
  const first  = bats[0];
  const isExp  = first && (first.quantity || 0) > 0 && (() => {
    const e = first.expirationDate?.toDate?.() || (first.expirationDate ? new Date(first.expirationDate) : null);
    return e && e <= cutoff;
  })();
  if (isLow && isExp) return 'expiring_low';
  if (isLow)          return 'low';
  if (isExp)          return 'expiring_normal';
  return 'normal';
}

function computeIngStock(ing) {
  if (!ing.batches) return ing.startingQty ?? ing.stock ?? 0;
  return ing.batches.reduce((s, b) => s + (b.quantity || 0), 0);
}

function sizePrefix(size) { return size ? `(${size[0]}) ` : ''; }

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US');
}

const genBatchId = formatBatchId;

function DiscardDialog({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
        <h3 className="text-2xl font-semibold text-gray-800">Discard Progress?</h3>
        <p className="text-xl text-gray-500">If confirmed, the progress cannot be recovered.</p>
        <div className="flex gap-3 justify-end mt-1">
          <button onClick={onCancel}  className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Discard</button>
        </div>
      </div>
    </div>
  );
}

export default function StaffInventory() {
  // ── Data ──
  const [materials,   setMaterials]   = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filters ──
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterType,      setFilterType]      = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');

  // ── Dropdown ──
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // ── View Batches ──
  const [viewBatchRow, setViewBatchRow] = useState(null);

  // ── Resupply Material ──
  const [resupMatRow,      setResupMatRow]      = useState(null);
  const [resupMatAmount,   setResupMatAmount]   = useState('');
  const [showResupMatForm, setShowResupMatForm] = useState(false);
  const [showResupMatConf, setShowResupMatConf] = useState(false);
  const [showResupMatOk,   setShowResupMatOk]   = useState(false);
  const [showResupMatDisc, setShowResupMatDisc] = useState(false);

  // ── Resupply Ingredient ──
  const [resupIngRow,      setResupIngRow]      = useState(null);
  const [resupIngExpDate,  setResupIngExpDate]  = useState('');
  const [resupIngQty,      setResupIngQty]      = useState('');
  const [resupSupplier,    setResupSupplier]    = useState('');
  const [showResupIngForm, setShowResupIngForm] = useState(false);
  const [showResupIngConf, setShowResupIngConf] = useState(false);
  const [showResupIngOk,   setShowResupIngOk]   = useState(false);
  const [showResupIngDisc, setShowResupIngDisc] = useState(false);

  // ── Adjust ──
  const [adjRow,        setAdjRow]        = useState(null);
  const [adjMatQty,     setAdjMatQty]     = useState('');
  const [adjIngBatches, setAdjIngBatches] = useState([]);
  const [adjBatchIdx,   setAdjBatchIdx]   = useState(0);
  const [adjReason,     setAdjReason]     = useState('');
  const [showAdjForm,   setShowAdjForm]   = useState(false);
  const [showAdjConf,   setShowAdjConf]   = useState(false);
  const [showAdjOk,     setShowAdjOk]     = useState(false);
  const [showAdjDisc,   setShowAdjDisc]   = useState(false);
  const [adjError,      setAdjError]      = useState('');
  const [resupMatError, setResupMatError] = useState('');
  const [resupIngError, setResupIngError] = useState('');

  // ── Load ──
  const loadData = async () => {
    try {
      const [ms, is] = await Promise.all([
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'ingredients')),
      ]);
      const mats = ms.docs.map(d => ({ id: d.id, ...d.data() }));
      const ings = is.docs.map(d => ({ id: d.id, ...d.data() }));
      setMaterials(mats);
      setIngredients(ings);
      syncMenuAvailability({ materials: mats, ingredients: ings });
    } catch (e) { console.error('StaffInventory load error:', e); }
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const close = () => setOpenDropdownId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Audit log ──
  const logAudit = async (action, itemType, itemId, itemName, details = {}) => {
    try {
      let performedBy = 'Unknown';
      const currentUser = auth.currentUser;
      if (currentUser) {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) performedBy = snap.data().name || 'Unknown';
      }
      await addDoc(collection(db, 'auditlog'), {
        action, itemType, itemId, itemName, details, performedBy, timestamp: new Date(),
      });
    } catch (e) { console.error('logAudit error:', e); }
  };

  // ── Derived rows (active only) ──
  const allRows = [
    ...materials
      .filter(m => m.isActive !== false)
      .map(m => ({
        _type: 'material', _docId: m.id,
        displayId:          m.materialId || m.id,
        displayName:        sizePrefix(m.size) + m.name,
        displayCat:         m.size || 'Material',
        displayStock:       String(m.stock ?? 0),
        displayUnit:        'units',
        displayLastUpdated: fmtDate(m.lastUpdated),
        status:  computeMaterialStatus(m),
        raw: m,
      })),
    ...ingredients
      .filter(i => i.isActive !== false && i.archived !== true)
      .map(ing => ({
        _type: 'ingredient', _docId: ing.id,
        displayId:          ing.ingredientId || ing.id,
        displayName:        ing.name,
        displayCat:         ing.category || 'Ingredient',
        displayStock:       String(computeIngStock(ing)),
        displayUnit:        ing.unit || 'units',
        displayLastUpdated: fmtDate(ing.lastUpdated),
        status:  computeIngredientStatus(ing),
        raw: ing,
      })),
  ];

  const isFiltered = !!(filterType || filterStatus);
  const clearFilters = () => { setFilterType(''); setFilterStatus(''); };

  const displayed = allRows
    .filter(r => !searchQuery ||
      r.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(r => !filterType   || r._type  === filterType)
    .filter(r => !filterStatus || r.status === filterStatus);

  // ── Resupply Material ──
  const handleResupMat = row => { setResupMatRow(row); setResupMatAmount(''); setResupSupplier(''); setShowResupMatForm(true); };
  const closeResupMat  = () => { resupMatAmount !== '' ? setShowResupMatDisc(true) : (setShowResupMatForm(false), setResupMatRow(null)); };
  const handleConfirmResupMat = async () => {
    try {
      setResupMatError('');
      const previousStock = resupMatRow.raw.stock || 0;
      const amountAdded   = parseInt(resupMatAmount) || 0;
      const newStock      = previousStock + amountAdded;
      await updateDoc(doc(db, 'materials', resupMatRow._docId), { stock: newStock, lastUpdated: new Date() });
      await logAudit('RESUPPLY', 'material', resupMatRow.displayId, resupMatRow.displayName, { previousStock, amountAdded, newStock });
      await logRestock({
        itemType: 'material', refId: resupMatRow._docId, displayId: resupMatRow.displayId, name: resupMatRow.displayName,
        unit: 'units', quantity: amountAdded, supplier: resupSupplier,
      });
    } catch (e) { console.error('ResupMat error:', e); setResupMatError('Failed to save. Please try again.'); return; }
    await loadData(); setShowResupMatConf(false); setShowResupMatOk(true);
  };

  // ── Resupply Ingredient ──
  const handleResupIng = row => { setResupIngRow(row); setResupIngExpDate(row.raw.shelfLifeDays > 0 ? addDaysISO(row.raw.shelfLifeDays) : ''); setResupIngQty(''); setResupSupplier(''); setShowResupIngForm(true); };
  const closeResupIng  = () => { (resupIngExpDate !== '' || resupIngQty !== '') ? setShowResupIngDisc(true) : (setShowResupIngForm(false), setResupIngRow(null)); };
  const handleConfirmResupIng = async () => {
    try {
      setResupIngError('');
      const existing = resupIngRow.raw.batches || [];
      const batchId  = genBatchId(resupIngExpDate, existing.length);
      const receivedAt = new Date();
      const newBatch = { batchId, expirationDate: new Date(resupIngExpDate), quantity: parseInt(resupIngQty) || 0, createdAt: receivedAt, supplier: resupSupplier.trim(), receivedAt };
      await updateDoc(doc(db, 'ingredients', resupIngRow._docId), { batches: [...existing, newBatch], lastUpdated: new Date() });
      await logAudit('RESUPPLY', 'ingredient', resupIngRow.displayId, resupIngRow.displayName, { batchId, expirationDate: resupIngExpDate, quantity: parseInt(resupIngQty) || 0 });
      await logRestock({
        itemType: 'ingredient', refId: resupIngRow._docId, displayId: resupIngRow.displayId, name: resupIngRow.displayName,
        unit: resupIngRow.raw.unit, batchId, expirationDate: newBatch.expirationDate, quantity: newBatch.quantity, supplier: resupSupplier,
      });
    } catch (e) { console.error('ResupIng error:', e); setResupIngError('Failed to save. Please try again.'); return; }
    await loadData(); setShowResupIngConf(false); setShowResupIngOk(true);
  };

  // ── Adjust ──
  const handleAdjClick = row => {
    setAdjRow(row); setAdjBatchIdx(0); setAdjReason('');
    if (row._type === 'material') {
      setAdjMatQty(String(row.raw.stock ?? ''));
    } else {
      setAdjIngBatches((row.raw.batches || []).map(b => ({ ...b, newQty: String(b.quantity ?? '') })));
    }
    setShowAdjForm(true);
  };
  const adjHasChanges = () => {
    if (!adjRow) return false;
    if (adjReason !== '') return true;
    if (adjRow._type === 'material') return adjMatQty !== String(adjRow.raw.stock ?? '');
    return adjIngBatches.some((b, i) => b.newQty !== String((adjRow.raw.batches || [])[i]?.quantity ?? ''));
  };
  const closeAdj = () => { adjHasChanges() ? setShowAdjDisc(true) : (setShowAdjForm(false), setAdjRow(null)); };
  const handleConfirmAdj = async () => {
    if (!adjRow) return;
    try {
      setAdjError('');
      if (adjRow._type === 'material') {
        const previousQty = adjRow.raw.stock ?? 0;
        const newQty      = parseInt(adjMatQty) || 0;
        await updateDoc(doc(db, 'materials', adjRow._docId), { stock: newQty, lastUpdated: new Date() });
        await logAudit('ADJUST', 'material', adjRow.displayId, adjRow.displayName, { previousQty, newQty, reason: adjReason || null });
      } else {
        const updated     = adjIngBatches.map(b => ({ ...b, quantity: parseInt(b.newQty) || 0 }));
        await updateDoc(doc(db, 'ingredients', adjRow._docId), { batches: updated, lastUpdated: new Date() });
        const batchChanges = adjIngBatches.map((b, i) => ({
          batchId: b.batchId, previousQty: adjRow.raw.batches?.[i]?.quantity ?? 0, newQty: parseInt(b.newQty) || 0,
        }));
        await logAudit('ADJUST', 'ingredient', adjRow.displayId, adjRow.displayName, { batches: batchChanges, reason: adjReason || null });
      }
    } catch (e) { console.error('Adj error:', e); setAdjError('Failed to save. Please try again.'); return; }
    await loadData(); setShowAdjConf(false); setShowAdjOk(true);
  };

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="flex w-full h-full">
      <StaffSidebar activePage="inventory" />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Inventory</h1>
          <div className="flex items-center justify-end gap-3">
            <div className="relative shrink-0">
              <button
                onClick={() => setShowFilterPanel(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl transition-colors ${
                  isFiltered || showFilterPanel
                    ? 'bg-[#3ca4c7] text-white hover:bg-[#2b8aa8]'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <Filter size={16} /> Filter List
              </button>

              {showFilterPanel && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-64 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-xl font-semibold text-gray-700">Filter</span>
                    {isFiltered && (
                      <button onClick={() => { clearFilters(); setShowFilterPanel(false); }} className="text-xl text-red-400 hover:text-red-600 transition-colors">Clear all</button>
                    )}
                  </div>

                  <div className="px-4 pt-3 pb-1">
                    <p className="text-lg font-medium text-gray-500 mb-1.5">Type</p>
                    <div className="flex flex-col">
                      {[{ key: 'material', label: 'Material' }, { key: 'ingredient', label: 'Ingredient' }].map(({ key, label }) => (
                        <button key={key} onClick={() => setFilterType(filterType === key ? '' : key)}
                          className={`w-full text-left px-3 py-2 text-xl rounded-lg transition-colors ${filterType === key ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 pt-2 pb-3 border-t border-gray-100 mt-1">
                    <p className="text-lg font-medium text-gray-500 mb-1.5">Status</p>
                    <div className="flex flex-col">
                      {Object.entries(STATUS_STYLES).map(([key, { label }]) => (
                        <button key={key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                          className={`w-full text-left px-3 py-2 text-xl rounded-lg transition-colors ${filterStatus === key ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0"><RefreshCw size={20} /></button>
          </div>
        </div>

        {/* Active filter chips */}
        {isFiltered && (
          <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
            <span className="text-xl text-gray-500">Filtered by:</span>
            {filterType && (
              <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                {filterType === 'material' ? 'Material' : 'Ingredient'}
                <button onClick={() => setFilterType('')} className="hover:text-[#2b8aa8] transition-colors ml-1"><X size={13} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                {STATUS_STYLES[filterStatus]?.label}
                <button onClick={() => setFilterStatus('')} className="hover:text-[#2b8aa8] transition-colors ml-1"><X size={13} /></button>
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-gray-300 pb-1 mb-5 shrink-0">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search here" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent" />
        </div>

        {/* List */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          {/* Column headers */}
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[9%]  text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[14%] text-xl font-semibold text-gray-800 text-center">Name</span>
            <span className="w-[12%] text-xl font-semibold text-gray-800 text-center">Category</span>
            <span className="w-[17%] text-xl font-semibold text-gray-800 text-center">Stock</span>
            <span className="w-[17%] text-xl font-semibold text-gray-800 text-center">Status</span>
            <span className="w-[12%] text-xl font-semibold text-gray-800 text-center">Last Updated</span>
            <span className="flex-1   text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>

          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {displayed.length === 0 && (
              <p className="py-12 text-gray-400 text-xl text-center">No items found.</p>
            )}
            {displayed.map(row => {
              const s = STATUS_STYLES[row.status] || STATUS_STYLES.normal;
              return (
                <div key={`${row._type}-${row._docId}`}
                  className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5"
                >
                  <span className="w-[9%]  text-xl text-gray-700 text-center">{row.displayId}</span>
                  <span className="w-[14%] text-xl text-gray-700 text-center">{row.displayName}</span>
                  <span className="w-[12%] text-xl text-gray-700 text-center">{row.displayCat}</span>
                  <span className="w-[17%] text-xl text-gray-700 text-center">{row.displayStock} {row.displayUnit}</span>
                  <span className={`w-[17%] text-xl font-medium text-center ${s.className}`}>{s.label}</span>
                  <span className="w-[12%] text-xl text-gray-500 text-center">{row.displayLastUpdated}</span>

                  <div className="flex-1 flex items-center justify-center gap-2">
                    <button onClick={() => handleAdjClick(row)}
                      className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                    >Adjust</button>
                    <button onClick={() => row._type === 'material' ? handleResupMat(row) : handleResupIng(row)}
                      className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                    >Resupply</button>

                    {row._type === 'ingredient' ? (
                      <div className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row._docId ? null : row._docId); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openDropdownId === row._docId && (
                          <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <button onClick={() => { setOpenDropdownId(null); setViewBatchRow(row); }}
                              className="w-full px-4 py-2.5 text-left text-xl text-gray-700 hover:bg-gray-50 rounded-xl"
                            >View Batches</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-[29px] shrink-0" /> 
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          VIEW BATCHES
      ══════════════════════════════════════════ */}
      {viewBatchRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[780px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Batch List — {viewBatchRow.displayName}</h3>
              <button onClick={() => setViewBatchRow(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-4">
              {(viewBatchRow.raw.batches || []).length === 0 ? (
                <p className="text-xl text-gray-400 text-center py-6">No batches recorded.</p>
              ) : (
                <>
                  <div className="flex items-center px-4 py-2 bg-gray-50 rounded-lg text-xl font-semibold text-gray-600">
                    <span className="w-8 text-center">#</span>
                    <span className="flex-1 pl-4">Batch ID</span>
                    <span className="w-40 text-center">Qty</span>
                    <span className="w-44 text-center">Expiration</span>
                  </div>
                  {viewBatchRow.raw.batches.map((b, i) => (
                    <div key={b.batchId || i} className="flex items-center px-4 py-3 border border-gray-200 rounded-xl text-xl text-gray-700">
                      <span className="w-8 text-center text-gray-400">{i + 1}</span>
                      <span className="flex-1 pl-4 font-medium">{b.batchId || '—'}</span>
                      <span className="w-40 text-center">{b.quantity ?? 0} {viewBatchRow.displayUnit}</span>
                      <span className="w-44 text-center">{fmtDate(b.expirationDate)}</span>
                    </div>
                  ))}
                </>
              )}
              <div className="flex justify-end mt-2">
                <button onClick={() => setViewBatchRow(null)} className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xl transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          RESUPPLY MATERIAL
      ══════════════════════════════════════════ */}
      {showResupMatForm && resupMatRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] px-10 py-8 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-800">Resupply — {resupMatRow.displayName}</h3>
              <button onClick={closeResupMat} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <p className="text-xl text-gray-500">Current stock: <span className="font-semibold text-gray-700">{resupMatRow.raw.stock ?? 0} units</span></p>
            <div className="flex items-center gap-4">
              <label className="text-xl text-gray-600 w-44 shrink-0">Amount to Add</label>
              <input type="number" min="0" value={resupMatAmount} onChange={e => setResupMatAmount(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xl text-gray-600 w-44 shrink-0">Supplier</label>
              <input value={resupSupplier} onChange={e => setResupSupplier(e.target.value)} placeholder="Optional"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
            </div>
            {resupMatRow.raw.maxLimit > 0 && (resupMatRow.raw.stock || 0) + (parseInt(resupMatAmount) || 0) > resupMatRow.raw.maxLimit && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={16} />
                <span className="text-lg">Maximum limit of {resupMatRow.raw.maxLimit} units reached.</span>
              </div>
            )}
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={closeResupMat} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => setShowResupMatConf(true)}
                disabled={resupMatRow.raw.maxLimit > 0 && (resupMatRow.raw.stock || 0) + (parseInt(resupMatAmount) || 0) > resupMatRow.raw.maxLimit}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showResupMatConf && resupMatRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Confirm Resupply?</h3>
            <p className="text-xl text-gray-600">Add <span className="font-semibold">{resupMatAmount} units</span> to {resupMatRow.displayName}. New stock: <span className="font-semibold">{(resupMatRow.raw.stock || 0) + (parseInt(resupMatAmount) || 0)} units</span>.</p>
            {resupMatError && <p className="text-lg text-red-500">{resupMatError}</p>}
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowResupMatConf(false); setResupMatError(''); }} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmResupMat} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showResupMatOk && resupMatRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Material Resupplied!</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{resupMatRow.displayName}</span> has been updated.</p>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowResupMatOk(false); setShowResupMatForm(false); setResupMatRow(null); setResupMatAmount(''); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
      {showResupMatDisc && <DiscardDialog onCancel={() => setShowResupMatDisc(false)} onConfirm={() => { setShowResupMatDisc(false); setShowResupMatForm(false); setResupMatRow(null); setResupMatAmount(''); }} />}

      {/* ══════════════════════════════════════════
          RESUPPLY INGREDIENT
      ══════════════════════════════════════════ */}
      {showResupIngForm && resupIngRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[580px] px-10 py-8 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-800">Resupply — {resupIngRow.displayName}</h3>
              <button onClick={closeResupIng} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <p className="text-xl text-gray-500">Existing batches: <span className="font-semibold text-gray-700">{(resupIngRow.raw.batches || []).length} / 3</span></p>
            {(resupIngRow.raw.batches || []).length >= 3 ? (
              <p className="text-xl text-red-500">Maximum of 3 batches reached. Adjust or consume existing batches before resupplying.</p>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <label className="text-xl text-gray-600 w-44 shrink-0">New Batch Quantity</label>
                  <input type="number" min="0" value={resupIngQty} onChange={e => setResupIngQty(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  <span className="text-xl text-gray-500 shrink-0">{resupIngRow.displayUnit}</span>
                </div>
                {resupIngRow.raw.maxLimit > 0 && (resupIngRow.raw.batches || []).reduce((s, b) => s + (b.quantity || 0), 0) + (parseInt(resupIngQty) || 0) > resupIngRow.raw.maxLimit && (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle size={16} />
                    <span className="text-lg">Maximum limit of {resupIngRow.raw.maxLimit} {resupIngRow.raw.unit || 'units'} reached.</span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Expiration Date</label>
                  <input type="date" value={resupIngExpDate} onChange={e => setResupIngExpDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Supplier</label>
                  <input value={resupSupplier} onChange={e => setResupSupplier(e.target.value)} placeholder="Optional"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
                <div className="flex gap-3 justify-end mt-2">
                  <button onClick={closeResupIng} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={() => setShowResupIngConf(true)}
                    disabled={resupIngRow.raw.maxLimit > 0 && (resupIngRow.raw.batches || []).reduce((s, b) => s + (b.quantity || 0), 0) + (parseInt(resupIngQty) || 0) > resupIngRow.raw.maxLimit}
                    className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Confirm</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showResupIngConf && resupIngRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Confirm Resupply?</h3>
            <p className="text-xl text-gray-600">Add a new batch of <span className="font-semibold">{resupIngQty} {resupIngRow.displayUnit}</span> expiring on <span className="font-semibold">{resupIngExpDate}</span>.</p>
            {resupIngError && <p className="text-lg text-red-500">{resupIngError}</p>}
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowResupIngConf(false); setResupIngError(''); }} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmResupIng} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showResupIngOk && resupIngRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Ingredient Resupplied!</h3>
            <p className="text-xl text-gray-600">New batch added to <span className="font-semibold">{resupIngRow.displayName}</span>.</p>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowResupIngOk(false); setShowResupIngForm(false); setResupIngRow(null); setResupIngExpDate(''); setResupIngQty(''); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
      {showResupIngDisc && <DiscardDialog onCancel={() => setShowResupIngDisc(false)} onConfirm={() => { setShowResupIngDisc(false); setShowResupIngForm(false); setResupIngRow(null); setResupIngExpDate(''); setResupIngQty(''); }} />}

      {/* ══════════════════════════════════════════
          ADJUST
      ══════════════════════════════════════════ */}
      {showAdjForm && adjRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1000px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Adjust {adjRow._type === 'material' ? 'Material' : 'Ingredient'} — {adjRow.displayName}</h3>
              <button onClick={closeAdj} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-8">
              {adjRow._type === 'material' ? (
                <div className="flex flex-col gap-5">
                  <p className="text-xl font-semibold text-gray-700">Set New Quantity</p>
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-52 shrink-0">Current stock</label>
                    <span className="text-xl text-gray-500">{adjRow.raw.stock ?? 0} units</span>
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-52 shrink-0">New quantity</label>
                    <input type="number" min="0" value={adjMatQty} onChange={e => setAdjMatQty(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                  {adjRow.raw.maxLimit > 0 && (parseInt(adjMatQty) || 0) > adjRow.raw.maxLimit && (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle size={16} />
                      <span className="text-lg">Maximum limit of {adjRow.raw.maxLimit} units reached.</span>
                    </div>
                  )}
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-52 shrink-0">Reason (optional)</label>
                    <input type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <p className="text-xl font-semibold text-gray-700">Adjust Batch Quantities</p>
                  <div className="flex gap-3 flex-wrap">
                    {adjIngBatches.map((b, i) => (
                      <button key={i} onClick={() => setAdjBatchIdx(i)}
                        className={`px-5 py-2 rounded-full text-xl transition-colors ${adjBatchIdx === i ? 'bg-[#3ca4c7] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >Batch {i + 1}</button>
                    ))}
                  </div>
                  {adjIngBatches[adjBatchIdx] && (
                    <div className="border border-gray-200 rounded-xl p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">Batch ID</label>
                        <span className="text-xl text-gray-500">{adjIngBatches[adjBatchIdx].batchId}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">Expiration</label>
                        <span className="text-xl text-gray-500">{fmtDate(adjIngBatches[adjBatchIdx].expirationDate)}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">Current quantity</label>
                        <span className="text-xl text-gray-500">{adjIngBatches[adjBatchIdx].quantity ?? 0} {adjRow.displayUnit}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">New quantity</label>
                        <input type="number" min="0"
                          value={adjIngBatches[adjBatchIdx].newQty}
                          onChange={e => setAdjIngBatches(p => p.map((b, i) => i === adjBatchIdx ? { ...b, newQty: e.target.value } : b))}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                        />
                        <span className="text-xl text-gray-500 shrink-0">{adjRow.displayUnit}</span>
                      </div>
                      {adjRow.raw.maxLimit > 0 && adjIngBatches.reduce((s, b) => s + (parseInt(b.newQty ?? b.quantity) || 0), 0) > adjRow.raw.maxLimit && (
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertTriangle size={16} />
                          <span className="text-lg">Maximum limit of {adjRow.raw.maxLimit} {adjRow.raw.unit || 'units'} reached.</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-52 shrink-0">Reason (optional)</label>
                    <input type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                </div>
              )}
            </div>
            <div className="px-10 pb-8 flex justify-end gap-3">
              <button onClick={closeAdj} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => setShowAdjConf(true)}
                disabled={
                  adjRow._type === 'material'
                    ? adjRow.raw.maxLimit > 0 && (parseInt(adjMatQty) || 0) > adjRow.raw.maxLimit
                    : adjRow.raw.maxLimit > 0 && adjIngBatches.reduce((s, b) => s + (parseInt(b.newQty ?? b.quantity) || 0), 0) > adjRow.raw.maxLimit
                }
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showAdjConf && adjRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Confirm Adjustment?</h3>
            <p className="text-xl text-gray-600">Save changes to <span className="font-semibold">{adjRow.displayName}</span>?</p>
            {adjError && <p className="text-lg text-red-500">{adjError}</p>}
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowAdjConf(false); setAdjError(''); }} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmAdj} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showAdjOk && adjRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Adjustment Saved!</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{adjRow.displayName}</span> has been updated.</p>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowAdjOk(false); setShowAdjForm(false); setAdjRow(null); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
      {showAdjDisc && <DiscardDialog onCancel={() => setShowAdjDisc(false)} onConfirm={() => { setShowAdjDisc(false); setShowAdjForm(false); setAdjRow(null); }} />}

      {/* Click-away to close filter panel */}
      {showFilterPanel && (
        <div className="fixed inset-0 z-20" onClick={() => setShowFilterPanel(false)} />
      )}
    </div>
  );
}