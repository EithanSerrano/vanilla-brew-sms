import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RefreshCw, Search, Plus, X } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import { syncMenuAvailability } from '../utils/menuAvailability';
import {
  EXPIRING_DAYS, WASTE_REASONS, toDate, batchExpiry, daysUntilExpiry, usableStock, logWastage,
} from '../utils/supply';

const TABS = ['Expiry', 'Restock Log', 'Wastage', 'Usage'];
const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];

const peso = (n) => (n == null ? '—' : `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const fmtDate = (ts) => {
  const d = toDate(ts);
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-US') : '—';
};
const byNewest = (field) => (a, b) => (toDate(b[field])?.getTime() || 0) - (toDate(a[field])?.getTime() || 0);
const itemLabel = (m) => `${m.size ? `(${m.size[0]}) ` : ''}${m.name}`;

function Th({ w, children, right }) {
  return <span className={`${w} text-xl font-semibold text-gray-700 ${right ? 'text-right' : ''}`}>{children}</span>;
}

function Pill({ active, onClick, label, count, tone }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xl border transition-colors ${active ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
    >
      {label}{count != null && <span className={`ml-2 font-semibold ${active ? 'text-white' : tone}`}>{count}</span>}
    </button>
  );
}

export default function Supply() {
  const [tab, setTab] = useState('Expiry');
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [restocks, setRestocks] = useState([]);
  const [wastage, setWastage] = useState([]);
  const [sales, setSales] = useState([]);
  const [error, setError] = useState('');

  const [expiryFilter, setExpiryFilter] = useState('attention');
  const [search, setSearch] = useState('');
  const [rangeDays, setRangeDays] = useState(30);
  const [usageType, setUsageType] = useState('material');

  const [waste, setWaste] = useState(null);
  const [wasteBusy, setWasteBusy] = useState(false);
  const [wasteError, setWasteError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    const read = async (name) => {
      try {
        return (await getDocs(collection(db, name))).docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error(`Load ${name} error:`, err);
        setError(`Could not read "${name}". Check the Firestore rules for that collection.`);
        return [];
      }
    };
    const [ing, mat, rs, ws, ss] = await Promise.all([
      read('ingredients'), read('materials'), read('restocklog'), read('wastage'), read('salestransaction'),
    ]);
    setIngredients(ing); setMaterials(mat);
    syncMenuAvailability({ ingredients: ing, materials: mat });
    setRestocks(rs.sort(byNewest('receivedAt')));
    setWastage(ws.sort(byNewest('disposedAt')));
    setSales(ss);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  // ── Expiry ──
  const batchRows = useMemo(() => ingredients.flatMap(ing =>
    (ing.batches || [])
      .filter(b => (b.quantity || 0) > 0)
      .map(b => ({
        key: `${ing.id}:${b.batchId}`, ing, batch: b,
        days: daysUntilExpiry(b),
        archived: ing.isActive === false || ing.archived === true,
      }))
  ).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999)), [ingredients]);

  const expiredRows  = batchRows.filter(r => r.days !== null && r.days < 0);
  const expiringRows = batchRows.filter(r => r.days !== null && r.days >= 0 && r.days <= EXPIRING_DAYS);
  const q = search.trim().toLowerCase();
  const shownBatches = batchRows.filter(r => {
    if (expiryFilter === 'expired') return r.days !== null && r.days < 0;
    if (expiryFilter === 'expiring') return r.days !== null && r.days >= 0 && r.days <= EXPIRING_DAYS;
    if (expiryFilter === 'attention') return r.days !== null && r.days <= EXPIRING_DAYS;
    return true;
  }).filter(r => !q || r.ing.name.toLowerCase().includes(q) || (r.batch.batchId || '').toLowerCase().includes(q));

  // ── Restock / wastage ──
  const shownRestocks = restocks.filter(r => !q || (r.name || '').toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q) || (r.batchId || '').toLowerCase().includes(q));
  const shownWastage  = wastage.filter(w => !q || (w.name || '').toLowerCase().includes(q) || (w.reason || '').toLowerCase().includes(q));
  const wasteCost = shownWastage.reduce((s, w) => s + (w.cost || 0), 0);
  const restockCost = shownRestocks.reduce((s, r) => s + (r.totalCost || 0), 0);

  // ── Usage, from the per-sale deduction records ──
  const usage = useMemo(() => {
    const since = new Date(Date.now() - rangeDays * 86400000);
    const totals = {};
    for (const sale of sales) {
      if (sale.status === 'Canceled') continue;
      const when = toDate(sale.createdAt) || (sale.dateAndTimeStr ? new Date(sale.dateAndTimeStr) : null);
      if (!when || isNaN(when.getTime()) || when < since) continue;
      for (const d of (sale.stockDeductions || [])) {
        if (d.type !== usageType) continue;
        const used = d.type === 'material' ? (d.taken ?? d.deducted) : d.deducted;
        const t = totals[d.refId] || (totals[d.refId] = { refId: d.refId, name: d.name, unit: d.unit, used: 0 });
        t.used += Number(used) || 0;
      }
    }
    const stockOf = (refId) => {
      if (usageType === 'material') return materials.find(m => m.id === refId)?.stock ?? null;
      const ing = ingredients.find(i => i.id === refId);
      return ing ? usableStock(ing) : null;
    };
    return Object.values(totals).map(t => {
      const perDay = t.used / rangeDays;
      const stock = stockOf(t.refId);
      return { ...t, perDay, stock, daysLeft: perDay > 0 && stock != null ? stock / perDay : null };
    }).sort((a, b) => b.used - a.used);
  }, [sales, materials, ingredients, rangeDays, usageType]);

  // ── Record waste ──
  const openWaste = (preset = {}) => {
    setWasteError('');
    setWaste({ itemType: 'ingredient', refId: '', batchId: '', quantity: '', reason: 'Expired', note: '', ...preset });
  };
  const wasteIng = waste?.itemType === 'ingredient' ? ingredients.find(i => i.id === waste.refId) : null;
  const wasteBatch = wasteIng?.batches?.find(b => b.batchId === waste.batchId);
  const wasteMat = waste?.itemType === 'material' ? materials.find(m => m.id === waste.refId) : null;
  const wasteAvailable = wasteBatch ? (wasteBatch.quantity || 0) : wasteMat ? (wasteMat.stock ?? 0) : 0;

  const lastUnitCost = (refId, batchId) => {
    const exact = restocks.find(r => r.refId === refId && r.batchId === batchId && r.unitCost != null);
    return (exact || restocks.find(r => r.refId === refId && r.unitCost != null))?.unitCost ?? null;
  };

  const submitWaste = async () => {
    const qty = Number(waste.quantity);
    if (!(waste.refId && qty > 0)) { setWasteError('Choose an item and enter a quantity above zero.'); return; }
    if (waste.itemType === 'ingredient' && !waste.batchId) { setWasteError('Choose the batch.'); return; }
    if (waste.reason === 'Other' && !waste.note.trim()) { setWasteError('Describe the reason.'); return; }
    setWasteBusy(true);
    setWasteError('');
    try {
      let name; let unit; let displayId; let batchId = null;
      if (waste.itemType === 'ingredient') {
        const ref = doc(db, 'ingredients', waste.refId);
        const fresh = await getDoc(ref);
        const data = fresh.data();
        const batches = (data.batches || []).map(b => ({ ...b }));
        const batch = batches.find(b => b.batchId === waste.batchId);
        if (!batch) throw new Error('That batch no longer exists.');
        if (qty > (batch.quantity || 0)) throw new Error(`Only ${batch.quantity} ${data.unit || 'units'} left in that batch.`);
        batch.quantity -= qty;
        const kept = batches.filter(b => b !== batch || b.quantity > 0);
        await updateDoc(ref, { batches: kept, lastUpdated: new Date() });
        name = data.name; unit = data.unit || 'units'; displayId = data.ingredientId || fresh.id; batchId = waste.batchId;
      } else {
        const ref = doc(db, 'materials', waste.refId);
        const fresh = await getDoc(ref);
        const data = fresh.data();
        if (qty > (data.stock ?? 0)) throw new Error(`Only ${data.stock ?? 0} units in stock.`);
        await updateDoc(ref, { stock: (data.stock ?? 0) - qty, lastUpdated: new Date() });
        name = itemLabel(data); unit = 'units'; displayId = data.materialId || fresh.id;
      }
      const unitCost = wasteBatch?.unitCost ?? lastUnitCost(waste.refId, batchId);
      await logWastage({
        itemType: waste.itemType, refId: waste.refId, displayId, name, unit, batchId,
        quantity: qty, reason: waste.reason, note: waste.note, unitCost,
      });
      const session = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      await addDoc(collection(db, 'auditlog'), {
        action: 'WASTAGE', itemType: waste.itemType, itemId: displayId, itemName: name,
        details: { batchId, quantity: qty, unit, reason: waste.reason, note: waste.note.trim() || null },
        performedBy: session.name || session.email || 'Unknown', timestamp: new Date(),
      });
      setWaste(null);
      await loadAll();
    } catch (err) {
      console.error('Waste error:', err);
      setWasteError(err.message || 'Could not save.');
    } finally {
      setWasteBusy(false);
    }
  };

  const activeIngredients = ingredients.filter(i => i.isActive !== false && i.archived !== true).sort((a, b) => a.name.localeCompare(b.name));
  const activeMaterials = materials.filter(m => m.isActive !== false).sort((a, b) => itemLabel(a).localeCompare(itemLabel(b)));

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />
      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Supply</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => openWaste()} className="flex items-center gap-2 bg-[#C0392B] hover:bg-[#a53125] text-white px-5 py-2 rounded-full text-xl transition-colors">
              <Plus size={18} /> Record Waste
            </button>
            <button onClick={loadAll} title="Refresh" className="text-gray-400 hover:text-gray-600 transition-colors"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(''); }}
              className={`px-6 py-2 rounded-full text-xl transition-colors ${tab === t ? 'bg-[#614033] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >{t}</button>
          ))}
        </div>
        {error && <p className="text-lg text-red-500 mb-3 shrink-0">{error}</p>}

        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-md">
          {tab === 'Expiry' && (<>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0 flex-wrap">
              <Pill active={expiryFilter === 'attention'} onClick={() => setExpiryFilter('attention')} label="Needs attention" count={expiredRows.length + expiringRows.length} tone="text-red-500" />
              <Pill active={expiryFilter === 'expired'} onClick={() => setExpiryFilter('expired')} label="Expired" count={expiredRows.length} tone="text-red-500" />
              <Pill active={expiryFilter === 'expiring'} onClick={() => setExpiryFilter('expiring')} label={`Expiring in ${EXPIRING_DAYS} days`} count={expiringRows.length} tone="text-orange-500" />
              <Pill active={expiryFilter === 'all'} onClick={() => setExpiryFilter('all')} label="All batches" count={batchRows.length} tone="text-gray-500" />
              <div className="relative ml-auto">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredient or batch" className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-xl w-72 outline-none focus:border-[#3ca4c7]" />
              </div>
            </div>
            <div className="flex items-center px-6 py-3 border-b border-gray-200 shrink-0">
              <Th w="w-[24%]">Ingredient</Th><Th w="w-[14%]">Batch</Th><Th w="w-[16%]">Quantity</Th>
              <Th w="w-[14%]">Expires</Th><Th w="w-[16%]">Status</Th><Th w="w-[16%]" right>Action</Th>
            </div>
            <div className="flex-1 overflow-y-auto px-6 min-h-0">
              {!loading && shownBatches.length === 0 && <p className="text-xl text-gray-400 text-center py-10">Nothing here. No batches match this filter.</p>}
              {shownBatches.map(r => (
                <div key={r.key} className="flex items-center py-3 border-b border-gray-100 text-xl text-gray-700">
                  <span className="w-[24%] truncate">{r.ing.name}{r.archived && <span className="ml-2 text-base text-gray-400">archived</span>}</span>
                  <span className="w-[14%]">{r.batch.batchId || '—'}</span>
                  <span className="w-[16%]">{r.batch.quantity} {r.ing.unit || 'units'}</span>
                  <span className="w-[14%]">{fmtDate(batchExpiry(r.batch))}</span>
                  <span className={`w-[16%] font-medium ${r.days === null ? 'text-gray-400' : r.days < 0 ? 'text-[#DF0C0C]' : r.days <= EXPIRING_DAYS ? 'text-orange-600' : 'text-green-600'}`}>
                    {r.days === null ? 'No expiry' : r.days < 0 ? `Expired ${-r.days}d ago` : r.days === 0 ? 'Expires today' : `${r.days}d left`}
                  </span>
                  <span className="w-[16%] text-right">
                    <button
                      onClick={() => openWaste({ itemType: 'ingredient', refId: r.ing.id, batchId: r.batch.batchId, quantity: String(r.batch.quantity), reason: r.days !== null && r.days < 0 ? 'Expired' : 'Spoiled' })}
                      className="bg-[#C0392B] hover:bg-[#a53125] text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                    >Dispose</button>
                  </span>
                </div>
              ))}
            </div>
            <p className="px-6 py-3 text-lg text-gray-400 border-t border-gray-100 shrink-0">Expired batches are skipped automatically when an order deducts stock. Dispose them here to clear them from inventory and record the loss.</p>
          </>)}

          {tab === 'Restock Log' && (<>
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
              <span className="text-xl text-gray-600">{shownRestocks.length} deliveries · {peso(restockCost)} recorded cost</span>
              <div className="relative ml-auto">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, supplier or batch" className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-xl w-80 outline-none focus:border-[#3ca4c7]" />
              </div>
            </div>
            <div className="flex items-center px-6 py-3 border-b border-gray-200 shrink-0">
              <Th w="w-[12%]">Date</Th><Th w="w-[20%]">Item</Th><Th w="w-[11%]">Batch</Th><Th w="w-[12%]">Quantity</Th>
              <Th w="w-[11%]">Expiry</Th><Th w="w-[14%]">Supplier</Th><Th w="w-[10%]" right>Total</Th><Th w="w-[10%]" right>By</Th>
            </div>
            <div className="flex-1 overflow-y-auto px-6 min-h-0">
              {!loading && shownRestocks.length === 0 && <p className="text-xl text-gray-400 text-center py-10">No deliveries recorded yet. They appear here when stock is added or resupplied.</p>}
              {shownRestocks.slice(0, 400).map(r => (
                <div key={r.id} className="flex items-center py-3 border-b border-gray-100 text-xl text-gray-700">
                  <span className="w-[12%]">{fmtDate(r.receivedAt)}</span>
                  <span className="w-[20%] truncate">{r.name}</span>
                  <span className="w-[11%]">{r.batchId || '—'}</span>
                  <span className="w-[12%]">{r.quantity} {r.unit}</span>
                  <span className="w-[11%]">{r.expirationDate ? fmtDate(r.expirationDate) : '—'}</span>
                  <span className="w-[14%] truncate">{r.supplier || '—'}</span>
                  <span className="w-[10%] text-right">{peso(r.totalCost)}</span>
                  <span className="w-[10%] text-right truncate">{r.receivedBy || '—'}</span>
                </div>
              ))}
            </div>
          </>)}

          {tab === 'Wastage' && (<>
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
              <span className="text-xl text-gray-600">{shownWastage.length} records · {peso(wasteCost)} estimated loss</span>
              <div className="relative ml-auto">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item or reason" className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-xl w-72 outline-none focus:border-[#3ca4c7]" />
              </div>
            </div>
            <div className="flex items-center px-6 py-3 border-b border-gray-200 shrink-0">
              <Th w="w-[12%]">Date</Th><Th w="w-[22%]">Item</Th><Th w="w-[11%]">Batch</Th><Th w="w-[13%]">Quantity</Th>
              <Th w="w-[14%]">Reason</Th><Th w="w-[10%]" right>Loss</Th><Th w="w-[18%]" right>By</Th>
            </div>
            <div className="flex-1 overflow-y-auto px-6 min-h-0">
              {!loading && shownWastage.length === 0 && <p className="text-xl text-gray-400 text-center py-10">No wastage recorded.</p>}
              {shownWastage.slice(0, 400).map(w => (
                <div key={w.id} className="flex items-center py-3 border-b border-gray-100 text-xl text-gray-700" title={w.note || ''}>
                  <span className="w-[12%]">{fmtDate(w.disposedAt)}</span>
                  <span className="w-[22%] truncate">{w.name}</span>
                  <span className="w-[11%]">{w.batchId || '—'}</span>
                  <span className="w-[13%]">{w.quantity} {w.unit}</span>
                  <span className="w-[14%]">{w.reason}</span>
                  <span className="w-[10%] text-right">{peso(w.cost)}</span>
                  <span className="w-[18%] text-right truncate">{w.disposedBy || '—'}</span>
                </div>
              ))}
            </div>
          </>)}

          {tab === 'Usage' && (<>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0 flex-wrap">
              <Pill active={usageType === 'material'} onClick={() => setUsageType('material')} label="Materials" />
              <Pill active={usageType === 'ingredient'} onClick={() => setUsageType('ingredient')} label="Ingredients" />
              <select value={rangeDays} onChange={e => setRangeDays(Number(e.target.value))} className="ml-auto border border-gray-300 rounded-lg px-4 py-2 text-xl bg-white outline-none focus:border-[#3ca4c7]">
                {RANGES.map(r => <option key={r.days} value={r.days}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-center px-6 py-3 border-b border-gray-200 shrink-0">
              <Th w="w-[32%]">Item</Th><Th w="w-[17%]">Used</Th><Th w="w-[17%]">Per day</Th><Th w="w-[17%]">In stock</Th><Th w="w-[17%]" right>Days left</Th>
            </div>
            <div className="flex-1 overflow-y-auto px-6 min-h-0">
              {!loading && usage.length === 0 && <p className="text-xl text-gray-400 text-center py-10">No usage recorded in this period. Usage is read from orders placed since stock records were added.</p>}
              {usage.map(u => (
                <div key={u.refId} className="flex items-center py-3 border-b border-gray-100 text-xl text-gray-700">
                  <span className="w-[32%] truncate">{u.name}</span>
                  <span className="w-[17%]">{Math.round(u.used * 100) / 100} {u.unit}</span>
                  <span className="w-[17%]">{Math.round(u.perDay * 10) / 10} {u.unit}</span>
                  <span className="w-[17%]">{u.stock ?? '—'}</span>
                  <span className={`w-[17%] text-right font-medium ${u.daysLeft != null && u.daysLeft < 7 ? 'text-[#DF0C0C]' : 'text-gray-700'}`}>
                    {u.daysLeft == null ? '—' : u.daysLeft < 1 ? '< 1 day' : `${Math.floor(u.daysLeft)} days`}
                  </span>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </main>

      {waste && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-800">Record Waste</h3>
              <button onClick={() => setWaste(null)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <select value={waste.itemType} onChange={e => setWaste({ ...waste, itemType: e.target.value, refId: '', batchId: '', quantity: '' })}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-xl bg-white outline-none focus:border-[#3ca4c7]">
              <option value="ingredient">Ingredient</option>
              <option value="material">Material</option>
            </select>
            <select value={waste.refId} onChange={e => setWaste({ ...waste, refId: e.target.value, batchId: '', quantity: '' })}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-xl bg-white outline-none focus:border-[#3ca4c7]">
              <option value="">Select {waste.itemType}…</option>
              {(waste.itemType === 'ingredient' ? activeIngredients : activeMaterials).map(i => (
                <option key={i.id} value={i.id}>{waste.itemType === 'ingredient' ? i.name : itemLabel(i)}</option>
              ))}
            </select>
            {waste.itemType === 'ingredient' && wasteIng && (
              <select value={waste.batchId} onChange={e => setWaste({ ...waste, batchId: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-xl bg-white outline-none focus:border-[#3ca4c7]">
                <option value="">Select batch…</option>
                {(wasteIng.batches || []).filter(b => (b.quantity || 0) > 0).map(b => (
                  <option key={b.batchId} value={b.batchId}>{b.batchId} · {b.quantity} {wasteIng.unit} · exp {fmtDate(batchExpiry(b))}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-4">
              <input type="number" min="0" value={waste.quantity} onChange={e => setWaste({ ...waste, quantity: e.target.value })} placeholder="Quantity"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl outline-none focus:border-[#3ca4c7]" />
              {waste.refId && (waste.itemType === 'material' || waste.batchId) && <span className="text-xl text-gray-500 shrink-0">of {wasteAvailable} {wasteIng?.unit || 'units'}</span>}
            </div>
            <select value={waste.reason} onChange={e => setWaste({ ...waste, reason: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-xl bg-white outline-none focus:border-[#3ca4c7]">
              {WASTE_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
            <input value={waste.note} onChange={e => setWaste({ ...waste, note: e.target.value })} placeholder={waste.reason === 'Other' ? 'Describe the reason' : 'Note (optional)'}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-xl outline-none focus:border-[#3ca4c7]" />
            {wasteError && <p className="text-lg text-red-500">{wasteError}</p>}
            <p className="text-lg text-gray-400">This removes the quantity from inventory and cannot be undone from here.</p>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setWaste(null)} disabled={wasteBusy} className="px-6 py-2.5 rounded-full text-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={submitWaste} disabled={wasteBusy} className="px-6 py-2.5 rounded-full text-xl bg-[#C0392B] hover:bg-[#a53125] text-white transition-colors disabled:opacity-60">{wasteBusy ? 'Saving…' : 'Remove & Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
