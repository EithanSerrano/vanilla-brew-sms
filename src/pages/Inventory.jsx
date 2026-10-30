import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Search, Filter, Plus, Lock, X, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, MoreVertical, AlignJustify } from 'lucide-react';
import { ID_PREFIX, nextId, formatBatchId } from '../utils/idFormats';
import { syncMenuAvailability } from '../utils/menuAvailability';
import { logRestock, addDaysISO, isExpiredBatch, daysUntilExpiry, usableStock, batchExpiry } from '../utils/supply';
import AdminSidebar from '../layouts/AdminSidebar';

const STATUS_STYLES = {
  normal:          { label: 'Normal Supply',            className: 'text-[#06BC2E]'  },
  low:             { label: 'Low Supply',               className: 'text-[#DF0C0C]'  },
  expiring_low:    { label: 'Low Supply / Expiring',    className: 'text-orange-600' },
  expiring_normal: { label: 'Normal Supply / Expiring', className: 'text-yellow-600' },
  expired:         { label: 'Has Expired Stock',        className: 'text-[#DF0C0C]'  },
};

const MAT_SIZES   = ['Small', 'Medium', 'Large'];
const SIZE_ORDER  = { Small: 0, Medium: 1, Large: 2 };
const ING_TYPES   = ['Dry', 'Frozen', 'Wet'];
const ING_UNITS   = ['grams', 'mL', 'pumps', 'scoops'];
const EXPIRING_DAYS = 7;

function sizePrefix(size) { return size ? `(${size[0]}) ` : ''; }

function computeMaterialStatus(mat) {
  const stock = mat.stock ?? 0;
  const max   = mat.maxLimit || 0;
  if (max === 0) return 'normal';
  return stock < max * 0.1 ? 'low' : 'normal';
}

function computeIngredientStatus(ing) {
  const bats  = (ing.batches || []).filter(b => (b.quantity || 0) > 0);
  const max   = ing.maxLimit || 0;
  const isLow = max > 0 && usableStock(ing) < max * 0.1;
  const isExp = bats.some(b => { const d = daysUntilExpiry(b); return d !== null && d >= 0 && d <= EXPIRING_DAYS; });
  if (bats.some(isExpiredBatch)) return 'expired';
  if (isLow && isExp) return 'expiring_low';
  if (isLow)          return 'low';
  if (isExp)          return 'expiring_normal';
  return 'normal';
}

// Earliest expiry among batches that still hold stock, or null.
function nextExpiry(ing) {
  const live = (ing.batches || []).filter(b => (b.quantity || 0) > 0 && batchExpiry(b));
  if (!live.length) return null;
  const first = live.reduce((a, b) => (batchExpiry(a) <= batchExpiry(b) ? a : b));
  return { date: batchExpiry(first), days: daysUntilExpiry(first) };
}

function computeIngStock(ing) {
  if (!ing.batches) return ing.startingQty ?? ing.stock ?? 0;
  return ing.batches.reduce((s, b) => s + (b.quantity || 0), 0);
}

const genBatchId = formatBatchId;

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
  const [showInactive,    setShowInactive]    = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [sortField,       setSortField]       = useState('displayId');
  const [sortDir,         setSortDir]         = useState('asc');
  const [showArrange,     setShowArrange]     = useState(false);

  // ── Filters ──
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterType,      setFilterType]      = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');

  // ── New Material ──
  const [showNewMat,   setShowNewMat]   = useState(false);
  const [matName,      setMatName]      = useState('');
  const [matStartQty,  setMatStartQty]  = useState('');
  const [matMaxLimit,  setMatMaxLimit]  = useState('');
  const [pendingMat,   setPendingMat]   = useState(null);
  const [showMatConf,  setShowMatConf]  = useState(false);
  const [showMatOk,    setShowMatOk]    = useState(false);
  const [showMatDisc,  setShowMatDisc]  = useState(false);
  const [matSaving,    setMatSaving]    = useState(false);
  const matSavingRef = useRef(false);

  // ── New Ingredient ──
  const [showNewIng,   setShowNewIng]   = useState(false);
  const [ingName,      setIngName]      = useState('');
  const [ingType,      setIngType]      = useState('Dry');
  const [ingUnit,      setIngUnit]      = useState('grams');
  const [ingIsAddOn,   setIngIsAddOn]   = useState(false);
  const [ingHasLevels, setIngHasLevels] = useState(false);
  const [ingMaxLimit,  setIngMaxLimit]  = useState('');
  const [ingExpDate,   setIngExpDate]   = useState('');
  const [ingBatchQty,  setIngBatchQty]  = useState('');
  const [ingShelfLife, setIngShelfLife] = useState('');
  const [ingSupplier,  setIngSupplier]  = useState('');
  const [ingUnitCost,  setIngUnitCost]  = useState('');
  const ingExpAuto = useRef(false);
  const [suppliers,    setSuppliers]    = useState([]);
  const [saveError,    setSaveError]    = useState('');
  const [pendingIng,   setPendingIng]   = useState(null);
  const [showIngConf,  setShowIngConf]  = useState(false);
  const [showIngOk,    setShowIngOk]    = useState(false);
  const [showIngDisc,  setShowIngDisc]  = useState(false);
  const [ingSaving,    setIsSaving]     = useState(false);
  const ingSavingRef = useRef(false);

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

  // ── Resupply Material ──
  const [resupMatRow,      setResupMatRow]      = useState(null);
  const [resupMatAmount,   setResupMatAmount]   = useState('');
  const [resupMatSupplier, setResupMatSupplier] = useState('');
  const [resupMatUnitCost, setResupMatUnitCost] = useState('');
  const [showResupMatForm, setShowResupMatForm] = useState(false);
  const [showResupMatConf, setShowResupMatConf] = useState(false);
  const [showResupMatOk,   setShowResupMatOk]   = useState(false);
  const [showResupMatDisc, setShowResupMatDisc] = useState(false);

  // ── Resupply Ingredient ──
  const [resupIngRow,      setResupIngRow]      = useState(null);
  const [resupIngExpDate,  setResupIngExpDate]  = useState('');
  const [resupIngQty,      setResupIngQty]      = useState('');
  const [resupSupplier,    setResupSupplier]    = useState('');
  const [resupUnitCost,    setResupUnitCost]    = useState('');
  const [showResupIngForm, setShowResupIngForm] = useState(false);
  const [showResupIngConf, setShowResupIngConf] = useState(false);
  const [showResupIngOk,   setShowResupIngOk]   = useState(false);
  const [showResupIngDisc, setShowResupIngDisc] = useState(false);

  // ── View Batches ──
  const [viewBatchRow, setViewBatchRow] = useState(null);

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

  // ── Connected Items (for Hide) ──
  const [connectedItems,   setConnectedItems]   = useState([]);
  const [showConflictList, setShowConflictList] = useState(false);
  const [conflictActions,  setConflictActions]  = useState({});
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  // ── Dropdown ──
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // ── Edit ──
  const [editRow,         setEditRow]         = useState(null);
  const [editName,        setEditName]        = useState('');
  const [editMaxLimit,    setEditMaxLimit]    = useState('');
  const [editIngType,     setEditIngType]     = useState('Dry');
  const [editIngUnit,     setEditIngUnit]     = useState('grams');
  const [editIngIsAddOn,   setEditIngIsAddOn]   = useState(false);
  const [editIngHasLevels, setEditIngHasLevels] = useState(false);
  const [editIngShelfLife, setEditIngShelfLife] = useState('');
  const [showEditForm,    setShowEditForm]    = useState(false);
  const [showEditConf,    setShowEditConf]    = useState(false);
  const [showEditOk,      setShowEditOk]      = useState(false);
  const [showEditDisc,    setShowEditDisc]    = useState(false);

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
    } catch (e) { console.error('Inventory load error:', e); }
    try {
      const rs = await getDocs(collection(db, 'restocklog'));
      setSuppliers([...new Set(rs.docs.map(d => (d.data().supplier || '').trim()).filter(Boolean))].sort());
    } catch (e) { console.error('Supplier list error:', e); }
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const close = () => setOpenDropdownId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  useEffect(() => {
    const close = () => setShowArrange(false);
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
    } catch (e) {
      console.error('Audit log error:', e);
    }
  };

  // ── Combined rows ──
  const allRows = [
    ...materials.map(m => ({
      _type: 'material', _docId: m.id,
      displayId:    m.materialId || m.id,
      displayName:  `${sizePrefix(m.size)}${m.name}`,
      displayCat:   m.category || 'Material',
      displayStock: String(m.stock ?? '—'),
      displayUnit:        'units',
      displayLastUpdated: fmtDate(m.lastUpdated),
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
      displayUnit:        ing.unit || 'units',
      displayLastUpdated: fmtDate(ing.lastUpdated),
      expiry: nextExpiry(ing),
      status:  computeIngredientStatus(ing),
      active:  ing.isActive !== false && ing.archived !== true,
      hiddenAt: ing.hiddenAt, raw: ing,
    })),
  ];

  const isFiltered = !!(filterType || filterStatus);
  const clearFilters = () => { setFilterType(''); setFilterStatus(''); };

  const toDate = ts => ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date(0);
  const displayed = allRows
    .filter(r => showInactive ? !r.active : r.active)
    .filter(r => !searchQuery ||
      r.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(r => !filterType   || r._type  === filterType)
    .filter(r => !filterStatus || r.status === filterStatus)
    .sort((a, b) => {
      let av, bv;
      if (sortField === 'displayName') {
        av = a.displayName.toLowerCase();
        bv = b.displayName.toLowerCase();
      } else if (sortField === 'displayCat') {
        av = a.displayCat.toLowerCase();
        bv = b.displayCat.toLowerCase();
      } else if (sortField === 'lastUpdated') {
        av = toDate(a.raw.lastUpdated);
        bv = toDate(b.raw.lastUpdated);
      } else {
        av = a.displayId;
        bv = b.displayId;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  // ════════════════════════════════════
  // NEW MATERIAL
  // ════════════════════════════════════
  const matHasData = () => matName.trim() !== '' || matStartQty !== '' || matMaxLimit !== '';
  const resetMat = () => { setMatName(''); setMatStartQty(''); setMatMaxLimit(''); setPendingMat(null); };
  const closeMat = () => { matHasData() ? setShowMatDisc(true) : (setShowNewMat(false), resetMat()); };

  const handleSaveMat = async () => {
    if (!matName.trim()) return;
    const snap = await getDocs(collection(db, 'materials'));
    const newMatId = nextId(ID_PREFIX.material, snap.docs.map(d => d.data().materialId));
    setPendingMat({
      name: matName.trim(), maxLimit: parseInt(matMaxLimit) || 0,
      entries: [{ qty: parseInt(matStartQty) || 0, matId: newMatId }],
    });
    setShowMatConf(true);
  };


  const saveFailure = (err, what) => {
    console.error(`Save ${what} error:`, err);
    setSaveError(err?.code === 'permission-denied'
      ? `Your role is not allowed to add a ${what}. Ask an admin, or update the Firestore rules for this collection.`
      : `Could not save the ${what}. ${err?.message || 'Please try again.'}`);
  };

  const handleConfirmMat = async () => {
    if (!pendingMat || matSavingRef.current) return;
    matSavingRef.current = true;
    setMatSaving(true);
    setSaveError('');
    try {
      const now = new Date();
      for (const e of pendingMat.entries) {
        await addDoc(collection(db, 'materials'), {
          materialId: e.matId, name: pendingMat.name,
          category: 'Material', stock: e.qty, startingQty: e.qty,
          maxLimit: pendingMat.maxLimit, isActive: true, createdAt: now,
        });
        await logAudit('ADD_MATERIAL', 'material', e.matId, pendingMat.name, {
          startingQty: e.qty, maxLimit: pendingMat.maxLimit,
        });
      }
      await loadData(); setShowMatConf(false); setShowMatOk(true);
    } catch (err) {
      saveFailure(err, 'material');
    } finally {
      matSavingRef.current = false;
      setMatSaving(false);
    }
  };

  // ════════════════════════════════════
  // NEW INGREDIENT
  // ════════════════════════════════════
  const ingHasData = () => ingName.trim() !== '' || ingExpDate !== '' || ingBatchQty !== '' || ingMaxLimit !== '';
  const resetIng = () => { setIngName(''); setIngType('Dry'); setIngUnit('grams'); setIngIsAddOn(false); setIngHasLevels(false); setIngMaxLimit(''); setIngExpDate(''); setIngBatchQty(''); setIngShelfLife(''); setIngSupplier(''); setIngUnitCost(''); ingExpAuto.current = false; setPendingIng(null); };
  const closeIng = () => { ingHasData() ? setShowIngDisc(true) : (setShowNewIng(false), resetIng()); };

  const handleSaveIng = async () => {
    if (!ingName.trim() || !ingExpDate || !ingBatchQty) return;
    const snap = await getDocs(collection(db, 'ingredients'));
    const newId = nextId(ID_PREFIX.ingredient, snap.docs.map(d => d.data().ingredientId));
    setPendingIng({
      ingredientId: newId, name: ingName.trim(), type: ingType, unit: ingUnit,
      isAddOn: ingIsAddOn, hasLevels: ingHasLevels, maxLimit: parseInt(ingMaxLimit) || 0,
      batchId: genBatchId(ingExpDate, 0), expirationDate: new Date(ingExpDate),
      quantity: parseInt(ingBatchQty) || 0,
      shelfLifeDays: parseInt(ingShelfLife) || null, supplier: ingSupplier.trim(), unitCost: ingUnitCost === '' ? null : Number(ingUnitCost),
    });
    setShowIngConf(true);
  };

  const handleConfirmIng = async () => {
    if (!pendingIng || ingSavingRef.current) return;
    ingSavingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    try {
      const now = new Date();
      const created = await addDoc(collection(db, 'ingredients'), {
        ingredientId: pendingIng.ingredientId, name: pendingIng.name, type: pendingIng.type,
        unit: pendingIng.unit, isAddOn: pendingIng.isAddOn, hasLevels: pendingIng.hasLevels, maxLimit: pendingIng.maxLimit,
        isActive: true,
        shelfLifeDays: pendingIng.shelfLifeDays,
        batches: [{
          batchId: pendingIng.batchId, expirationDate: pendingIng.expirationDate, quantity: pendingIng.quantity, createdAt: now,
          supplier: pendingIng.supplier, unitCost: pendingIng.unitCost, receivedAt: now,
        }],
        createdAt: now,
      });
      await logRestock({
        itemType: 'ingredient', refId: created.id, displayId: pendingIng.ingredientId, name: pendingIng.name,
        unit: pendingIng.unit, batchId: pendingIng.batchId, expirationDate: pendingIng.expirationDate,
        quantity: pendingIng.quantity, supplier: pendingIng.supplier, unitCost: pendingIng.unitCost,
      });
      await logAudit('ADD_INGREDIENT', 'ingredient', pendingIng.ingredientId, pendingIng.name, {
        type: pendingIng.type, unit: pendingIng.unit, maxLimit: pendingIng.maxLimit,
        batchId: pendingIng.batchId, quantity: pendingIng.quantity,
      });
      await loadData(); setShowIngConf(false); setShowIngOk(true);
    } catch (err) {
      saveFailure(err, 'ingredient');
    } finally {
      ingSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // ════════════════════════════════════
  // HIDE
  // ════════════════════════════════════
  const handleClickHide = async row => {
    setHideRow(row);
    setLoadingConflicts(true);
    setConnectedItems([]);
    setConflictActions({});
    setShowConflictList(false);
    setShowHideConf(true);
    try {
      const snap = await getDocs(collection(db, 'menuItems'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.menuItemId);
      const connected = all.filter(m =>
        (m.variants || m.sizes || []).some(sz => (sz.connections || []).some(c => c.refId === row._docId))
      );
      setConnectedItems(connected);
      setConflictActions({});
    } catch (err) {
      console.error('Error loading connected items:', err);
    } finally {
      setLoadingConflicts(false);
    }
  };
  const handleConfirmHide = async () => {
    if (!hideRow) return;
    for (const item of connectedItems) {
      const action = conflictActions[item.id] || 'unavailable';
      if (action === 'unavailable') {
        await updateDoc(doc(db, 'menuItems', item.id), { isAvailable: false });
      } else {
        const variantField = item.variants ? 'variants' : 'sizes';
        const updatedVariants = (item[variantField] || []).map(sz => ({
          ...sz,
          connections: (sz.connections || []).filter(c => c.refId !== hideRow._docId),
        }));
        await updateDoc(doc(db, 'menuItems', item.id), { [variantField]: updatedVariants });
      }
    }
    const coll   = hideRow._type === 'material' ? 'materials' : 'ingredients';
    const update = hideRow.raw.archived !== undefined ? { archived: true, hiddenAt: new Date() } : { isActive: false, hiddenAt: new Date() };
    await updateDoc(doc(db, coll, hideRow._docId), update);
    await logAudit('HIDE', hideRow._type, hideRow.displayId, hideRow.displayName, {
      connectedItemsAffected: connectedItems.length,
    });
    setShowHideConf(false); setHideRow(null);
    setConnectedItems([]); setConflictActions({}); setShowConflictList(false);
    await loadData();
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
      setRetIngRow(row); setRetIngExpDate(row.raw.shelfLifeDays > 0 ? addDaysISO(row.raw.shelfLifeDays) : ''); setRetIngQty(''); setShowRetIngForm(true);
    }
  };

  const handleConfirmRetMat = async () => {
    for (const sib of retMatSibs) {
      const qty = parseInt(retMatQtys[sib.size || 'N/A']) || 0;
      await updateDoc(doc(db, 'materials', sib.id), { stock: qty, startingQty: qty, isActive: true, hiddenAt: null });
      await logAudit('RETRIEVE', 'material', sib.materialId || sib.id, `${sib.name}${sib.size ? ` (${sib.size})` : ''}`, {
        newQty: qty,
      });
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
    await logAudit('RETRIEVE', 'ingredient', retIngRow.displayId, retIngRow.displayName, {
      batchId, expirationDate: retIngExpDate, quantity: parseInt(retIngQty) || 0,
    });
    await logRestock({
      itemType: 'ingredient', refId: retIngRow._docId, displayId: retIngRow.displayId, name: retIngRow.displayName,
      unit: retIngRow.raw.unit, batchId, expirationDate: new Date(retIngExpDate), quantity: parseInt(retIngQty) || 0,
    });
    await loadData(); setShowRetIngConf(false); setShowRetIngForm(false); setRetIngRow(null);
  };

  // Derived for forms
  const retMatMaxLimit = retMatSibs[0]?.maxLimit || 0;
  const retIngMaxLimit = retIngRow?.raw?.maxLimit || 0;

  // ════════════════════════════════════
  // RESUPPLY MATERIAL
  // ════════════════════════════════════
  const handleResupMat = row => { setResupMatRow(row); setResupMatAmount(''); setResupMatSupplier(''); setResupMatUnitCost(''); setShowResupMatForm(true); };
  const closeResupMat  = () => { resupMatAmount !== '' ? setShowResupMatDisc(true) : (setShowResupMatForm(false), setResupMatRow(null)); };
  const handleConfirmResupMat = async () => {
    const previousStock = resupMatRow.raw.stock || 0;
    const amountAdded = parseInt(resupMatAmount) || 0;
    const newStock = previousStock + amountAdded;
    await updateDoc(doc(db, 'materials', resupMatRow._docId), { stock: newStock, lastUpdated: new Date() });
    await logAudit('RESUPPLY', 'material', resupMatRow.displayId, resupMatRow.displayName, {
      previousStock, amountAdded, newStock,
    });
    await logRestock({
      itemType: 'material', refId: resupMatRow._docId, displayId: resupMatRow.displayId, name: resupMatRow.displayName,
      unit: 'units', quantity: amountAdded, supplier: resupMatSupplier, unitCost: resupMatUnitCost,
    });
    await loadData(); setShowResupMatConf(false); setShowResupMatOk(true);
  };

  // ════════════════════════════════════
  // RESUPPLY INGREDIENT
  // ════════════════════════════════════
  const handleResupIng = row => { setResupIngRow(row); setResupIngExpDate(row.raw.shelfLifeDays > 0 ? addDaysISO(row.raw.shelfLifeDays) : ''); setResupIngQty(''); setResupSupplier(''); setResupUnitCost(''); setShowResupIngForm(true); };
  const closeResupIng  = () => { (resupIngExpDate !== '' || resupIngQty !== '') ? setShowResupIngDisc(true) : (setShowResupIngForm(false), setResupIngRow(null)); };
  const handleConfirmResupIng = async () => {
    const existing = resupIngRow.raw.batches || [];
    const batchId  = genBatchId(resupIngExpDate, existing.length);
    const receivedAt = new Date();
    const newBatch = {
      batchId, expirationDate: new Date(resupIngExpDate), quantity: parseInt(resupIngQty) || 0, createdAt: receivedAt,
      supplier: resupSupplier.trim(), unitCost: resupUnitCost === '' ? null : Number(resupUnitCost), receivedAt,
    };
    await updateDoc(doc(db, 'ingredients', resupIngRow._docId), { batches: [...existing, newBatch], lastUpdated: new Date() });
    await logAudit('RESUPPLY', 'ingredient', resupIngRow.displayId, resupIngRow.displayName, {
      batchId, expirationDate: resupIngExpDate, quantity: parseInt(resupIngQty) || 0,
    });
    await logRestock({
      itemType: 'ingredient', refId: resupIngRow._docId, displayId: resupIngRow.displayId, name: resupIngRow.displayName,
      unit: resupIngRow.raw.unit, batchId, expirationDate: newBatch.expirationDate, quantity: newBatch.quantity,
      supplier: resupSupplier, unitCost: resupUnitCost,
    });
    await loadData(); setShowResupIngConf(false); setShowResupIngOk(true);
  };

  // ════════════════════════════════════
  // ADJUST
  // ════════════════════════════════════
  const handleAdjClick = row => {
    setAdjRow(row);
    setAdjBatchIdx(0);
    setAdjReason('');
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
    if (adjRow._type === 'material') {
      const previousQty = adjRow.raw.stock ?? 0;
      const newQty = parseInt(adjMatQty) || 0;
      await updateDoc(doc(db, 'materials', adjRow._docId), { stock: newQty, lastUpdated: new Date() });
      await logAudit('ADJUST', 'material', adjRow.displayId, adjRow.displayName, {
        previousQty, newQty, reason: adjReason || null,
      });
    } else {
      const updated = adjIngBatches.map(b => ({ ...b, quantity: parseInt(b.newQty) || 0 }));
      await updateDoc(doc(db, 'ingredients', adjRow._docId), { batches: updated, lastUpdated: new Date() });
      const batchChanges = adjIngBatches.map((b, i) => ({
        batchId: b.batchId, previousQty: adjRow.raw.batches?.[i]?.quantity ?? 0, newQty: parseInt(b.newQty) || 0,
      }));
      await logAudit('ADJUST', 'ingredient', adjRow.displayId, adjRow.displayName, {
        batches: batchChanges, reason: adjReason || null,
      });
    }
    await loadData(); setShowAdjConf(false); setShowAdjOk(true);
  };

  // ════════════════════════════════════
  // EDIT
  // ════════════════════════════════════
  const handleEditClick = row => {
    setEditRow(row);
    setEditName(row.raw.name || '');
    setEditMaxLimit(String(row.raw.maxLimit || ''));
    if (row._type === 'ingredient') {
      setEditIngType(row.raw.type || 'Dry');
      setEditIngUnit(row.raw.unit || 'grams');
      setEditIngIsAddOn(row.raw.isAddOn || false);
      setEditIngHasLevels(row.raw.hasLevels || false);
      setEditIngShelfLife(row.raw.shelfLifeDays ? String(row.raw.shelfLifeDays) : '');
    }
    setShowEditForm(true);
  };
  const editHasChanges = () => {
    if (!editRow) return false;
    const base = editName !== (editRow.raw.name || '') || editMaxLimit !== String(editRow.raw.maxLimit || '');
    if (editRow._type === 'material') return base;
    return base || editIngType !== (editRow.raw.type || 'Dry') || editIngUnit !== (editRow.raw.unit || 'grams') || editIngIsAddOn !== (editRow.raw.isAddOn || false) || editIngHasLevels !== (editRow.raw.hasLevels || false) || editIngShelfLife !== (editRow.raw.shelfLifeDays ? String(editRow.raw.shelfLifeDays) : '');
  };
  const closeEdit = () => { editHasChanges() ? setShowEditDisc(true) : (setShowEditForm(false), setEditRow(null)); };
  const handleConfirmEdit = async () => {
    if (!editRow) return;
    if (editRow._type === 'material') {
      const sibs = materials.filter(m => m.name === editRow.raw.name);
      for (const sib of sibs) {
        await updateDoc(doc(db, 'materials', sib.id), { name: editName.trim(), maxLimit: parseInt(editMaxLimit) || 0 });
      }
      await logAudit('EDIT', 'material', editRow.displayId, editRow.displayName, {
        previousName: editRow.raw.name, newName: editName.trim(),
        previousMaxLimit: editRow.raw.maxLimit || 0, newMaxLimit: parseInt(editMaxLimit) || 0,
      });
    } else {
      await updateDoc(doc(db, 'ingredients', editRow._docId), {
        name: editName.trim(), type: editIngType, unit: editIngUnit,
        isAddOn: editIngIsAddOn, hasLevels: editIngHasLevels, maxLimit: parseInt(editMaxLimit) || 0,
        shelfLifeDays: parseInt(editIngShelfLife) || null,
      });
      await logAudit('EDIT', 'ingredient', editRow.displayId, editRow.displayName, {
        previousName: editRow.raw.name, newName: editName.trim(),
        previousMaxLimit: editRow.raw.maxLimit || 0, newMaxLimit: parseInt(editMaxLimit) || 0,
        previousType: editRow.raw.type, newType: editIngType,
        previousUnit: editRow.raw.unit, newUnit: editIngUnit,
        previousIsAddOn: editRow.raw.isAddOn || false, newIsAddOn: editIngIsAddOn,
      });
    }
    await loadData(); setShowEditConf(false); setShowEditOk(true);
  };

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="flex w-full h-full">
      <AdminSidebar />
      <datalist id="supplier-list">{suppliers.map(n => <option key={n} value={n} />)}</datalist>

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
              <span className="text-xl text-gray-600 shrink-0">{showInactive ? 'Showing Archived List' : 'Showing Active List'}</span>
            </div>
            <div className="flex items-center gap-3">
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
                        <button
                          onClick={() => { clearFilters(); setShowFilterPanel(false); }}
                          className="text-xl text-red-400 hover:text-red-600 transition-colors"
                        >Clear all</button>
                      )}
                    </div>

                    {/* Type filter */}
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-lg font-medium text-gray-500 mb-1.5">Type</p>
                      <div className="flex flex-col">
                        {[{ key: 'material', label: 'Material' }, { key: 'ingredient', label: 'Ingredient' }].map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => setFilterType(filterType === key ? '' : key)}
                            className={`w-full text-left px-3 py-2 text-xl rounded-lg transition-colors ${
                              filterType === key
                                ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Status filter — only meaningful on active list */}
                    {!showInactive && (
                      <div className="px-4 pt-2 pb-3 border-t border-gray-100 mt-1">
                        <p className="text-lg font-medium text-gray-500 mb-1.5">Status</p>
                        <div className="flex flex-col">
                          {Object.entries(STATUS_STYLES).map(([key, { label }]) => (
                            <button
                              key={key}
                              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                              className={`w-full text-left px-3 py-2 text-xl rounded-lg transition-colors ${
                                filterStatus === key
                                  ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >{label}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setShowArrange(v => !v); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl transition-colors shrink-0 ${
                    showArrange ? 'bg-[#3ca4c7] text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <AlignJustify size={16} /> Arrange
                </button>
                {showArrange && (
                  <div
                    className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-56 py-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="px-4 pt-1 pb-2 text-lg font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">Sort by</p>
                    {[
                      { field: 'displayId',   labelAsc: 'ID (A → Z)',              labelDesc: 'ID (Z → A)' },
                      { field: 'displayName', labelAsc: 'Name (A → Z)',             labelDesc: 'Name (Z → A)' },
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
              {!showInactive && (<>
                <button onClick={() => setShowNewMat(true)} className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"><Plus size={16} /> New Material</button>
                <button onClick={() => setShowNewIng(true)} className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"><Plus size={16} /> New Ingredient</button>
              </>)}
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0"><RefreshCw size={20} /></button>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {isFiltered && (
          <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
            <span className="text-xl text-gray-500">Filtered by:</span>
            {filterType && (
              <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                {filterType === 'material' ? 'Material' : 'Ingredient'}
                <button onClick={() => setFilterType('')} className="hover:text-[#2b8aa8] transition-colors ml-1">
                  <X size={13} />
                </button>
              </span>
            )}
            {filterStatus && (
              <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                {STATUS_STYLES[filterStatus]?.label}
                <button onClick={() => setFilterStatus('')} className="hover:text-[#2b8aa8] transition-colors ml-1">
                  <X size={13} />
                </button>
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
          <div className="flex items-center pl-9 pr-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[11%] text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[20%] text-xl font-semibold text-gray-800 text-center">Name</span>
            {showInactive ? (
              <>
                <span className="w-[22%] text-xl font-semibold text-gray-800 text-center">Date Archived</span>
                <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Actions</span>
              </>
            ) : (
              <>
                <span className="w-[15%] text-xl font-semibold text-gray-800 text-center">Stock</span>
                <span className="w-[20%] text-xl font-semibold text-gray-800 text-center">Status</span>
                <span className="w-[14%] text-xl font-semibold text-gray-800 text-center">Expiry</span>
                <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Actions</span>
              </>
            )}
          </div>
          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
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
                  <span className="w-[11%] text-xl text-gray-700 text-center">{row.displayId}</span>
                  <span className="w-[20%] text-xl text-gray-700 text-center truncate" title={row.displayName}>{row.displayName}</span>
                  {showInactive ? (
                    <>
                      <span className="w-[22%] text-xl text-gray-700 text-center">{fmtDate(row.hiddenAt)}</span>
                      <div className="flex-1 flex items-center justify-center">
                        <button onClick={() => handleClickRetrieve(row)} className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-1.5 rounded-full text-xl transition-colors">Restore</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="w-[15%] text-xl text-gray-700 text-center">{row.displayStock} {row.displayUnit}</span>
                      <span className={`w-[20%] text-xl font-medium text-center ${s.className}`}>{s.label}</span>
                      <div className="w-[14%] text-center">
                        {row.expiry ? (
                          <>
                            <p className={`text-xl ${row.expiry.days < 0 ? 'text-[#DF0C0C] font-medium' : row.expiry.days <= EXPIRING_DAYS ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
                              {row.expiry.date.toLocaleDateString('en-US')}
                            </p>
                            <p className={`text-base ${row.expiry.days < 0 ? 'text-[#DF0C0C]' : row.expiry.days <= EXPIRING_DAYS ? 'text-orange-600' : 'text-gray-400'}`}>
                              {row.expiry.days < 0 ? `Expired ${-row.expiry.days}d ago` : row.expiry.days === 0 ? 'Expires today' : `${row.expiry.days}d left`}
                            </p>
                          </>
                        ) : <span className="text-xl text-gray-400">—</span>}
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-2">
                        <button onClick={() => handleAdjClick(row)} className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Adjust</button>
                        <button onClick={() => row._type === 'material' ? handleResupMat(row) : handleResupIng(row)} className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors">Resupply</button>
                        <div className="relative">
                          <button
                            onClick={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row._docId ? null : row._docId); }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>
                          {openDropdownId === row._docId && (
                            <div
                              className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1"
                              onClick={e => e.stopPropagation()}
                            >
                              {row._type === 'ingredient' && (
                                <button onClick={() => { setOpenDropdownId(null); setViewBatchRow(row); }} className="w-full px-4 py-2.5 text-left text-xl text-gray-700 hover:bg-gray-50 rounded-t-xl">View Batches</button>
                              )}
                              <button onClick={() => { setOpenDropdownId(null); handleEditClick(row); }} className="w-full px-4 py-2.5 text-left text-xl text-gray-700 hover:bg-gray-50">Edit</button>
                              <button onClick={() => { setOpenDropdownId(null); handleClickHide(row); }} className="w-full px-4 py-2.5 text-left text-xl text-red-500 hover:bg-gray-50 rounded-b-xl">Archive</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
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
          <div className="bg-white rounded-2xl shadow-2xl w-[1300px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Material</h3>
              <button onClick={closeMat} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-12 py-8 flex flex-col gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">General Information</p>
                <div className="flex items-center gap-5">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Material Name</label>
                  <input type="text" value={matName} onChange={e => setMatName(e.target.value)} maxLength={30}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">Starting Quantity</p>
                <div className="flex items-center gap-5">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Starting Quantity</label>
                  <input type="number" min="0" value={matStartQty} onChange={e => setMatStartQty(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  <span className="text-xl text-gray-500 shrink-0">units</span>
                </div>
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
                <p className="text-xl text-gray-500">The maximum limit is used for indicating if the material is in low supply.</p>
              </div>
              {matMaxLimit && matStartQty && parseInt(matStartQty) > parseInt(matMaxLimit) && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                  <p className="text-xl text-orange-600">Starting quantity exceeds the maximum limit of {matMaxLimit} units.</p>
                </div>
              )}
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
          <div className="bg-white rounded-2xl shadow-2xl w-[1300px] max-h-[90vh] overflow-y-auto">
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
                    <input type="text" value={ingName} onChange={e => setIngName(e.target.value)} maxLength={30}
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
                    <label className="text-xl text-gray-600 w-48 shrink-0">Shelf life (days)</label>
                    <input type="number" min="0" placeholder="Optional. Used to auto-fill expiry dates" value={ingShelfLife}
                      onChange={e => {
                        const v = e.target.value;
                        setIngShelfLife(v);
                        if (parseInt(v) > 0 && (ingExpDate === '' || ingExpAuto.current)) { setIngExpDate(addDaysISO(parseInt(v))); ingExpAuto.current = true; }
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
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
                  <div className="flex items-center gap-5">
                    <div className="flex-1">
                      <span className="text-xl text-gray-600">Ingredient Has Levels?</span>
                      <p className="text-xl text-gray-400 mt-0.5">If checked, POS will show level options: 0%, 25%, 50%, 75%, 100% (normal)</p>
                    </div>
                    <button onClick={() => setIngHasLevels(v => !v)}
                      className={`w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${ingHasLevels ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300'}`}>
                      {ingHasLevels && <span className="font-bold text-xl">✓</span>}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">Ingredient Batch Set-Up</p>
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Expiration Date for current batch:</label>
                    <input type="date" value={ingExpDate} onChange={e => { ingExpAuto.current = false; setIngExpDate(e.target.value); }}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Supplier:</label>
                    <input list="supplier-list" value={ingSupplier} onChange={e => setIngSupplier(e.target.value)} placeholder="Optional"
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-48 shrink-0">Cost per {ingUnit}:</label>
                    <input type="number" min="0" step="0.01" value={ingUnitCost} onChange={e => setIngUnitCost(e.target.value)} placeholder="Optional"
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
              {ingMaxLimit && ingBatchQty && parseInt(ingBatchQty) > parseInt(ingMaxLimit) && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                  <p className="text-xl text-orange-600">Batch quantity exceeds the maximum limit of {ingMaxLimit} {ingUnit}.</p>
                </div>
              )}
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
            <p className="text-xl text-gray-600 flex gap-1">Material: <span className="font-semibold truncate" title={pendingMat.name}>{pendingMat.name}</span></p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {pendingMat.entries.map(e => <p key={e.matId} className="text-xl text-gray-700">{e.matId} — Starting Qty: {e.qty}</p>)}
            </div>
            {saveError && <p className="text-lg text-red-500">{saveError}</p>}
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowMatConf(false); setSaveError(''); }} disabled={matSaving} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirmMat} disabled={matSaving} className={`px-6 py-2 rounded-full text-xl transition-colors ${matSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>{matSaving ? 'Saving...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
      {showMatOk && pendingMat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">New Material Saved!</h3>
            <p className="text-xl text-gray-600 flex gap-1">Material: <span className="font-semibold truncate" title={pendingMat.name}>{pendingMat.name}</span></p>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {pendingMat.entries.map(e => <p key={e.matId} className="text-xl text-gray-700 truncate" title={`${e.matId} — ${pendingMat.name}`}>{e.matId} — {pendingMat.name}</p>)}
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
              <p className="text-xl text-gray-700 flex gap-1">Name: <span className="font-semibold truncate" title={pendingIng.name}>{pendingIng.name}</span></p>
              <p className="text-xl text-gray-700">Batch: {pendingIng.batchId} — Qty: {pendingIng.quantity} {pendingIng.unit}</p>
            </div>
            {saveError && <p className="text-lg text-red-500">{saveError}</p>}
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowIngConf(false); setSaveError(''); }} disabled={ingSaving} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirmIng} disabled={ingSaving} className={`px-6 py-2 rounded-full text-xl transition-colors ${ingSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>{ingSaving ? 'Saving...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
      {showIngOk && pendingIng && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">New Ingredient Saved!</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700 truncate" title={`${pendingIng.ingredientId} — ${pendingIng.name}`}>{pendingIng.ingredientId} — {pendingIng.name}</p>
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
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Archive {hideRow.displayName}?</h3>
              <button onClick={() => { setShowHideConf(false); setHideRow(null); setConnectedItems([]); setConflictActions({}); setShowConflictList(false); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-6">
              <p className="text-xl text-gray-600">
                <span className="font-semibold">{hideRow.displayName}</span> will be moved to the inactive list.
              </p>

              {loadingConflicts ? (
                <p className="text-xl text-gray-400 italic">Checking connected menu items…</p>
              ) : connectedItems.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <AlertTriangle size={22} className="text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xl text-gray-700 font-medium">Hiding this {hideRow._type} will affect the availability of its connected menu items.</p>
                      <button
                        onClick={() => setShowConflictList(v => !v)}
                        className="text-[#3ca4c7] hover:underline text-xl mt-1"
                      >
                        {showConflictList ? 'Hide' : 'See'} the list of conflicted menu items ({connectedItems.length})
                      </button>
                    </div>
                  </div>

                  {showConflictList && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <span className="w-[28%] text-xl font-semibold text-gray-700">Menu Item</span>
                        <span className="w-[14%] text-xl font-semibold text-gray-700">Category</span>
                        <span className="w-[10%] text-xl font-semibold text-gray-700 text-center">Status</span>
                        <span className="flex-1 text-xl font-semibold text-gray-700 text-center">Action</span>
                      </div>
                      <div className="flex flex-col divide-y divide-gray-100">
                        {connectedItems.map(item => (
                          <div key={item.id} className="flex items-center px-6 py-4">
                            <span className="w-[28%] text-xl text-gray-700 font-medium">{item.name}</span>
                            <span className="w-[14%] text-xl text-gray-600">{item.category}</span>
                            <span className={`w-[10%] text-xl text-center font-medium ${item.isActive !== false ? 'text-[#06BC2E]' : 'text-gray-400'}`}>
                              {item.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                            <div className="flex-1 flex items-center justify-center gap-10">
                              <label className="flex items-center gap-2 cursor-pointer text-xl text-gray-700">
                                <input type="radio" name={`conflict-${item.id}`}
                                  checked={conflictActions[item.id] === 'remove'}
                                  onChange={() => setConflictActions(p => ({ ...p, [item.id]: 'remove' }))}
                                  className="w-5 h-5 accent-[#3ca4c7]" />
                                Remove from connections
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-xl text-gray-700">
                                <input type="radio" name={`conflict-${item.id}`}
                                  checked={conflictActions[item.id] === 'unavailable'}
                                  onChange={() => setConflictActions(p => ({ ...p, [item.id]: 'unavailable' }))}
                                  className="w-5 h-5 accent-[#3ca4c7]" />
                                Mark as Unavailable
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xl text-gray-500 italic">No connected menu items found.</p>
              )}

              {(() => {
                const allChosen = loadingConflicts
                  ? false
                  : connectedItems.every(item => conflictActions[item.id] !== undefined);
                return (
                  <div className="flex gap-3 justify-end pt-2">
                    <button onClick={() => { setShowHideConf(false); setHideRow(null); setConnectedItems([]); setConflictActions({}); setShowConflictList(false); }} className="px-8 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                    <button
                      onClick={handleConfirmHide}
                      disabled={!allChosen}
                      className={`px-8 py-2 rounded-full text-xl transition-colors ${allChosen ? 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      Confirm and Archive
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          RETRIEVE MATERIAL — quantity form
      ══════════════════════════════════════════ */}
      {showRetMatForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1100px]">
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
            <h3 className="text-2xl font-semibold text-gray-800">Restore Material?</h3>
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
          <div className="bg-white rounded-2xl shadow-2xl w-[1100px]">
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
            <h3 className="text-2xl font-semibold text-gray-800">Restore Ingredient?</h3>
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

      {/* ══════════════════════════════════════════
          RESUPPLY MATERIAL
      ══════════════════════════════════════════ */}
      {showResupMatForm && resupMatRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[900px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Resupply Material</h3>
              <button onClick={closeResupMat} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">New Supply</p>
                <div className="flex items-center gap-5">
                  <label className="text-xl text-gray-600 w-32 shrink-0">Amount</label>
                  <input type="number" min="0" value={resupMatAmount} onChange={e => setResupMatAmount(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  <span className="text-xl text-gray-500 shrink-0">units</span>
                </div>
                <div className="flex items-center gap-5 mt-4">
                  <label className="text-xl text-gray-600 w-32 shrink-0">Supplier</label>
                  <input list="supplier-list" value={resupMatSupplier} onChange={e => setResupMatSupplier(e.target.value)} placeholder="Optional"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
                <div className="flex items-center gap-5 mt-4">
                  <label className="text-xl text-gray-600 w-32 shrink-0">Cost per unit</label>
                  <input type="number" min="0" step="0.01" value={resupMatUnitCost} onChange={e => setResupMatUnitCost(e.target.value)} placeholder="Optional"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                </div>
                {resupMatRow.raw.maxLimit > 0 && (resupMatRow.raw.stock || 0) + (parseInt(resupMatAmount) || 0) > resupMatRow.raw.maxLimit && (
                  <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mt-2">
                    <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                    <p className="text-xl text-orange-600">New total exceeds the maximum limit of {resupMatRow.raw.maxLimit} units.</p>
                  </div>
                )}
              </div>
              <div className="text-center px-4">
                <p className="text-xl font-semibold text-gray-700 mb-2">Reminder</p>
                <p className="text-xl text-gray-500">
                  {resupMatRow.raw.maxLimit > 0
                    ? `The current maximum limit for this material is ${resupMatRow.raw.maxLimit}. You may change it via the Edit action.`
                    : 'No maximum limit is set for this material. You may set one via the Edit action.'}
                </p>
              </div>
              <button onClick={() => setShowResupMatConf(true)}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showResupMatConf && resupMatRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Confirm Resupply?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">Material: <span className="font-semibold">{resupMatRow.displayName}</span></p>
              <p className="text-xl text-gray-700">Adding: <span className="font-semibold">{parseInt(resupMatAmount) || 0} units</span></p>
              <p className="text-xl text-gray-700">New stock: <span className="font-semibold">{(resupMatRow.raw.stock || 0) + (parseInt(resupMatAmount) || 0)} units</span></p>
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowResupMatConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmResupMat} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showResupMatOk && resupMatRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Material Resupplied!</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{resupMatRow.displayName}</span> has been updated.</p>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowResupMatOk(false); setShowResupMatForm(false); setResupMatRow(null); setResupMatAmount(''); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
      {showResupMatDisc && (
        <DiscardDialog onCancel={() => setShowResupMatDisc(false)} onConfirm={() => { setShowResupMatDisc(false); setShowResupMatForm(false); setResupMatRow(null); setResupMatAmount(''); }} />
      )}

      {/* ══════════════════════════════════════════
          RESUPPLY INGREDIENT
      ══════════════════════════════════════════ */}
      {showResupIngForm && resupIngRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[900px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Resupply Ingredient</h3>
              <button onClick={closeResupIng} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-8">
              {(resupIngRow.raw.batches || []).length >= 3 ? (
                <div className="text-center py-6">
                  <p className="text-xl font-semibold text-red-500 mb-2">Batch limit reached</p>
                  <p className="text-xl text-gray-500">This ingredient already has 3 batches. Remove a batch via Adjust before adding a new one.</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xl font-semibold text-gray-700 mb-5">New Batch Expiration Date</p>
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-4 flex-1">
                        <label className="text-xl text-gray-600 shrink-0">Expiration Date for current batch:</label>
                        <input type="date" value={resupIngExpDate} onChange={e => setResupIngExpDate(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                          <label className="text-xl text-gray-600 shrink-0">Batch quantity:</label>
                          <input type="number" min="0" value={resupIngQty} onChange={e => setResupIngQty(e.target.value)}
                            className="w-40 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                        </div>
                        {resupIngRow.raw.maxLimit > 0 && (resupIngRow.raw.batches || []).reduce((s, b) => s + (b.quantity || 0), 0) + (parseInt(resupIngQty) || 0) > resupIngRow.raw.maxLimit && (
                          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mt-1">
                            <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                            <p className="text-lg text-orange-600">New total exceeds the limit of {resupIngRow.raw.maxLimit} {resupIngRow.raw.unit || 'units'}.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4 flex-1">
                      <label className="text-xl text-gray-600 shrink-0">Supplier:</label>
                      <input list="supplier-list" value={resupSupplier} onChange={e => setResupSupplier(e.target.value)} placeholder="Optional"
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="text-xl text-gray-600 shrink-0">Cost per {resupIngRow.raw.unit || 'unit'}:</label>
                      <input type="number" min="0" step="0.01" value={resupUnitCost} onChange={e => setResupUnitCost(e.target.value)} placeholder="Optional"
                        className="w-40 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                    </div>
                  </div>
                  {resupIngRow.raw.shelfLifeDays > 0 && (
                    <p className="text-xl text-gray-400 -mt-4">Expiry pre-filled from the {resupIngRow.raw.shelfLifeDays}-day shelf life. Change it if the delivery says otherwise.</p>
                  )}
                  <div className="text-center px-4">
                    <p className="text-xl font-semibold text-gray-700 mb-2">Reminder</p>
                    <p className="text-xl text-gray-500">
                      {`Batch ${(resupIngRow.raw.batches || []).length + 1} of 3. `}
                      {resupIngRow.raw.maxLimit > 0
                        ? `The current maximum limit is ${resupIngRow.raw.maxLimit} ${resupIngRow.raw.unit || 'units'}.`
                        : 'No maximum limit is set.'}
                    </p>
                  </div>
                  <button onClick={() => setShowResupIngConf(true)}
                    className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors">Confirm</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showResupIngConf && resupIngRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Confirm Resupply?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">Ingredient: <span className="font-semibold">{resupIngRow.displayName}</span></p>
              <p className="text-xl text-gray-700">Batch ID: <span className="font-semibold">{resupIngExpDate ? genBatchId(resupIngExpDate, (resupIngRow.raw.batches || []).length) : '—'}</span></p>
              <p className="text-xl text-gray-700">Expiry: <span className="font-semibold">{resupIngExpDate || '—'}</span></p>
              <p className="text-xl text-gray-700">Quantity: <span className="font-semibold">{resupIngQty || 0} {resupIngRow.raw.unit || 'units'}</span></p>
              {resupSupplier.trim() && <p className="text-xl text-gray-700">Supplier: <span className="font-semibold">{resupSupplier.trim()}</span></p>}
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowResupIngConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
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
      {showResupIngDisc && (
        <DiscardDialog onCancel={() => setShowResupIngDisc(false)} onConfirm={() => { setShowResupIngDisc(false); setShowResupIngForm(false); setResupIngRow(null); setResupIngExpDate(''); setResupIngQty(''); }} />
      )}

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
                  <div className="flex items-center px-3 py-2 border-b border-gray-200">
                    <span className="w-[35%] text-xl font-semibold text-gray-700">Batch ID</span>
                    <span className="w-[35%] text-xl font-semibold text-gray-700">Expiration Date</span>
                    <span className="flex-1 text-xl font-semibold text-gray-700 text-right">Quantity</span>
                  </div>
                  {(viewBatchRow.raw.batches || []).map((b, i) => (
                    <div key={i} className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-3">
                      <span className="w-[35%] text-xl text-gray-700">{b.batchId || '—'}</span>
                      <span className="w-[35%] text-xl text-gray-700">{fmtDate(b.expirationDate)}</span>
                      <span className="flex-1 text-xl text-gray-700 text-right">{b.quantity ?? 0} {viewBatchRow.raw.unit || 'units'}</span>
                    </div>
                  ))}
                </>
              )}
              <button onClick={() => setViewBatchRow(null)} className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xl font-semibold transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ADJUST
      ══════════════════════════════════════════ */}
      {showAdjForm && adjRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1000px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">
                Adjust {adjRow._type === 'material' ? 'Material' : 'Ingredient'} — {adjRow.displayName}
              </h3>
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
                    <span className="text-xl text-gray-500 shrink-0">units</span>
                  </div>
                  {adjRow.raw.maxLimit > 0 && (parseInt(adjMatQty) || 0) > adjRow.raw.maxLimit && (
                    <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                      <p className="text-xl text-orange-600">Quantity exceeds the maximum limit of {adjRow.raw.maxLimit} units.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <p className="text-xl font-semibold text-gray-700">Select Batch</p>
                  {adjIngBatches.length === 0 ? (
                    <p className="text-xl text-gray-400">No batches found.</p>
                  ) : (
                    <>
                      {/* Batch navigator */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-6 py-4">
                        <button
                          onClick={() => setAdjBatchIdx(i => Math.max(0, i - 1))}
                          disabled={adjBatchIdx === 0}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <div className="text-center">
                          <p className="text-xl font-semibold text-gray-700">{adjIngBatches[adjBatchIdx]?.batchId || `Batch ${adjBatchIdx + 1}`}</p>
                          <p className="text-xl text-gray-500">Exp: {fmtDate(adjIngBatches[adjBatchIdx]?.expirationDate)}</p>
                        </div>
                        <button
                          onClick={() => setAdjBatchIdx(i => Math.min(adjIngBatches.length - 1, i + 1))}
                          disabled={adjBatchIdx === adjIngBatches.length - 1}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </div>
                      <p className="text-xl text-gray-400 text-center -mt-4">Batch {adjBatchIdx + 1} of {adjIngBatches.length}</p>
                      {/* Qty edit */}
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">Current quantity</label>
                        <span className="text-xl text-gray-500">{adjIngBatches[adjBatchIdx]?.quantity ?? 0} {adjRow.raw.unit || 'units'}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">New quantity</label>
                        <input
                          type="number" min="0"
                          value={adjIngBatches[adjBatchIdx]?.newQty ?? ''}
                          onChange={e => setAdjIngBatches(p => p.map((x, j) => j === adjBatchIdx ? { ...x, newQty: e.target.value } : x))}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                        />
                        <span className="text-xl text-gray-500 shrink-0">{adjRow.raw.unit || 'units'}</span>
                      </div>
                      {adjRow.raw.maxLimit > 0 && adjIngBatches.reduce((s, b) => s + (parseInt(b.newQty ?? b.quantity) || 0), 0) > adjRow.raw.maxLimit && (
                        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                          <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                          <p className="text-xl text-orange-600">Total quantity exceeds the maximum limit of {adjRow.raw.maxLimit} {adjRow.raw.unit || 'units'}.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* Reason */}
              <div className="flex flex-col gap-3">
                <label className="text-xl font-semibold text-gray-700">Reason <span className="font-normal text-gray-400">(for logs)</span></label>
                <textarea
                  value={adjReason} onChange={e => setAdjReason(e.target.value)}
                  rows={3} placeholder="Enter reason for adjustment..." maxLength={30}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7] resize-none"
                />
              </div>
              <button onClick={() => setShowAdjConf(true)}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showAdjConf && adjRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Confirm Adjustment?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">Item: <span className="font-semibold">{adjRow.displayName}</span></p>
              {adjRow._type === 'ingredient' && adjIngBatches[adjBatchIdx] && (
                <p className="text-xl text-gray-700">Batch: <span className="font-semibold">{adjIngBatches[adjBatchIdx].batchId}</span></p>
              )}
              {adjReason && <p className="text-xl text-gray-700">Reason: <span className="font-semibold">{adjReason}</span></p>}
            </div>
            <p className="text-xl text-gray-500">This will overwrite the current quantity.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowAdjConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmAdj} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showAdjOk && adjRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Quantity Updated!</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{adjRow.displayName}</span> has been adjusted.</p>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowAdjOk(false); setShowAdjForm(false); setAdjRow(null); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
      {showAdjDisc && (
        <DiscardDialog onCancel={() => setShowAdjDisc(false)} onConfirm={() => { setShowAdjDisc(false); setShowAdjForm(false); setAdjRow(null); }} />
      )}

      {/* ══════════════════════════════════════════
          EDIT
      ══════════════════════════════════════════ */}
      {showEditForm && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1100px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Edit {editRow._type === 'material' ? 'Material' : 'Ingredient'}</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-12 py-8 flex flex-col gap-8">
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-5">General Information</p>
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-5">
                    <label className="text-xl text-gray-600 w-52 shrink-0">{editRow._type === 'material' ? 'Material' : 'Ingredient'} Name</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={30}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                  </div>
                  {editRow._type === 'ingredient' && (
                    <>
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">Ingredient Type</label>
                        <div className="relative flex-1">
                          <select value={editIngType} onChange={e => setEditIngType(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]">
                            {ING_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">Maximum Limit</label>
                        <input type="number" min="0" value={editMaxLimit} onChange={e => setEditMaxLimit(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                        <div className="relative w-44 shrink-0">
                          <select value={editIngUnit} onChange={e => setEditIngUnit(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]">
                            {ING_UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                          <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <label className="text-xl text-gray-600 w-52 shrink-0">Shelf life (days)</label>
                        <input type="number" min="0" placeholder="Optional" value={editIngShelfLife} onChange={e => setEditIngShelfLife(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="text-xl text-gray-600 flex-1">Consider Ingredient as an Add-On?</span>
                        <button onClick={() => setEditIngIsAddOn(v => !v)}
                          className={`w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${editIngIsAddOn ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300'}`}>
                          {editIngIsAddOn && <span className="font-bold text-xl">✓</span>}
                        </button>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="flex-1">
                          <span className="text-xl text-gray-600">Ingredient Has Levels?</span>
                          <p className="text-xl text-gray-400 mt-0.5">If checked, POS will show level options: 0%, 25%, 50%, 75%, 100% (normal)</p>
                        </div>
                        <button onClick={() => setEditIngHasLevels(v => !v)}
                          className={`w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${editIngHasLevels ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300'}`}>
                          {editIngHasLevels && <span className="font-bold text-xl">✓</span>}
                        </button>
                      </div>
                    </>
                  )}
                  {editRow._type === 'material' && (
                    <div className="flex items-center gap-5">
                      <label className="text-xl text-gray-600 w-52 shrink-0">Maximum Limit</label>
                      <input type="number" min="0" value={editMaxLimit} onChange={e => setEditMaxLimit(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                    </div>
                  )}
                </div>
              </div>
              {editRow._type === 'material' && (
                <div className="text-center px-4">
                  <p className="text-xl font-semibold text-gray-700 mb-2">Note</p>
                  <p className="text-xl text-gray-500">Changes to the name and maximum limit will be saved immediately.</p>
                </div>
              )}
              <button onClick={() => setShowEditConf(true)} className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}
      {showEditConf && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save Changes?</h3>
            <p className="text-xl text-gray-600">Update details for <span className="font-semibold">{editRow.displayName}</span>?</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowEditConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmEdit} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showEditOk && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Changes Saved!</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{editName}</span> has been updated.</p>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowEditOk(false); setShowEditForm(false); setEditRow(null); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
      {showEditDisc && (
        <DiscardDialog onCancel={() => setShowEditDisc(false)} onConfirm={() => { setShowEditDisc(false); setShowEditForm(false); setEditRow(null); }} />
      )}

      {/* Click-away to close filter panel */}
      {showFilterPanel && (
        <div className="fixed inset-0 z-20" onClick={() => setShowFilterPanel(false)} />
      )}
    </div>
  );
}