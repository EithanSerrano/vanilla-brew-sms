import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Filter, Plus, Lock, X, RefreshCw } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

const STATUS_STYLES = {
  normal:          { label: 'Normal Supply',            className: 'text-green-600'  },
  low:             { label: 'Low Supply',               className: 'text-red-600'    },
  expiring_low:    { label: 'Low Supply / Expiring',    className: 'text-orange-600' },
  expiring_normal: { label: 'Normal Supply / Expiring', className: 'text-yellow-600' },
};

const MAT_SIZES  = ['Small', 'Medium', 'Large'];
const ING_TYPES  = ['Dry', 'Frozen', 'Wet'];
const ING_UNITS  = ['grams', 'pumps', 'scoops'];
const EMPTY_MAT_SIZES = {
  Small:  { enabled: false, qty: '' },
  Medium: { enabled: false, qty: '' },
  Large:  { enabled: false, qty: '' },
};
const EXPIRING_DAYS = 7;

function sizePrefix(size) {
  return size ? `(${size[0]}) ` : '';
}

function computeMaterialStatus(mat) {
  const stock    = mat.stock    ?? 0;
  const maxLimit = mat.maxLimit || 0;
  if (maxLimit === 0) return 'normal';
  return stock < maxLimit * 0.1 ? 'low' : 'normal';
}

function computeIngredientStatus(ing) {
  const now      = new Date();
  const cutoff   = new Date(now.getTime() + EXPIRING_DAYS * 86400000);
  const batches  = ing.batches || [];
  const maxLimit = ing.maxLimit || 0;

  const totalStock = batches.reduce((s, b) => s + (b.quantity || 0), 0);
  const isLow      = maxLimit > 0 && totalStock < maxLimit * 0.1;
  const isExpiring = batches.some(b => {
    if (!b.quantity) return false;
    const exp = b.expirationDate?.toDate?.() || (b.expirationDate ? new Date(b.expirationDate) : null);
    return exp && exp <= cutoff;
  });

  if (isLow && isExpiring) return 'expiring_low';
  if (isLow)               return 'low';
  if (isExpiring)          return 'expiring_normal';
  return 'normal';
}

function computeIngredientStock(ing) {
  if (!ing.batches) return ing.startingQty ?? ing.stock ?? 0;
  return ing.batches.reduce((s, b) => s + (b.quantity || 0), 0);
}

function generateBatchId(dateStr, existingCount) {
  const d  = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `B${mm}${dd}${yy}${String(existingCount + 1).padStart(2, '0')}`;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US');
}

export default function Inventory() {
  const [materials,    setMaterials]    = useState([]);
  const [ingredients,  setIngredients]  = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  // ── New Material state ──
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [matName,         setMatName]         = useState('');
  const [matSizes,        setMatSizes]        = useState(EMPTY_MAT_SIZES);
  const [matMaxLimit,     setMatMaxLimit]     = useState('');
  const [pendingMat,      setPendingMat]      = useState(null);
  const [showMatConfirm,  setShowMatConfirm]  = useState(false);
  const [showMatSuccess,  setShowMatSuccess]  = useState(false);
  const [showMatDiscard,  setShowMatDiscard]  = useState(false);

  // ── New Ingredient state ──
  const [showNewIngredient, setShowNewIngredient] = useState(false);
  const [ingName,           setIngName]           = useState('');
  const [ingType,           setIngType]           = useState('Dry');
  const [ingUnit,           setIngUnit]           = useState('grams');
  const [ingIsAddOn,        setIngIsAddOn]        = useState(false);
  const [ingMaxLimit,       setIngMaxLimit]       = useState('');
  const [ingExpDate,        setIngExpDate]        = useState('');
  const [ingBatchQty,       setIngBatchQty]       = useState('');
  const [pendingIng,        setPendingIng]        = useState(null);
  const [showIngConfirm,    setShowIngConfirm]    = useState(false);
  const [showIngSuccess,    setShowIngSuccess]    = useState(false);
  const [showIngDiscard,    setShowIngDiscard]    = useState(false);

  // ── Load data ──
  const loadData = async () => {
    try {
      const [matSnap, ingSnap] = await Promise.all([
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'ingredients')),
      ]);
      setMaterials(matSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIngredients(ingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Combined display rows ──
  const allRows = [
    ...materials.map(m => ({
      _type:        'material',
      _docId:       m.id,
      displayId:    m.materialId || m.id,
      displayName:  `${sizePrefix(m.size)}${m.name}`,
      displayCat:   m.category || 'Material',
      displayStock: String(m.stock ?? '—'),
      status:       computeMaterialStatus(m),
      active:       m.isActive !== false,
      hiddenAt:     m.hiddenAt,
      raw:          m,
    })),
    ...ingredients.map(ing => ({
      _type:        'ingredient',
      _docId:       ing.id,
      displayId:    ing.ingredientId || ing.id,
      displayName:  ing.name,
      displayCat:   ing.category || 'Ingredient',
      displayStock: String(computeIngredientStock(ing)),
      status:       computeIngredientStatus(ing),
      active:       ing.isActive !== false && ing.archived !== true,
      hiddenAt:     ing.hiddenAt,
      raw:          ing,
    })),
  ];

  const displayed = allRows
    .filter(r => showInactive ? !r.active : r.active)
    .filter(r =>
      !searchQuery ||
      r.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ── Material helpers ──
  const matHasData = () =>
    matName.trim() !== '' ||
    MAT_SIZES.some(s => matSizes[s].enabled || matSizes[s].qty !== '') ||
    matMaxLimit !== '';

  const resetMat = () => {
    setMatName(''); setMatSizes(EMPTY_MAT_SIZES); setMatMaxLimit(''); setPendingMat(null);
  };

  const handleCloseNewMaterial = () => {
    if (matHasData()) setShowMatDiscard(true);
    else { setShowNewMaterial(false); resetMat(); }
  };

  const toggleMatSize = size =>
    setMatSizes(prev => ({
      ...prev,
      [size]: { enabled: !prev[size].enabled, qty: prev[size].enabled ? '' : prev[size].qty },
    }));

  const handleSaveNewMaterial = async () => {
    const enabled = MAT_SIZES.filter(s => matSizes[s].enabled);
    if (!matName.trim() || enabled.length === 0) return;
    const snap = await getDocs(collection(db, 'materials'));
    const nums = snap.docs
      .map(d => d.data().materialId || '')
      .filter(id => /^MAT\d+$/.test(id))
      .map(id => parseInt(id.slice(3)));
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    setPendingMat({
      name:     matName.trim(),
      maxLimit: parseInt(matMaxLimit) || 0,
      entries:  enabled.map((size, i) => ({
        size, qty: parseInt(matSizes[size].qty) || 0,
        matId: `MAT${String(maxNum + i + 1).padStart(3, '0')}`,
      })),
    });
    setShowMatConfirm(true);
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
    await loadData();
    setShowMatConfirm(false);
    setShowMatSuccess(true);
  };

  // ── Ingredient helpers ──
  const ingHasData = () =>
    ingName.trim() !== '' || ingExpDate !== '' || ingBatchQty !== '' || ingMaxLimit !== '';

  const resetIng = () => {
    setIngName(''); setIngType('Dry'); setIngUnit('grams'); setIngIsAddOn(false);
    setIngMaxLimit(''); setIngExpDate(''); setIngBatchQty(''); setPendingIng(null);
  };

  const handleCloseNewIngredient = () => {
    if (ingHasData()) setShowIngDiscard(true);
    else { setShowNewIngredient(false); resetIng(); }
  };

  const handleSaveNewIngredient = async () => {
    if (!ingName.trim() || !ingExpDate || !ingBatchQty) return;
    const snap = await getDocs(collection(db, 'ingredients'));
    const nums = snap.docs
      .map(d => d.data().ingredientId || '')
      .filter(id => /^ING\d+$/.test(id))
      .map(id => parseInt(id.slice(3)));
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const newId  = `ING${String(maxNum + 1).padStart(3, '0')}`;
    setPendingIng({
      ingredientId:   newId,
      name:           ingName.trim(),
      type:           ingType,
      unit:           ingUnit,
      isAddOn:        ingIsAddOn,
      maxLimit:       parseInt(ingMaxLimit) || 0,
      batchId:        generateBatchId(ingExpDate, 0),
      expirationDate: new Date(ingExpDate),
      quantity:       parseInt(ingBatchQty) || 0,
    });
    setShowIngConfirm(true);
  };

  const handleConfirmIng = async () => {
    if (!pendingIng) return;
    const now = new Date();
    await addDoc(collection(db, 'ingredients'), {
      ingredientId: pendingIng.ingredientId,
      name:         pendingIng.name,
      type:         pendingIng.type,
      unit:         pendingIng.unit,
      isAddOn:      pendingIng.isAddOn,
      maxLimit:     pendingIng.maxLimit,
      isActive:     true,
      batches: [{
        batchId:        pendingIng.batchId,
        expirationDate: pendingIng.expirationDate,
        quantity:       pendingIng.quantity,
        createdAt:      now,
      }],
      createdAt: now,
    });
    await loadData();
    setShowIngConfirm(false);
    setShowIngSuccess(true);
  };

  // ── Hide / Retrieve ──
  const handleHide = async row => {
    const coll   = row._type === 'material' ? 'materials' : 'ingredients';
    const update = row.raw.archived !== undefined
      ? { archived: true,  hiddenAt: new Date() }
      : { isActive: false, hiddenAt: new Date() };
    await updateDoc(doc(db, coll, row._docId), update);
    await loadData();
  };

  const handleRetrieve = async row => {
    const coll   = row._type === 'material' ? 'materials' : 'ingredients';
    const update = row.raw.archived !== undefined
      ? { archived: false, hiddenAt: null }
      : { isActive: true,  hiddenAt: null };
    await updateDoc(doc(db, coll, row._docId), update);
    await loadData();
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <div className="flex items-center gap-3">
            {/* Toggle */}
            <button
              onClick={() => setShowInactive(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${showInactive ? 'bg-red-400' : 'bg-green-400'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${showInactive ? 'left-6' : 'left-1'}`} />
            </button>
            <span className="text-xl text-gray-600 shrink-0">
              {showInactive ? 'Showing Inactive List' : 'Showing Active List'}
            </span>

            <button className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-full text-xl transition-colors shrink-0">
              <Filter size={16} /> Filter List
            </button>

            {!showInactive && (
              <>
                <button
                  onClick={() => setShowNewMaterial(true)}
                  className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"
                >
                  <Plus size={16} /> New Material
                </button>
                <button
                  onClick={() => setShowNewIngredient(true)}
                  className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"
                >
                  <Plus size={16} /> New Ingredient
                </button>
              </>
            )}

            <button onClick={loadData} className="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-gray-300 pb-1 mb-5 shrink-0">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search here"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xl text-center">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-800">ID</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Name</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Category</th>
                  {showInactive ? (
                    <th className="py-3 px-4 font-semibold text-gray-800">Date Hidden</th>
                  ) : (
                    <>
                      <th className="py-3 px-4 font-semibold text-gray-800">Stock</th>
                      <th className="py-3 px-4 font-semibold text-gray-800">Status</th>
                    </>
                  )}
                  <th className="py-3 px-4 font-semibold text-gray-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={showInactive ? 5 : 6} className="py-12 text-gray-400">
                      No items found.
                    </td>
                  </tr>
                )}
                {displayed.map((row, i) => {
                  const s = STATUS_STYLES[row.status] || STATUS_STYLES.normal;
                  return (
                    <tr
                      key={`${row._type}-${row._docId}`}
                      className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="py-3 px-4 text-gray-700">{row.displayId}</td>
                      <td className="py-3 px-4 text-gray-700 text-left">{row.displayName}</td>
                      <td className="py-3 px-4 text-gray-700">{row.displayCat}</td>
                      {showInactive ? (
                        <td className="py-3 px-4 text-gray-700">{formatDate(row.hiddenAt)}</td>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-gray-700">{row.displayStock}</td>
                          <td className={`py-3 px-4 font-medium ${s.className}`}>{s.label}</td>
                        </>
                      )}
                      <td className="py-3 px-4">
                        {showInactive ? (
                          <button
                            onClick={() => handleRetrieve(row)}
                            className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                          >
                            Retrieve
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Adjust</button>
                            <button className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Resupply</button>
                            <button className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Edit</button>
                            <button
                              onClick={() => handleHide(row)}
                              className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                            >
                              Hide
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════
          NEW MATERIAL MODAL
      ════════════════════════════════════════ */}
      {showNewMaterial && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Material</h3>
              <button onClick={handleCloseNewMaterial} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="px-8 py-6 flex flex-col gap-6">

              {/* General Information */}
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-4">General Information</p>
                <div className="flex items-center gap-4">
                  <label className="text-xl text-gray-600 w-36 shrink-0">Material Name</label>
                  <input
                    type="text"
                    value={matName}
                    onChange={e => setMatName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                  />
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-3">Sizes</p>
                <div className="grid grid-cols-2 gap-x-8 mb-2 px-2">
                  <span className="text-xl text-gray-500 text-center">Sizes</span>
                  <span className="text-xl text-gray-500 text-center">Starting Quantity</span>
                </div>
                {MAT_SIZES.map(size => (
                  <div key={size} className="grid grid-cols-2 gap-x-8 items-center mb-3">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-xl text-gray-700 w-16">{size}</span>
                      <button
                        onClick={() => toggleMatSize(size)}
                        className={`w-9 h-9 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          matSizes[size].enabled
                            ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                        }`}
                      >
                        {matSizes[size].enabled ? <span className="font-bold">✓</span> : <Lock size={13} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        disabled={!matSizes[size].enabled}
                        value={matSizes[size].qty}
                        onChange={e => setMatSizes(prev => ({ ...prev, [size]: { ...prev[size], qty: e.target.value } }))}
                        className={`flex-1 border rounded-lg px-4 py-2 text-xl outline-none text-center transition-colors ${
                          matSizes[size].enabled
                            ? 'border-gray-300 text-gray-700 bg-white focus:border-[#3ca4c7]'
                            : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      />
                      {!matSizes[size].enabled && <Lock size={16} className="text-gray-400 shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Stock limit */}
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-4">Stock limit</p>
                <div className="flex items-center gap-4">
                  <label className="text-xl text-gray-600 w-36 shrink-0">Maximum Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={matMaxLimit}
                    onChange={e => setMatMaxLimit(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                  />
                </div>
              </div>

              {/* Reminder */}
              <div className="text-center px-4">
                <p className="text-xl font-semibold text-gray-700 mb-1">Reminder</p>
                <p className="text-xl text-gray-500">
                  Each sizes of the material will be saved as a separate element in the database.
                  The maximum limit is used for indicating if it is in low supply.
                </p>
              </div>

              <button
                onClick={handleSaveNewMaterial}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3 rounded-xl text-xl font-semibold transition-colors"
              >
                Save Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          NEW INGREDIENT MODAL
      ════════════════════════════════════════ */}
      {showNewIngredient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Ingredient</h3>
              <button onClick={handleCloseNewIngredient} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="px-8 py-6 flex flex-col gap-6">

              {/* General Information */}
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-4">General Information</p>
                <div className="flex flex-col gap-4">

                  <div className="flex items-center gap-4">
                    <label className="text-xl text-gray-600 w-40 shrink-0">Ingredient Name</label>
                    <input
                      type="text"
                      value={ingName}
                      onChange={e => setIngName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-xl text-gray-600 w-40 shrink-0">Ingredient Type</label>
                    <div className="relative flex-1">
                      <select
                        value={ingType}
                        onChange={e => setIngType(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                      >
                        {ING_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <span className="absolute right-3 top-2.5 text-gray-400 pointer-events-none text-xl">▾</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-xl text-gray-600 w-40 shrink-0">Maximum Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={ingMaxLimit}
                      onChange={e => setIngMaxLimit(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                    />
                    <div className="relative w-32 shrink-0">
                      <select
                        value={ingUnit}
                        onChange={e => setIngUnit(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                      >
                        {ING_UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <span className="absolute right-3 top-2.5 text-gray-400 pointer-events-none text-xl">▾</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xl text-gray-600 flex-1">Consider Ingredient as an Add-On?</span>
                    <button
                      onClick={() => setIngIsAddOn(v => !v)}
                      className={`w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        ingIsAddOn ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300'
                      }`}
                    >
                      {ingIsAddOn && <span className="font-bold text-xl">✓</span>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ingredient Batch Set-Up */}
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-4">Ingredient Batch Set-Up</p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <label className="text-xl text-gray-600 w-40 shrink-0">Expiration Date for current batch:</label>
                    <input
                      type="date"
                      value={ingExpDate}
                      onChange={e => setIngExpDate(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-xl text-gray-600 w-40 shrink-0">Batch quantity:</label>
                    <input
                      type="number"
                      min="0"
                      value={ingBatchQty}
                      onChange={e => setIngBatchQty(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                    />
                  </div>
                </div>
              </div>

              {/* Reminder */}
              <div className="text-center px-4">
                <p className="text-xl font-semibold text-gray-700 mb-1">Reminder</p>
                <p className="text-xl text-gray-500">
                  Once saved, only the General Information can be edited through the Inventory Actions.
                </p>
              </div>

              <button
                onClick={handleSaveNewIngredient}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3 rounded-xl text-xl font-semibold transition-colors"
              >
                Save Ingredient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MATERIAL DIALOGS ════════ */}
      {showMatConfirm && pendingMat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Material?</h3>
            <p className="text-xl text-gray-600">Material: <span className="font-semibold">{pendingMat.name}</span></p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {pendingMat.entries.map(e => (
                <p key={e.matId} className="text-xl text-gray-700">{e.matId} — {e.size} (Qty: {e.qty})</p>
              ))}
            </div>
            <p className="text-xl text-gray-400 italic">Each size will be saved as a separate entry in the database.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowMatConfirm(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmMat} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showMatSuccess && pendingMat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">New Material Saved!</h3>
            <p className="text-xl text-gray-600">Material: <span className="font-semibold">{pendingMat.name}</span></p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {pendingMat.entries.map(e => (
                <p key={e.matId} className="text-xl text-gray-700">{e.matId} — {e.size}</p>
              ))}
            </div>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowMatSuccess(false); setShowNewMaterial(false); resetMat(); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showMatDiscard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Discard Progress?</h3>
            <p className="text-xl text-gray-500">If confirmed, the progress cannot be recovered.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowMatDiscard(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { setShowMatDiscard(false); setShowNewMaterial(false); resetMat(); }} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ INGREDIENT DIALOGS ════════ */}
      {showIngConfirm && pendingIng && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Ingredient?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">ID: <span className="font-semibold">{pendingIng.ingredientId}</span></p>
              <p className="text-xl text-gray-700">Name: <span className="font-semibold">{pendingIng.name}</span></p>
              <p className="text-xl text-gray-700">Batch: {pendingIng.batchId} — Qty: {pendingIng.quantity} {pendingIng.unit}</p>
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowIngConfirm(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmIng} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showIngSuccess && pendingIng && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">New Ingredient Saved!</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">{pendingIng.ingredientId} — {pendingIng.name}</p>
              <p className="text-xl text-gray-700">Batch: {pendingIng.batchId}</p>
            </div>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowIngSuccess(false); setShowNewIngredient(false); resetIng(); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showIngDiscard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Discard Progress?</h3>
            <p className="text-xl text-gray-500">If confirmed, the progress cannot be recovered.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowIngDiscard(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { setShowIngDiscard(false); setShowNewIngredient(false); resetIng(); }} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}