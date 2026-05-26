import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Filter, Plus, Lock, X, RefreshCw } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

const STATUS_STYLES = {
  normal:          { label: 'Normal Supply',            className: 'text-[#06BC2E]'  },
  low:             { label: 'Low Supply',               className: 'text-[#DF0C0C]'  },
  expiring_low:    { label: 'Low Supply / Expiring',    className: 'text-orange-600' },
  expiring_normal: { label: 'Normal Supply / Expiring', className: 'text-yellow-600' },
};

const MAT_SIZES   = ['Small', 'Medium', 'Large'];
const SIZE_ORDER  = { Small: 0, Medium: 1, Large: 2 };
const ING_TYPES   = ['Dry', 'Frozen', 'Wet'];
const ING_UNITS   = ['grams', 'pumps', 'scoops'];
const EMPTY_SIZES = { Small: { enabled: false, qty: '' }, Medium: { enabled: false, qty: '' }, Large: { enabled: false, qty: '' } };
const EXPIRING_DAYS = 7;

function sizePrefix(size) { return size ? `(${size[0]}) ` : ''; }

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
  const isExp  = bats.some(b => {
    if (!b.quantity) return false;
    const e = b.expirationDate?.toDate?.() || (b.expirationDate ? new Date(b.expirationDate) : null);
    return e && e <= cutoff;
  });
  if (isLow && isExp) return 'expiring_low';
  if (isLow)          return 'low';
  if (isExp)          return 'expiring_normal';
  return 'normal';
}

function computeIngStock(ing) {
  if (!ing.batches) return ing.startingQty ?? ing.stock ?? 0;
  return ing.batches.reduce((s, b) => s + (b.quantity || 0), 0);
}

function genBatchId(dateStr, count) {
  const d = new Date(dateStr);
  return `B${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}${String(count+1).padStart(2,'0')}`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US');
}

// ── Shared small dialogs ──────────────────────────────────────
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

export default function Inventory() {
  // ── Data ──
  const [materials,    setMaterials]    = useState([]);
  const [ingredients,  setIngredients]  = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  // ── New Material ──
  const [showNewMat,   setShowNewMat]   = useState(false);
  const [matName,      setMatName]      = useState('');
  const [matSizes,     setMatSizes]     = useState(EMPTY_SIZES);
  const [matMaxLimit,  setMatMaxLimit]  = useState('');
  const [pendingMat,   setPendingMat]   = useState(null);
  const [showMatConf,  setShowMatConf]  = useState(false);
  const [showMatOk,    setShowMatOk]    = useState(false);
  const [showMatDisc,  setShowMatDisc]  = useState(false);

  // ── New Ingredient ──
  const [showNewIng,   setShowNewIng]   = useState(false);
  const [ingName,      setIngName]      = useState('');
  const [ingType,      setIngType]      = useState('Dry');
  const [ingUnit,      setIngUnit]      = useState('grams');
  const [ingIsAddOn,   setIngIsAddOn]   = useState(false);
  const [ingMaxLimit,  setIngMaxLimit]  = useState('');
  const [ingExpDate,   setIngExpDate]   = useState('');
  const [ingBatchQty,  setIngBatchQty]  = useState('');
  const [pendingIng,   setPendingIng]   = useState(null);
  const [showIngConf,  setShowIngConf]  = useState(false);
  const [showIngOk,    setShowIngOk]    = useState(false);
  const [showIngDisc,  setShowIngDisc]  = useState(false);

  // ── Hide confirmation ──
  const [hideRow,      setHideRow]      = useState(null);
  const [showHideConf, setShowHideConf] = useState(false);

  // ── Retrieve Material ──
  const [retMatSibs,    setRetMatSibs]    = useState([]);
  const [retMatQtys,    setRetMatQtys]    = useState({});
  const [showRetMatForm, setShowRetMatForm] = useState(false);
  const [showRetMatConf, setShowRetMatConf] = useState(false);
  const [showRetMatDisc, setShowRetMatDisc] = useState(false);

  // ── Retrieve Ingredient ──
  const [retIngRow,      setRetIngRow]      = useState(null);
  const [retIngExpDate,  setRetIngExpDate]  = useState('');
  const [retIngQty,      setRetIngQty]      = useState('');
  const [showRetIngForm, setShowRetIngForm] = useState(false);
  const [showRetIngConf, setShowRetIngConf] = useState(false);
  const [showRetIngDisc, setShowRetIngDisc] = useState(false);

  // ── Load ──
  const loadData = async () => {
    try {
      const [ms, is] = await Promise.all([
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'ingredients')),
      ]);
      setMaterials(ms.docs.map(d => ({ id: d.id, ...d.data() })));
      setIngredients(is.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('Inventory load error:', e); }
  };
  useEffect(() => { loadData(); }, []);

  // ── Combined rows ──
  const allRows = [
    ...materials.map(m => ({
      _type: 'material', _docId: m.id,
      displayId:    m.materialId || m.id,
      displayName:  `${sizePrefix(m.size)}${m.name}`,
      displayCat:   m.category || 'Material',
      displayStock: String(m.stock ?? '—'),
      status:  computeMaterialStatus(m),
      active:  m.isActive !== false,
      hiddenAt: m.hiddenAt, raw: m,
    })),
    ...ingredients.map(ing => ({
      _type: 'ingredient', _docId: ing.id,
      displayId:    ing.ingredientId || ing.id,
      displayName:  ing.name,
      displayCat:   ing.category || 'Ingredient',
      displayStock: String(computeIngStock(ing)),
      status:  computeIngredientStatus(ing),
      active:  ing.isActive !== false && ing.archived !== true,
      hiddenAt: ing.hiddenAt, raw: ing,
    })),
  ];

  const displayed = allRows
    .filter(r => showInactive ? !r.active : r.active)
    .filter(r => !searchQuery ||
      r.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ════════════════════════════════════
  // NEW MATERIAL
  // ════════════════════════════════════
  const matHasData = () =>
    matName.trim() !== '' || MAT_SIZES.some(s => matSizes[s].enabled || matSizes[s].qty !== '') || matMaxLimit !== '';
  const resetMat = () => { setMatName(''); setMatSizes(EMPTY_SIZES); setMatMaxLimit(''); setPendingMat(null); };
  const closeMat = () => { matHasData() ? setShowMatDisc(true) : (setShowNewMat(false), resetMat()); };
  const toggleMatSize = s => setMatSizes(p => ({ ...p, [s]: { enabled: !p[s].enabled, qty: p[s].enabled ? '' : p[s].qty } }));

  const handleSaveMat = async () => {
    const on = MAT_SIZES.filter(s => matSizes[s].enabled);
    if (!matName.trim() || on.length === 0) return;
    const snap = await getDocs(collection(db, 'materials'));
    const nums = snap.docs.map(d => d.data().materialId || '').filter(id => /^MAT\d+$/.test(id)).map(id => parseInt(id.slice(3)));
    const base = nums.length ? Math.max(...nums) : 0;
    setPendingMat({
      name: matName.trim(), maxLimit: parseInt(matMaxLimit) || 0,
      entries: on.map((sz, i) => ({ size: sz, qty: parseInt(matSizes[sz].qty) || 0, matId: `MAT${String(base+i+1).padStart(3,'0')}` })),
    });
    setShowMatConf(true);
  };

  const handleConfirmMat = async () => {
    if (!pendingMat) return;
    const now = new Date();
    for (const e of pendingMat.entries) {
      await addDoc(collection(db, 'materials'), {
        materialId: e.matId, name: pendingMat.name, size: e.size,
        category: 'Material', stock: e.qty, startingQty: e.qty,
        maxLimit: pendingMat.maxLimit, isActive: true, createdAt: now,
      });
    }
    await loadData(); setShowMatConf(false); setShowMatOk(true);
  };

  // ════════════════════════════════════
  // NEW INGREDIENT
  // ════════════════════════════════════
  const ingHasData = () => ingName.trim() !== '' || ingExpDate !== '' || ingBatchQty !== '' || ingMaxLimit !== '';
  const resetIng = () => { setIngName(''); setIngType('Dry'); setIngUnit('grams'); setIngIsAddOn(false); setIngMaxLimit(''); setIngExpDate(''); setIngBatchQty(''); setPendingIng(null); };
  const closeIng = () => { ingHasData() ? setShowIngDisc(true) : (setShowNewIng(false), resetIng()); };

  const handleSaveIng = async () => {
    if (!ingName.trim() || !ingExpDate || !ingBatchQty) return;
    const snap = await getDocs(collection(db, 'ingredients'));
    const nums = snap.docs.map(d => d.data().ingredientId || '').filter(id => /^ING\d+$/.test(id)).map(id => parseInt(id.slice(3)));
    const base = nums.length ? Math.max(...nums) : 0;
    const newId = `ING${String(base+1).padStart(3,'0')}`;
    setPendingIng({
      ingredientId: newId, name: ingName.trim(), type: ingType, unit: ingUnit,
      isAddOn: ingIsAddOn, maxLimit: parseInt(ingMaxLimit) || 0,
      batchId: genBatchId(ingExpDate, 0), expirationDate: new Date(ingExpDate),
      quantity: parseInt(ingBatchQty) || 0,
    });
    setShowIngConf(true);
  };

  const handleConfirmIng = async () => {
    if (!pendingIng) return;
    const now = new Date();
    await addDoc(collection(db, 'ingredients'), {
      ingredientId: pendingIng.ingredientId, name: pendingIng.name, type: pendingIng.type,
      unit: pendingIng.unit, isAddOn: pendingIng.isAddOn, maxLimit: pendingIng.maxLimit,
      isActive: true,
      batches: [{ batchId: pendingIng.batchId, expirationDate: pendingIng.expirationDate, quantity: pendingIng.quantity, createdAt: now }],
      createdAt: now,
    });
    await loadData(); setShowIngConf(false); setShowIngOk(true);
  };

  // ════════════════════════════════════
  // HIDE
  // ════════════════════════════════════
  const handleClickHide = row => { setHideRow(row); setShowHideConf(true); };
  const handleConfirmHide = async () => {
    if (!hideRow) return;
    const coll   = hideRow._type === 'material' ? 'materials' : 'ingredients';
    const update = hideRow.raw.archived !== undefined ? { archived: true, hiddenAt: new Date() } : { isActive: false, hiddenAt: new Date() };
    await updateDoc(doc(db, coll, hideRow._docId), update);
    setShowHideConf(false); setHideRow(null); await loadData();
  };

  // ════════════════════════════════════
  // RETRIEVE MATERIAL
  // ════════════════════════════════════
  const handleClickRetrieve = row => {
    if (row._type === 'material') {
      const sibs = materials
        .filter(m => m.name === row.raw.name && m.isActive === false)
        .sort((a, b) => (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99));
      setRetMatSibs(sibs);
      setRetMatQtys(Object.fromEntries(sibs.map(m => [m.size || 'N/A', ''])));
      setShowRetMatForm(true);
    } else {
      setRetIngRow(row); setRetIngExpDate(''); setRetIngQty(''); setShowRetIngForm(true);
    }
  };

  const handleConfirmRetMat = async () => {
    for (const sib of retMatSibs) {
      const qty = parseInt(retMatQtys[sib.size || 'N/A']) || 0;
      await updateDoc(doc(db, 'materials', sib.id), { stock: qty, startingQty: qty, isActive: true, hiddenAt: null });
    }
    await loadData(); setShowRetMatConf(false); setShowRetMatForm(false); setRetMatSibs([]); setRetMatQtys({});
  };

  // ════════════════════════════════════
  // RETRIEVE INGREDIENT
  // ════════════════════════════════════
  const handleConfirmRetIng = async () => {
    if (!retIngRow) return;
    const batchId = genBatchId(retIngExpDate, 0);
    await updateDoc(doc(db, 'ingredients', retIngRow._docId), {
      batches: [{ batchId, expirationDate: new Date(retIngExpDate), quantity: parseInt(retIngQty) || 0, createdAt: new Date() }],
      isActive: true, hiddenAt: null,
    });
    await loadData(); setShowRetIngConf(false); setShowRetIngForm(false); setRetIngRow(null);
  };

  // Derived for forms
  const retMatMaxLimit = retMatSibs[0]?.maxLimit || 0;
  const retIngMaxLimit = retIngRow?.raw?.maxLimit || 0;

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Inventory</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInactive(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${showInactive ? 'bg-red-400' : 'bg-green-400'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${showInactive ? 'left-6' : 'left-1'}`} />
              </button>
              <span className="text-xl text-gray-600 shrink-0">{showInactive ? 'Showing Inactive List' : 'Showing Active List'}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-full text-xl transition-colors shrink-0">
                <Filter size={16} /> Filter List
              </button>
              {!showInactive && (<>
                <button onClick={() => setShowNewMat(true)} className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"><Plus size={16} /> New Material</button>
                <button onClick={() => setShowNewIng(true)} className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"><Plus size={16} /> New Ingredient</button>
              </>)}
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0"><RefreshCw size={20} /></button>
            </div>
          </div>
        </div>

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
            <span className="w-[12%] text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[22%] text-xl font-semibold text-gray-800 pl-2">Name</span>
            <span className="w-[13%] text-xl font-semibold text-gray-800 text-center">Category</span>
            {showInactive
              ? <span className="w-[15%] text-xl font-semibold text-gray-800 text-center">Date Hidden</span>
              : <>
                  <span className="w-[10%] text-xl font-semibold text-gray-800 text-center">Stock</span>
                  <span className="w-[15%] text-xl font-semibold text-gray-800 text-center">Status</span>
                </>}
            <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>
          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2">
            {displayed.length === 0 && (
              <p className="py-12 text-gray-400 text-xl text-center">No items found.</p>
            )}
            {displayed.map(row => {
              const s = STATUS_STYLES[row.status] || STATUS_STYLES.normal;
              return (
                <div
                  key={`${row._type}-${row._docId}`}
                  className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5"
                >
                  <span className="w-[12%] text-xl text-gray-700 text-center">{row.displayId}</span>
                  <span className="w-[22%] text-xl text-gray-700 pl-2">{row.displayName}</span>
                  <span className="w-[13%] text-xl text-gray-700 text-center">{row.displayCat}</span>
                  {showInactive
                    ? <span className="w-[15%] text-xl text-gray-700 text-center">{fmtDate(row.hiddenAt)}</span>
                    : <>
                        <span className="w-[10%] text-xl text-gray-700 text-center">{row.displayStock}</span>
                        <span className={`w-[15%] text-xl font-medium text-center ${s.className}`}>{s.label}</span>
                      </>}
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {showInactive
                      ? <button onClick={() => handleClickRetrieve(row)} className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-1.5 rounded-full text-xl transition-colors">Retrieve</button>
                      : <>
                          <button className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Adjust</button>
                          <button className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Resupply</button>
                          <button className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Edit</button>
                          <button onClick={() => handleClickHide(row)} className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Hide</button>
                        </>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          NEW MATERIAL MODAL
      ══════════════════════════════════════════ */}
      {showNewMat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1100px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Material</h3>
              <button onClick={closeMat} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-12 py-8 flex flex-col gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">General Information</p>
                <div className="flex items-center gap-5">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Material Name</label>
                  <input type="text" value={matName} onChange={e => setMatName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-4">Sizes</p>
                <div className="grid grid-cols-2 gap-x-10 mb-3 px-2">
                  <span className="text-xl text-gray-500 text-center">Sizes</span>
                  <span className="text-xl text-gray-500 text-center">Starting Quantity</span>
                </div>
                {MAT_SIZES.map(sz => (
                  <div key={sz} className="grid grid-cols-2 gap-x-10 items-center mb-5">
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-xl text-gray-700 w-18">{sz}</span>
                      <button onClick={() => toggleMatSize(sz)}
                        className={`w-9 h-9 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${matSizes[sz].enabled ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
                        {matSizes[sz].enabled ? <span className="font-bold">✓</span> : <Lock size={13} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="number" min="0" disabled={!matSizes[sz].enabled} value={matSizes[sz].qty}
                        onChange={e => setMatSizes(p => ({ ...p, [sz]: { ...p[sz], qty: e.target.value } }))}
                        className={`flex-1 border rounded-lg px-4 py-3 text-xl outline-none text-center transition-colors ${matSizes[sz].enabled ? 'border-gray-300 text-gray-700 bg-white focus:border-[#3ca4c7]' : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'}`} />
                      {!matSizes[sz].enabled && <Lock size={16} className="text-gray-400 shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">Stock limit</p>
                <div className="flex items-center gap-5">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Maximum Limit</label>
                  <input type="number" min="0" value={matMaxLimit} onChange={e => setMatMaxLimit(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
              </div>
              <div className="text-center px-4">
                <p className="text-xl font-semibold text-gray-700 mb-2">Reminder</p>
                <p className="text-xl text-gray-500">Each size of the material will be saved as a separate element in the database. The maximum limit is used for indicating if it is in low supply.</p>
              </div>
              <button onClick={handleSaveMat} className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors">Save Material</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          NEW INGREDIENT MODAL
      ══════════════════════════════════════════ */}
      {showNewIng && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1100px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Ingredient</h3>
              <button onClick={closeIng} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-12 py-8 flex flex-col gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">General Information</p>
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Ingredient Name</label>
                    <input type="text" value={ingName} onChange={e => setIngName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Ingredient Type</label>
                    <div className="relative flex-1">
                      <select value={ingType} onChange={e => setIngType(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]">
                        {ING_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Maximum Limit</label>
                    <input type="number" min="0" value={ingMaxLimit} onChange={e => setIngMaxLimit(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                    <div className="relative w-40 shrink-0">
                      <select value={ingUnit} onChange={e => setIngUnit(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]">
                        {ING_UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-xl text-gray-600 flex-1">Consider Ingredient as an Add-On?</span>
                    <button onClick={() => setIngIsAddOn(v => !v)}
                      className={`w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${ingIsAddOn ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300'}`}>
                      {ingIsAddOn && <span className="font-bold text-xl">✓</span>}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">Ingredient Batch Set-Up</p>
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Expiration Date for current batch:</label>
                    <input type="date" value={ingExpDate} onChange={e => setIngExpDate(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Batch quantity:</label>
                    <input type="number" min="0" value={ingBatchQty} onChange={e => setIngBatchQty(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                </div>
              </div>
              <div className="text-center px-4">
                <p className="text-xl font-semibold text-gray-700 mb-2">Reminder</p>
                <p className="text-xl text-gray-500">Once saved, only the General Information can be edited through the Inventory Actions.</p>
              </div>
              <button onClick={handleSaveIng} className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors">Save Ingredient</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MATERIAL DIALOGS
      ══════════════════════════════════════════ */}
      {showMatConf && pendingMat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Material?</h3>
            <p className="text-xl text-gray-600">Material: <span className="font-semibold">{pendingMat.name}</span></p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {pendingMat.entries.map(e => <p key={e.matId} className="text-xl text-gray-700">{e.matId} — {e.size} (Qty: {e.qty})</p>)}
            </div>
            <p className="text-xl text-gray-400 italic">Each size will be saved as a separate entry in the database.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowMatConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmMat} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showMatOk && pendingMat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">New Material Saved!</h3>
            <p className="text-xl text-gray-600">Material: <span className="font-semibold">{pendingMat.name}</span></p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {pendingMat.entries.map(e => <p key={e.matId} className="text-xl text-gray-700">{e.matId} — {e.size}</p>)}
            </div>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowMatOk(false); setShowNewMat(false); resetMat(); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showMatDisc && <DiscardDialog onCancel={() => setShowMatDisc(false)} onConfirm={() => { setShowMatDisc(false); setShowNewMat(false); resetMat(); }} />}

      {/* ══════════════════════════════════════════
          INGREDIENT DIALOGS
      ══════════════════════════════════════════ */}
      {showIngConf && pendingIng && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Ingredient?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">ID: <span className="font-semibold">{pendingIng.ingredientId}</span></p>
              <p className="text-xl text-gray-700">Name: <span className="font-semibold">{pendingIng.name}</span></p>
              <p className="text-xl text-gray-700">Batch: {pendingIng.batchId} — Qty: {pendingIng.quantity} {pendingIng.unit}</p>
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowIngConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmIng} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showIngOk && pendingIng && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">New Ingredient Saved!</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">{pendingIng.ingredientId} — {pendingIng.name}</p>
              <p className="text-xl text-gray-700">Batch: {pendingIng.batchId}</p>
            </div>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowIngOk(false); setShowNewIng(false); resetIng(); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showIngDisc && <DiscardDialog onCancel={() => setShowIngDisc(false)} onConfirm={() => { setShowIngDisc(false); setShowNewIng(false); resetIng(); }} />}

      {/* ══════════════════════════════════════════
          HIDE CONFIRMATION
      ══════════════════════════════════════════ */}
      {showHideConf && hideRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Hide this item?</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{hideRow.displayName}</span> will be moved to the inactive list.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowHideConf(false); setHideRow(null); }} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmHide} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          RETRIEVE MATERIAL — quantity form
      ══════════════════════════════════════════ */}
      {showRetMatForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[900px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Set up new quantity for Material</h3>
              <button onClick={() => setShowRetMatDisc(true)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">Starting Quantity</p>
                <div className="flex items-center justify-center gap-8">
                  {retMatSibs.map(sib => (
                    <div key={sib.id} className="flex items-center gap-3">
                      <span className="text-xl font-semibold text-gray-700">{sib.size ? sib.size[0] : '?'}</span>
                      <input
                        type="number" min="0"
                        value={retMatQtys[sib.size || 'N/A'] ?? ''}
                        onChange={e => setRetMatQtys(p => ({ ...p, [sib.size || 'N/A']: e.target.value }))}
                        className="w-32 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none text-center focus:border-[#3ca4c7]"
                      />
                      <span className="text-xl text-gray-500">units</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center px-4">
                <p className="text-xl font-semibold text-gray-700 mb-2">Reminder</p>
                <p className="text-xl text-gray-500">
                  {retMatMaxLimit > 0
                    ? `The current maximum limit for this item is ${retMatMaxLimit}. You may change it via the Edit action.`
                    : 'No maximum limit is set for this item. You may set one via the Edit action.'}
                </p>
              </div>
              <button
                onClick={() => setShowRetMatConf(true)}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showRetMatConf && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Retrieve Material?</h3>
            <p className="text-xl text-gray-600">The following sizes will be reactivated with new stock:</p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {retMatSibs.map(sib => (
                <p key={sib.id} className="text-xl text-gray-700">
                  {sib.size} — Qty: {retMatQtys[sib.size || 'N/A'] || 0} units
                </p>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowRetMatConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmRetMat} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showRetMatDisc && (
        <DiscardDialog
          onCancel={() => setShowRetMatDisc(false)}
          onConfirm={() => { setShowRetMatDisc(false); setShowRetMatForm(false); setRetMatSibs([]); setRetMatQtys({}); }}
        />
      )}

      {/* ══════════════════════════════════════════
          RETRIEVE INGREDIENT — batch form
      ══════════════════════════════════════════ */}
      {showRetIngForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[900px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Set up new batch for Ingredient</h3>
              <button onClick={() => setShowRetIngDisc(true)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">New starting batch</p>
                <div className="flex items-start gap-8 flex-wrap">
                  <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
                    <label className="text-xl text-gray-600">Expiration Date for current batch:</label>
                    <input type="date" value={retIngExpDate} onChange={e => setRetIngExpDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                    <label className="text-xl text-gray-600">Batch quantity:</label>
                    <input type="number" min="0" value={retIngQty} onChange={e => setRetIngQty(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                </div>
              </div>
              <div className="text-center px-4">
                <p className="text-xl font-semibold text-gray-700 mb-2">Reminder</p>
                <p className="text-xl text-gray-500">
                  {retIngMaxLimit > 0
                    ? `The current maximum limit for this item is ${retIngMaxLimit}. You may change it via the Edit action.`
                    : 'No maximum limit is set for this item. You may set one via the Edit action.'}
                </p>
              </div>
              <button
                onClick={() => setShowRetIngConf(true)}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showRetIngConf && retIngRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Retrieve Ingredient?</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{retIngRow.displayName}</span> will be reactivated with a new batch:</p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">Batch ID: {retIngExpDate ? genBatchId(retIngExpDate, 0) : '—'}</p>
              <p className="text-xl text-gray-700">Expiry: {retIngExpDate || '—'}</p>
              <p className="text-xl text-gray-700">Quantity: {retIngQty || 0} {retIngRow.raw.unit || 'units'}</p>
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowRetIngConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmRetIng} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showRetIngDisc && (
        <DiscardDialog
          onCancel={() => setShowRetIngDisc(false)}
          onConfirm={() => { setShowRetIngDisc(false); setShowRetIngForm(false); setRetIngRow(null); }}
        />
      )}
    </div>
  );
}