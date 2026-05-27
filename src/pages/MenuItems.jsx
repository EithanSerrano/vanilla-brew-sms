import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Search, Filter, Plus, X, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, Trash2,
} from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

const MENU_CATEGORIES = ['Shawarma', 'Milk Tea', 'Frappe'];
const MENU_SIZES = ['Small', 'Medium', 'Large'];
const EMPTY_SIZES = {
  Small:  { enabled: false, price: '' },
  Medium: { enabled: false, price: '' },
  Large:  { enabled: false, price: '' },
};
const EXPIRING_DAYS = 7;

function sizePrefix(size) { return size ? `(${size[0]}) ` : ''; }

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US');
}

function computeMatStatus(mat) {
  const stock = mat.stock ?? 0;
  const max   = mat.maxLimit || 0;
  if (max === 0) return 'normal';
  return stock < max * 0.1 ? 'low' : 'normal';
}

function computeIngStatus(ing) {
  const now    = new Date();
  const cutoff = new Date(now.getTime() + EXPIRING_DAYS * 86400000);
  const bats   = ing.batches || [];
  const max    = ing.maxLimit || 0;
  const total  = bats.reduce((s, b) => s + (b.quantity || 0), 0);
  if (max > 0 && total < max * 0.1) return 'low';
  const isExp = bats.some(b => {
    if (!b.quantity) return false;
    const e = b.expirationDate?.toDate?.() || (b.expirationDate ? new Date(b.expirationDate) : null);
    return e && e <= cutoff;
  });
  return isExp ? 'expiring' : 'normal';
}

function computeMenuStatus(item, allIngredients, allMaterials) {
  if (item.isAvailable === false) return 'unavailable';
  for (const sz of (item.sizes || [])) {
    for (const conn of (sz.connections || [])) {
      if (conn.type === 'ingredient') {
        const ing = allIngredients.find(i => i.id === conn.refId);
        if (ing && computeIngStatus(ing) === 'low') return 'low_supply';
      } else {
        const mat = allMaterials.find(m => m.id === conn.refId);
        if (mat && computeMatStatus(mat) === 'low') return 'low_supply';
      }
    }
  }
  return 'available';
}

const STATUS_STYLES = {
  available:   { label: 'Available',   className: 'text-[#06BC2E]' },
  low_supply:  { label: 'Low Supply',  className: 'text-[#DF0C0C]' },
  unavailable: { label: 'Unavailable', className: 'text-gray-400'  },
};

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

export default function MenuItems() {
  // ── Data ──
  const [menuItems,   setMenuItems]   = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [materials,   setMaterials]   = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  // ── New Menu — Step 1 ──
  const [showStep1,    setShowStep1]    = useState(false);
  const [menuName,     setMenuName]     = useState('');
  const [menuCategory, setMenuCategory] = useState('Frappe');
  const [menuSizes,    setMenuSizes]    = useState(EMPTY_SIZES);
  const [addOns,       setAddOns]       = useState([]);

  // ── New Menu — Step 2 ──
  const [showStep2,      setShowStep2]      = useState(false);
  const [currentSizeIdx, setCurrentSizeIdx] = useState(0);
  const [connections,    setConnections]    = useState({ Small: [], Medium: [], Large: [] });

  // ── Confirmation / discard ──
  const [pendingMenu,  setPendingMenu]  = useState(null);
  const [showMenuConf, setShowMenuConf] = useState(false);
  const [showMenuOk,   setShowMenuOk]   = useState(false);
  const [showDiscard,  setShowDiscard]  = useState(false);

  // ── View / Hide / Retrieve ──
  const [viewingItem,      setViewingItem]      = useState(null);
  const [hideRow,          setHideRow]          = useState(null);
  const [showHideConf,     setShowHideConf]     = useState(false);
  const [retrieveRow,      setRetrieveRow]      = useState(null);
  const [showRetrieveConf, setShowRetrieveConf] = useState(false);

  // ── Load ──
  const loadData = async () => {
    try {
      const [ms, is, mats] = await Promise.all([
        getDocs(collection(db, 'menuItems')),
        getDocs(collection(db, 'ingredients')),
        getDocs(collection(db, 'materials')),
      ]);
      setMenuItems(ms.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.menuItemId));
      setIngredients(is.docs.map(d => ({ id: d.id, ...d.data() })));
      setMaterials(mats.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('MenuItems load error:', e); }
  };
  useEffect(() => { loadData(); }, []);

  // ── Derived ──
  const activeIngredients  = ingredients.filter(i => i.isActive !== false && i.archived !== true);
  const addOnIngredients   = activeIngredients.filter(i => i.isAddOn === true);
  const activeMaterials    = materials.filter(m => m.isActive !== false);

  const displayed = menuItems
    .filter(m => showInactive ? m.isActive === false : m.isActive !== false)
    .filter(m =>
      !searchQuery ||
      (m.menuItemId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ════════════════════════════════════
  // NEW MENU — HELPERS
  // ════════════════════════════════════
  const enabledSizes = MENU_SIZES.filter(s => menuSizes[s].enabled);

  const step1HasData = () =>
    menuName.trim() !== '' ||
    MENU_SIZES.some(s => menuSizes[s].enabled || menuSizes[s].price !== '') ||
    addOns.length > 0;

  const resetAll = () => {
    setMenuName(''); setMenuCategory('Frappe'); setMenuSizes(EMPTY_SIZES);
    setAddOns([]); setConnections({ Small: [], Medium: [], Large: [] });
    setCurrentSizeIdx(0); setPendingMenu(null);
  };

  const handleCloseStep1 = () => {
    step1HasData() ? setShowDiscard(true) : (setShowStep1(false), resetAll());
  };

  const toggleMenuSize = s =>
    setMenuSizes(p => ({ ...p, [s]: { enabled: !p[s].enabled, price: p[s].enabled ? '' : p[s].price } }));

  // Add-On row management
  const addAddOn = () => setAddOns(p => [...p, { ingredientId: '', name: '', amount: '', price: '' }]);
  const removeAddOn = i => setAddOns(p => p.filter((_, idx) => idx !== i));
  const updateAddOn = (i, field, val) => setAddOns(p => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
  const handleSelectAddOnIng = (i, ingId) => {
    const ing = addOnIngredients.find(x => x.id === ingId);
    setAddOns(p => p.map((a, idx) => idx === i ? { ...a, ingredientId: ingId, name: ing?.name || '' } : a));
  };

  const handleNextStep = () => {
    if (!menuName.trim() || enabledSizes.length === 0) return;
    setCurrentSizeIdx(0);
    setShowStep1(false);
    setShowStep2(true);
  };

  // ════════════════════════════════════
  // CONNECTIONS
  // ════════════════════════════════════
  const currentSize  = enabledSizes[currentSizeIdx] || '';
  const currentConns = connections[currentSize] || [];

  const addConn = type => setConnections(p => ({
    ...p,
    [currentSize]: [...(p[currentSize] || []), { type, refId: '', name: '', amount: '', unit: '' }],
  }));

  const removeConn = idx => setConnections(p => ({
    ...p,
    [currentSize]: p[currentSize].filter((_, i) => i !== idx),
  }));

  const updateConn = (idx, changes) => setConnections(p => ({
    ...p,
    [currentSize]: p[currentSize].map((c, i) => i === idx ? { ...c, ...changes } : c),
  }));

  const handleSelectConnIng = (idx, ingId) => {
    const ing = activeIngredients.find(x => x.id === ingId);
    updateConn(idx, { refId: ingId, name: ing?.name || '', unit: ing?.unit || 'grams' });
  };

  const handleSelectConnMat = (idx, matId) => {
    const mat = activeMaterials.find(x => x.id === matId);
    updateConn(idx, { refId: matId, name: mat ? `${sizePrefix(mat.size)}${mat.name}` : '', unit: 'pieces' });
  };

  const handleGoBackToStep1 = () => { setShowStep2(false); setShowStep1(true); };

  // ════════════════════════════════════
  // SAVE
  // ════════════════════════════════════
  const handlePrepareConfirm = async () => {
    const snap = await getDocs(collection(db, 'menuItems'));
    const nums = snap.docs
      .map(d => d.data().menuItemId || '')
      .filter(id => /^MNT\d+$/.test(id))
      .map(id => parseInt(id.slice(3)));
    const base  = nums.length ? Math.max(...nums) : 0;
    const newId = `MNT${String(base + 1).padStart(3, '0')}`;
    setPendingMenu({
      menuItemId: newId,
      name:       menuName.trim(),
      category:   menuCategory,
      addOns: addOns
        .filter(a => a.ingredientId)
        .map(a => ({
          ingredientId: a.ingredientId,
          name:  a.name,
          amount: parseFloat(a.amount) || 0,
          price:  parseFloat(a.price)  || 0,
        })),
      sizes: enabledSizes.map(sz => ({
        size:  sz,
        price: parseFloat(menuSizes[sz].price) || 0,
        connections: (connections[sz] || [])
          .filter(c => c.refId)
          .map(c => ({
            type:   c.type,
            refId:  c.refId,
            name:   c.name,
            amount: parseFloat(c.amount) || 0,
            unit:   c.unit,
          })),
      })),
    });
    setShowMenuConf(true);
  };

  const handleConfirmNew = async () => {
    if (!pendingMenu) return;
    const now = new Date();
    await addDoc(collection(db, 'menuItems'), {
      menuItemId:  pendingMenu.menuItemId,
      name:        pendingMenu.name,
      category:    pendingMenu.category,
      isActive:    true,
      isAvailable: true,
      addOns:      pendingMenu.addOns,
      sizes:       pendingMenu.sizes,
      createdAt:   now,
      hiddenAt:    null,
    });
    await loadData();
    setShowMenuConf(false);
    setShowStep2(false);
    setShowMenuOk(true);
  };

  // ════════════════════════════════════
  // AVAILABILITY TOGGLE
  // ════════════════════════════════════
  const handleToggleAvailability = async item => {
    await updateDoc(doc(db, 'menuItems', item.id), { isAvailable: item.isAvailable === false });
    await loadData();
  };

  // ════════════════════════════════════
  // HIDE
  // ════════════════════════════════════
  const handleConfirmHide = async () => {
    if (!hideRow) return;
    await updateDoc(doc(db, 'menuItems', hideRow.id), { isActive: false, hiddenAt: new Date() });
    setShowHideConf(false); setHideRow(null); await loadData();
  };

  // ════════════════════════════════════
  // RETRIEVE
  // ════════════════════════════════════
  const handleConfirmRetrieve = async () => {
    if (!retrieveRow) return;
    await updateDoc(doc(db, 'menuItems', retrieveRow.id), { isActive: true, hiddenAt: null });
    setShowRetrieveConf(false); setRetrieveRow(null); await loadData();
  };

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Menu Items</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInactive(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${showInactive ? 'bg-red-400' : 'bg-green-400'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${showInactive ? 'left-6' : 'left-1'}`} />
              </button>
              <span className="text-xl text-gray-600 shrink-0">
                {showInactive ? 'Showing Inactive List' : 'Showing Active List'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-full text-xl transition-colors shrink-0">
                <Filter size={16} /> Filter List
              </button>
              {!showInactive && (
                <button
                  onClick={() => setShowStep1(true)}
                  className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"
                >
                  <Plus size={16} /> New Menu
                </button>
              )}
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-gray-300 pb-1 mb-5 shrink-0">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text" placeholder="Search here" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>

        {/* List */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          {/* Column headers */}
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[14%] text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[20%] text-xl font-semibold text-gray-800 pl-2">Name</span>
            <span className="w-[14%] text-xl font-semibold text-gray-800 text-center">Category</span>
            <span className="w-[13%] text-xl font-semibold text-gray-800 text-center">
              {showInactive ? 'Date Hidden' : 'Status'}
            </span>
            <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>
          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {displayed.length === 0 && (
              <p className="py-12 text-gray-400 text-xl text-center">No items found.</p>
            )}
            {displayed.map(item => {
              const status = computeMenuStatus(item, ingredients, materials);
              const s = STATUS_STYLES[status] || STATUS_STYLES.available;
              return (
                <div
                  key={item.id}
                  className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5"
                >
                  <span className="w-[14%] text-xl text-gray-700 text-center">{item.menuItemId}</span>
                  <span className="w-[20%] text-xl text-gray-700 pl-2">{item.name}</span>
                  <span className="w-[13%] text-xl text-gray-700 text-center">{item.category}</span>
                  {showInactive
                    ? <span className="w-[14%] text-xl text-gray-700 text-center">{fmtDate(item.hiddenAt)}</span>
                    : <span className={`w-[14%] text-xl font-medium text-center ${s.className}`}>{s.label}</span>}
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {showInactive ? (
                      <>
                        <button
                          onClick={() => setViewingItem(item)}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                        >View</button>
                        <button
                          onClick={() => { setRetrieveRow(item); setShowRetrieveConf(true); }}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                        >Retrieve</button>
                      </>
                    ) : (
                      <>
                        {status !== 'unavailable'
                          ? <button
                              onClick={() => handleToggleAvailability(item)}
                              className="bg-[#c47a6a] hover:bg-[#b06050] text-white px-3 py-1.5 rounded-full text-xl transition-colors whitespace-nowrap"
                            >Mark as Unavailable</button>
                          : <button
                              onClick={() => handleToggleAvailability(item)}
                              className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-3 py-1.5 rounded-full text-xl transition-colors whitespace-nowrap"
                            >Mark as Available</button>
                        }
                        <button
                          onClick={() => setViewingItem(item)}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                        >View</button>
                        <button
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                        >Edit</button>
                        <button
                          onClick={() => { setHideRow(item); setShowHideConf(true); }}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                        >Hide</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          STEP 1 — GENERAL INFO + ADD-ONS
      ══════════════════════════════════════════ */}
      {showStep1 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Creating a new Menu Item</h3>
              <button onClick={handleCloseStep1} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="px-12 py-8 grid grid-cols-2 gap-12">
              {/* Left: General Information + Sizes and Price */}
              <div className="flex flex-col gap-8">
                <div>
                  <p className="text-xl font-semibold text-gray-700 mb-5">General Information</p>
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-5">
                      <label className="text-xl text-gray-600 w-40 shrink-0">Menu Name</label>
                      <input
                        type="text" value={menuName} onChange={e => setMenuName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                      />
                    </div>
                    <div className="flex items-center gap-5">
                      <label className="text-xl text-gray-600 w-40 shrink-0">Menu Category</label>
                      <div className="relative flex-1">
                        <select
                          value={menuCategory} onChange={e => setMenuCategory(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                        >
                          {MENU_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xl font-semibold text-gray-700 mb-4">Sizes and Price</p>
                  <div className="grid grid-cols-2 gap-x-8 mb-3 px-2">
                    <span className="text-xl text-gray-500 text-center">Sizes</span>
                    <span className="text-xl text-gray-500 text-center">Price</span>
                  </div>
                  {MENU_SIZES.map(sz => (
                    <div key={sz} className="grid grid-cols-2 gap-x-8 items-center mb-4">
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-xl text-gray-700 w-16">{sz}</span>
                        <button
                          onClick={() => toggleMenuSize(sz)}
                          className={`w-9 h-9 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            menuSizes[sz].enabled
                              ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white'
                              : 'bg-gray-100 border-gray-300'
                          }`}
                        >
                          {menuSizes[sz].enabled && <span className="font-bold text-white text-xl">✓</span>}
                        </button>
                      </div>
                      <input
                        type="number" min="0"
                        disabled={!menuSizes[sz].enabled}
                        value={menuSizes[sz].price}
                        onChange={e => setMenuSizes(p => ({ ...p, [sz]: { ...p[sz], price: e.target.value } }))}
                        className={`border rounded-lg px-4 py-3 text-xl outline-none text-center transition-colors ${
                          menuSizes[sz].enabled
                            ? 'border-gray-300 text-gray-700 bg-white focus:border-[#3ca4c7]'
                            : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Add-Ons */}
              <div className="flex flex-col">
                <p className="text-xl font-semibold text-gray-700 mb-5">Add-Ons</p>
                <div className="flex-1 border border-gray-200 rounded-xl px-5 pt-5 pb-4 flex flex-col gap-4 min-h-[300px] max-h-[420px] overflow-y-auto">
                  {addOns.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl text-gray-500 w-6 shrink-0 text-center">{i + 1}</span>
                      <span className="text-xl text-gray-600 w-20 shrink-0">Add-On</span>
                      <div className="relative flex-1 min-w-0">
                        <select
                          value={a.ingredientId}
                          onChange={e => handleSelectAddOnIng(i, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                        >
                          <option value="">Select…</option>
                          {addOnIngredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                          ))}
                        </select>
                        <span className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">▾</span>
                      </div>
                      <span className="text-xl text-gray-600 shrink-0">Amount</span>
                      <input
                        type="number" min="0" value={a.amount}
                        onChange={e => updateAddOn(i, 'amount', e.target.value)}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-3 text-xl text-gray-700 outline-none text-center focus:border-[#3ca4c7]"
                      />
                      <span className="text-xl text-gray-600 shrink-0">Price</span>
                      <input
                        type="number" min="0" value={a.price}
                        onChange={e => updateAddOn(i, 'price', e.target.value)}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-3 text-xl text-gray-700 outline-none text-center focus:border-[#3ca4c7]"
                      />
                      <button
                        onClick={() => removeAddOn(i)}
                        className="text-gray-400 hover:text-red-400 transition-colors shrink-0 ml-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addAddOn}
                    className="mt-auto w-full bg-gray-200 hover:bg-gray-300 text-gray-600 py-3 rounded-full text-xl transition-colors"
                  >
                    Add another Add-On
                  </button>
                </div>
              </div>
            </div>

            <div className="px-12 pb-10 flex justify-center">
              <button
                onClick={handleNextStep}
                className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-20 py-3.5 rounded-full text-xl font-semibold transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 2 — CONNECTIONS
      ══════════════════════════════════════════ */}
      {showStep2 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200 shrink-0">
              <h3 className="text-2xl font-semibold text-gray-800">Creating a new Menu Item</h3>
              <button
                onClick={handleGoBackToStep1}
                title="Back to form"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronsLeft size={24} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 px-12 py-8 overflow-y-auto flex flex-col gap-6">
              {/* Size navigation title */}
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={() => setCurrentSizeIdx(idx => Math.max(0, idx - 1))}
                  disabled={currentSizeIdx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <h4 className="text-2xl font-semibold text-gray-800">
                  Connections for {currentSize} {menuName}
                </h4>
                <button
                  onClick={() => setCurrentSizeIdx(idx => Math.min(enabledSizes.length - 1, idx + 1))}
                  disabled={currentSizeIdx === enabledSizes.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Connections inner panel */}
              <div className="border border-gray-200 rounded-xl px-6 pt-5 pb-5 flex flex-col gap-5 min-h-[320px] max-h-[460px] overflow-y-auto">
                {currentConns.map((conn, idx) => (
                  <div key={idx} className="flex items-center gap-5">
                    <span className="text-xl text-gray-500 w-6 shrink-0 text-center">{idx + 1}</span>
                    <span className="text-xl text-gray-600 w-28 shrink-0">
                      {conn.type === 'ingredient' ? 'Ingredient' : 'Material'}
                    </span>
                    <div className="relative flex-[3] min-w-0">
                      <select
                        value={conn.refId}
                        onChange={e =>
                          conn.type === 'ingredient'
                            ? handleSelectConnIng(idx, e.target.value)
                            : handleSelectConnMat(idx, e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                      >
                        <option value="">Select…</option>
                        {conn.type === 'ingredient'
                          ? activeIngredients.map(ing => (
                              <option key={ing.id} value={ing.id}>{ing.name}</option>
                            ))
                          : activeMaterials.map(mat => (
                              <option key={mat.id} value={mat.id}>{sizePrefix(mat.size)}{mat.name}</option>
                            ))
                        }
                      </select>
                      <span className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">▾</span>
                    </div>
                    <span className="text-xl text-gray-600 shrink-0">Amount</span>
                    <input
                      type="number" min="0" value={conn.amount}
                      onChange={e => updateConn(idx, { amount: e.target.value })}
                      className="w-36 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none text-center focus:border-[#3ca4c7]"
                    />
                    <span className="text-xl text-gray-500 w-20 shrink-0">{conn.unit || '—'}</span>
                    <button
                      onClick={() => removeConn(idx)}
                      className="text-gray-400 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                {/* Add buttons */}
                <div className="flex gap-5 mt-3">
                  <button
                    onClick={() => addConn('ingredient')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 py-3 rounded-full text-xl transition-colors"
                  >
                    Add an Ingredient
                  </button>
                  <button
                    onClick={() => addConn('material')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 py-3 rounded-full text-xl transition-colors"
                  >
                    Add a Material
                  </button>
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <div className="px-12 pb-10 shrink-0 flex justify-center">
              <button
                onClick={handlePrepareConfirm}
                className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-20 py-3.5 rounded-full text-xl font-semibold transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SAVE CONFIRMATION
      ══════════════════════════════════════════ */}
      {showMenuConf && pendingMenu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Menu Item?</h3>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
              <p className="text-xl text-gray-700">ID: <span className="font-semibold">{pendingMenu.menuItemId}</span></p>
              <p className="text-xl text-gray-700">Name: <span className="font-semibold">{pendingMenu.name}</span></p>
              <p className="text-xl text-gray-700">Category: <span className="font-semibold">{pendingMenu.category}</span></p>
              <p className="text-xl text-gray-700 mt-1 font-semibold">Sizes:</p>
              {pendingMenu.sizes.map(sz => (
                <p key={sz.size} className="text-xl text-gray-600 pl-4">
                  {sz.size} — ₱{sz.price}
                  {sz.connections.length > 0 && ` (${sz.connections.length} connection${sz.connections.length > 1 ? 's' : ''})`}
                </p>
              ))}
            </div>
            {pendingMenu.addOns.length > 0 && (
              <p className="text-xl text-gray-400 italic">{pendingMenu.addOns.length} add-on(s) configured.</p>
            )}
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => setShowMenuConf(false)}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                onClick={handleConfirmNew}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SUCCESS DIALOG
      ══════════════════════════════════════════ */}
      {showMenuOk && pendingMenu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">New Menu Item Saved!</h3>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-xl text-gray-700">{pendingMenu.menuItemId} — {pendingMenu.name}</p>
              <p className="text-xl text-gray-500">{pendingMenu.category}</p>
            </div>
            <div className="flex justify-end mt-1">
              <button
                onClick={() => { setShowMenuOk(false); resetAll(); }}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DISCARD DIALOG
      ══════════════════════════════════════════ */}
      {showDiscard && (
        <DiscardDialog
          onCancel={() => setShowDiscard(false)}
          onConfirm={() => { setShowDiscard(false); setShowStep1(false); resetAll(); }}
        />
      )}

      {/* ══════════════════════════════════════════
          HIDE CONFIRMATION
      ══════════════════════════════════════════ */}
      {showHideConf && hideRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Hide this item?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{hideRow.name}</span> will be moved to the inactive list.
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => { setShowHideConf(false); setHideRow(null); }}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                onClick={handleConfirmHide}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          RETRIEVE CONFIRMATION
      ══════════════════════════════════════════ */}
      {showRetrieveConf && retrieveRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Retrieve Menu Item?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{retrieveRow.name}</span> will be moved back to the active list.
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => { setShowRetrieveConf(false); setRetrieveRow(null); }}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                onClick={handleConfirmRetrieve}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════ */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[580px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Menu Item Details</h3>
              <button
                onClick={() => setViewingItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              ><X size={22} /></button>
            </div>
            <div className="px-8 py-6 flex flex-col gap-4 text-xl text-gray-700">
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold">ID</span>
                <span>{viewingItem.menuItemId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold">Name</span>
                <span>{viewingItem.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold">Category</span>
                <span>{viewingItem.category}</span>
              </div>
              {(viewingItem.sizes || []).length > 0 && (
                <div className="border-b border-gray-100 pb-3">
                  <p className="font-semibold mb-2">Sizes</p>
                  {viewingItem.sizes.map(sz => (
                    <div key={sz.size} className="pl-4 mb-2">
                      <p className="text-gray-700">{sz.size} — ₱{sz.price}</p>
                      {(sz.connections || []).length > 0 && (
                        <div className="pl-4 mt-1 flex flex-col gap-0.5">
                          {sz.connections.map((c, i) => (
                            <p key={i} className="text-gray-500 text-xl">
                              {c.type === 'ingredient' ? 'Ing' : 'Mat'}: {c.name} × {c.amount} {c.unit}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {(viewingItem.addOns || []).length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Add-Ons</p>
                  {viewingItem.addOns.map((a, i) => (
                    <p key={i} className="text-gray-500 pl-4">
                      {a.name} × {a.amount} — ₱{a.price}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}