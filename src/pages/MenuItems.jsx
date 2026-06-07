import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Search, Filter, Plus, X, RefreshCw, AlignJustify,
  ChevronLeft, ChevronRight, ChevronsLeft, Trash2, Loader,
} from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

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
  for (const v of (item.variants || item.sizes || [])) {
    for (const conn of (v.connections || [])) {
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
  const [categories,  setCategories]  = useState([]);
  const [showInactive,  setShowInactive]  = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [sortField,     setSortField]     = useState('menuItemId');
  const [sortDir,       setSortDir]       = useState('asc');
  const [showArrange,   setShowArrange]   = useState(false);

  // ── Filters ──
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterCategory,  setFilterCategory]  = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');

  // ── New / Edit — Step 1 ──
  const [showStep1,    setShowStep1]    = useState(false);
  const [editingItem,  setEditingItem]  = useState(null);
  const [menuName,     setMenuName]     = useState('');
  const [menuCategory, setMenuCategory] = useState('');
  // variantSelections: [{name, checked, price, connections, isLegacy?}]
  const [variantSelections, setVariantSelections] = useState([]);
  const [addOns,            setAddOns]            = useState([]);

  // ── New / Edit — Step 2 ──
  const [showStep2,         setShowStep2]         = useState(false);
  const [currentVariantIdx, setCurrentVariantIdx] = useState(0);

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
      const [ms, is, mats, cats] = await Promise.all([
        getDocs(collection(db, 'menuItems')),
        getDocs(collection(db, 'ingredients')),
        getDocs(collection(db, 'materials')),
        getDocs(query(collection(db, 'categories'), orderBy('name'))),
      ]);
      setMenuItems(ms.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.menuItemId));
      setIngredients(is.docs.map(d => ({ id: d.id, ...d.data() })));
      setMaterials(mats.docs.map(d => ({ id: d.id, ...d.data() })));
      const catDocs = cats.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(catDocs);
      setMenuCategory(prev => prev || catDocs.find(c => !c.parentId)?.name || catDocs[0]?.name || '');
    } catch (e) { console.error('MenuItems load error:', e); }
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const close = () => setShowArrange(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Derived ──
  const sortedCategories = (() => {
    const tops = categories.filter(c => !c.parentId);
    const result = [];
    for (const top of tops) {
      result.push({ ...top, indent: false });
      categories.filter(c => c.parentId === top.id).forEach(sub => result.push({ ...sub, indent: true }));
    }
    const listed = new Set(result.map(c => c.id));
    categories.filter(c => !listed.has(c.id)).forEach(c => result.push({ ...c, indent: !!c.parentId }));
    return result;
  })();

  const activeIngredients = ingredients.filter(i => i.isActive !== false && i.archived !== true);
  const addOnIngredients  = activeIngredients.filter(i => i.isAddOn === true);
  const activeMaterials   = materials.filter(m => m.isActive !== false);

  const isFiltered = !!(filterCategory || filterStatus);

  const displayed = menuItems
    .filter(m => showInactive ? m.isActive === false : m.isActive !== false)
    .filter(m =>
      !searchQuery ||
      (m.menuItemId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(m => !filterCategory || m.category === filterCategory)
    .filter(m => {
      if (!filterStatus) return true;
      return computeMenuStatus(m, ingredients, materials) === filterStatus;
    })
    .sort((a, b) => {
      let av, bv;
      if (sortField === 'name') {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
      } else if (sortField === 'category') {
        av = (a.category || '').toLowerCase();
        bv = (b.category || '').toLowerCase();
      } else {
        av = a.menuItemId || '';
        bv = b.menuItemId || '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const clearFilters = () => { setFilterCategory(''); setFilterStatus(''); };

  // ── Variant selection helpers ──
  const checkedVariants  = variantSelections.filter(v => v.checked);
  const currentVariantEntry = checkedVariants[currentVariantIdx];
  const currentConns        = currentVariantEntry?.connections || [];
  const currentVsIdx        = currentVariantEntry ? variantSelections.indexOf(currentVariantEntry) : -1;

  const toggleVariant = (i) =>
    setVariantSelections(prev => prev.map((vs, idx) =>
      idx === i ? { ...vs, checked: !vs.checked, price: vs.checked ? '' : vs.price } : vs
    ));

  const updateVariantPrice = (i, price) =>
    setVariantSelections(prev => prev.map((vs, idx) => idx === i ? { ...vs, price } : vs));

  // ── Connection helpers ──
  const addConn = type => {
    if (currentVsIdx < 0) return;
    setVariantSelections(prev => prev.map((v, i) =>
      i === currentVsIdx
        ? { ...v, connections: [...v.connections, { type, refId: '', name: '', amount: '', unit: '' }] }
        : v
    ));
  };
  const removeConn = idx => {
    if (currentVsIdx < 0) return;
    setVariantSelections(prev => prev.map((v, i) =>
      i === currentVsIdx
        ? { ...v, connections: v.connections.filter((_, j) => j !== idx) }
        : v
    ));
  };
  const updateConn = (idx, changes) => {
    if (currentVsIdx < 0) return;
    setVariantSelections(prev => prev.map((v, i) =>
      i === currentVsIdx
        ? { ...v, connections: v.connections.map((c, j) => j === idx ? { ...c, ...changes } : c) }
        : v
    ));
  };

  const handleSelectConnIng = (idx, ingId) => {
    const ing = activeIngredients.find(x => x.id === ingId);
    updateConn(idx, { refId: ingId, name: ing?.name || '', unit: ing?.unit || 'grams' });
  };
  const handleSelectConnMat = (idx, matId) => {
    const mat = activeMaterials.find(x => x.id === matId);
    updateConn(idx, { refId: matId, name: mat ? `${sizePrefix(mat.size)}${mat.name}` : '', unit: 'pieces' });
  };

  // ── Build variantSelections from a category name ──
  const buildSelectionsFromCategory = (catName, existingVariants = []) => {
    const cat = categories.find(c => c.name === catName);
    const catVars = cat?.variants || [];
    const catVarNames = new Set(catVars.map(v => v.name));

    const selections = catVars.map(cv => {
      const existing = existingVariants.find(v => (v.name || v.size) === cv.name);
      return {
        name: cv.name,
        checked: !!existing,
        price: existing ? String(existing.price ?? '') : '',
        connections: existing
          ? (existing.connections || []).map(c => ({
              type: c.type, refId: c.refId || '', name: c.name || '',
              amount: String(c.amount ?? ''), unit: c.unit || '',
            }))
          : [],
      };
    });

    // Preserve legacy variants (in item but no longer in category)
    for (const sv of existingVariants) {
      const svName = sv.name || sv.size || '';
      if (svName && !catVarNames.has(svName)) {
        selections.push({
          name: svName,
          checked: true,
          price: String(sv.price ?? ''),
          connections: (sv.connections || []).map(c => ({
            type: c.type, refId: c.refId || '', name: c.name || '',
            amount: String(c.amount ?? ''), unit: c.unit || '',
          })),
          isLegacy: true,
        });
      }
    }
    return selections;
  };

  // ── Form helpers ──
  const step1HasData = () =>
    menuName.trim() !== '' ||
    variantSelections.some(v => v.checked || v.price) ||
    addOns.length > 0;

  const resetAll = () => {
    const defaultCat = categories.find(c => !c.parentId) || categories[0];
    const catVars = defaultCat?.variants || [];
    setMenuName('');
    setMenuCategory(defaultCat?.name || '');
    setVariantSelections(catVars.map(v => ({ name: v.name, checked: false, price: '', connections: [] })));
    setAddOns([]);
    setCurrentVariantIdx(0);
    setPendingMenu(null);
    setEditingItem(null);
  };

  const handleCategoryChange = (catName) => {
    setMenuCategory(catName);
    setVariantSelections(buildSelectionsFromCategory(catName, []));
    setCurrentVariantIdx(0);
  };

  const handleCloseStep1 = () => {
    (editingItem || step1HasData()) ? setShowDiscard(true) : (setShowStep1(false), resetAll());
  };

  // ── ADD-ONS ──
  const addAddOn    = () => setAddOns(p => [...p, { ingredientId: '', name: '', amount: '', price: '' }]);
  const removeAddOn = i  => setAddOns(p => p.filter((_, idx) => idx !== i));
  const updateAddOn = (i, field, val) => setAddOns(p => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
  const handleSelectAddOnIng = (i, ingId) => {
    const ing = addOnIngredients.find(x => x.id === ingId);
    setAddOns(p => p.map((a, idx) => idx === i ? { ...a, ingredientId: ingId, name: ing?.name || '' } : a));
  };

  const handleNextStep = () => {
    if (!menuName.trim() || checkedVariants.length === 0) return;
    setCurrentVariantIdx(0);
    setShowStep1(false);
    setShowStep2(true);
  };

  const handleGoBackToStep1 = () => { setShowStep2(false); setShowStep1(true); };

  // ── OPEN EDIT ──
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setMenuName(item.name || '');
    const catName = item.category || categories.find(c => !c.parentId)?.name || categories[0]?.name || '';
    setMenuCategory(catName);

    const srcVariants = item.variants || (item.sizes || []).map(s => ({
      name: s.size, price: s.price, connections: s.connections,
    }));
    setVariantSelections(buildSelectionsFromCategory(catName, srcVariants));

    setAddOns((item.addOns || []).map(a => ({
      ingredientId: a.ingredientId || '',
      name:         a.name || '',
      amount:       String(a.amount ?? ''),
      price:        String(a.price ?? ''),
    })));

    setCurrentVariantIdx(0);
    setShowStep1(true);
  };

  // ── SAVE ──
  const handlePrepareConfirm = async () => {
    let menuItemId;
    if (editingItem) {
      menuItemId = editingItem.menuItemId;
    } else {
      const snap = await getDocs(collection(db, 'menuItems'));
      const nums = snap.docs
        .map(d => d.data().menuItemId || '')
        .filter(id => /^MNT\d+$/.test(id))
        .map(id => parseInt(id.slice(3)));
      const base = nums.length ? Math.max(...nums) : 0;
      menuItemId = `MNT${String(base + 1).padStart(3, '0')}`;
    }

    setPendingMenu({
      menuItemId,
      name:     menuName.trim(),
      category: menuCategory,
      addOns: addOns
        .filter(a => a.ingredientId)
        .map(a => ({
          ingredientId: a.ingredientId,
          name:   a.name,
          amount: parseFloat(a.amount) || 0,
          price:  parseFloat(a.price)  || 0,
        })),
      variants: variantSelections
        .filter(v => v.checked)
        .map(v => ({
          name:  v.name,
          price: parseFloat(v.price) || 0,
          connections: v.connections
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

  const menuSavingRef = useRef(false);
  const [menuSaving,     setMenuSaving]     = useState(false);
  const [hideSaving,     setHideSaving]     = useState(false);
  const [retrieveSaving, setRetrieveSaving] = useState(false);

  const logAudit = async (action, itemId, itemName, details = {}) => {
    try {
      const session = JSON.parse(sessionStorage.getItem('sessionUser') || '{}');
      const performedBy = session.name || 'Unknown';
      await addDoc(collection(db, 'auditlog'), {
        action, itemType: 'menuItem', itemId, itemName, details, performedBy, timestamp: new Date(),
      });
    } catch (e) { console.error('Audit log error:', e); }
  };

  const handleConfirmSave = async () => {
    if (!pendingMenu || menuSavingRef.current) return;
    menuSavingRef.current = true;
    setMenuSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), {
          name:      pendingMenu.name,
          category:  pendingMenu.category,
          addOns:    pendingMenu.addOns,
          variants:  pendingMenu.variants,
          updatedAt: new Date(),
        });
        await logAudit('EDIT_MENU_ITEM', editingItem.menuItemId || editingItem.id, pendingMenu.name, {
          category: pendingMenu.category,
          variantCount: (pendingMenu.variants || []).length,
        });
      } else {
        await addDoc(collection(db, 'menuItems'), {
          menuItemId:  pendingMenu.menuItemId,
          name:        pendingMenu.name,
          category:    pendingMenu.category,
          isActive:    true,
          isAvailable: true,
          addOns:      pendingMenu.addOns,
          variants:    pendingMenu.variants,
          createdAt:   new Date(),
          hiddenAt:    null,
        });
        await logAudit('ADD_MENU_ITEM', pendingMenu.menuItemId, pendingMenu.name, {
          category: pendingMenu.category,
          variantCount: (pendingMenu.variants || []).length,
        });
      }
      await loadData();
      setShowMenuConf(false);
      setShowStep2(false);
      setShowMenuOk(true);
    } finally {
      menuSavingRef.current = false;
      setMenuSaving(false);
    }
  };

  // ── AVAILABILITY TOGGLE ──
  const handleToggleAvailability = async item => {
    const newAvail = item.isAvailable === false;
    await updateDoc(doc(db, 'menuItems', item.id), { isAvailable: newAvail });
    await logAudit(
      newAvail ? 'SET_AVAILABLE' : 'SET_UNAVAILABLE',
      item.menuItemId || item.id, item.name,
      { isAvailable: newAvail }
    );
    await loadData();
  };

  // ── HIDE ──
  const handleConfirmHide = async () => {
    if (!hideRow || hideSaving) return;
    setHideSaving(true);
    try {
      await updateDoc(doc(db, 'menuItems', hideRow.id), { isActive: false, hiddenAt: new Date() });
      await logAudit('HIDE_MENU_ITEM', hideRow.menuItemId || hideRow.id, hideRow.name, {});
      setShowHideConf(false); setHideRow(null); await loadData();
    } finally { setHideSaving(false); }
  };

  // ── RETRIEVE ──
  const handleConfirmRetrieve = async () => {
    if (!retrieveRow || retrieveSaving) return;
    setRetrieveSaving(true);
    try {
      await updateDoc(doc(db, 'menuItems', retrieveRow.id), { isActive: true, hiddenAt: null });
      await logAudit('RETRIEVE_MENU_ITEM', retrieveRow.menuItemId || retrieveRow.id, retrieveRow.name, {});
      setShowRetrieveConf(false); setRetrieveRow(null); await loadData();
    } finally { setRetrieveSaving(false); }
  };

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  const isEditMode = !!editingItem;
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
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-lg font-medium text-gray-500 mb-1.5">Category</p>
                      <div className="flex flex-col">
                        {sortedCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setFilterCategory(filterCategory === cat.name ? '' : cat.name)}
                            className={`w-full text-left py-2 text-xl rounded-lg transition-colors ${
                              cat.indent ? 'pl-7' : 'px-3'
                            } ${
                              filterCategory === cat.name
                                ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {cat.indent ? `↳ ${cat.name}` : cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
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
                      { field: 'menuItemId', labelAsc: 'ID (A → Z)',       labelDesc: 'ID (Z → A)' },
                      { field: 'name',       labelAsc: 'Name (A → Z)',      labelDesc: 'Name (Z → A)' },
                      { field: 'category',   labelAsc: 'Category (A → Z)',  labelDesc: 'Category (Z → A)' },
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
              {!showInactive && (
                <button
                  onClick={() => { resetAll(); setShowStep1(true); }}
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

        {/* Active filter chips */}
        {isFiltered && (
          <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
            <span className="text-xl text-gray-500">Filtered by:</span>
            {filterCategory && (
              <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                {filterCategory}
                <button onClick={() => setFilterCategory('')} className="hover:text-[#2b8aa8] transition-colors ml-1"><X size={13} /></button>
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
          <input
            type="text" placeholder="Search here" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>

        {/* List */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[16%] text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[17%] text-xl font-semibold text-gray-800 text-center">Name</span>
            <span className="w-[15%] text-xl font-semibold text-gray-800 text-center">Category</span>
            <span className="w-[11%] text-xl font-semibold text-gray-800 text-center">
              {showInactive ? 'Date Hidden' : 'Status'}
            </span>
            <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>
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
                  <span className="w-[20%] text-xl text-gray-700 text-center">{item.name}</span>
                  <span className="w-[13%] text-xl text-gray-700 text-center">{item.category}</span>
                  {showInactive
                    ? <span className="w-[14%] text-xl text-gray-700 text-center">{fmtDate(item.hiddenAt)}</span>
                    : <span className={`w-[14%] text-xl font-medium text-center ${s.className}`}>{s.label}</span>
                  }
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
                          onClick={() => handleOpenEdit(item)}
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
              <h3 className="text-2xl font-semibold text-gray-800">
                {isEditMode ? `Editing: ${editingItem.name}` : 'Creating a new Menu Item'}
              </h3>
              <button onClick={handleCloseStep1} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="px-12 py-8 grid grid-cols-2 gap-12">
              {/* Left: General Information + Variants */}
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
                          value={menuCategory}
                          onChange={e => handleCategoryChange(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                        >
                          {sortedCategories.length === 0
                            ? <option value="">No categories — add one in Menu Categories</option>
                            : sortedCategories.map(c => (
                                <option key={c.id} value={c.name}>
                                  {c.indent ? `    ↳ ${c.name}` : c.name}
                                </option>
                              ))
                          }
                        </select>
                        <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variants from category */}
                <div>
                  <p className="text-xl font-semibold text-gray-700 mb-4">Variants</p>
                  {variantSelections.length === 0 ? (
                    <div className="border border-orange-200 bg-orange-50 rounded-xl px-5 py-4">
                      <p className="text-xl text-orange-600">
                        The selected category has no variants defined. Add variants to the category in Menu Categories first.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl px-5 pt-5 pb-4 flex flex-col gap-4 max-h-[380px] overflow-y-auto">
                      {variantSelections.map((v, i) => (
                        <div key={i} className="flex items-center gap-4">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleVariant(i)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              v.checked
                                ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white'
                                : 'bg-white border-gray-300 hover:border-[#3ca4c7]'
                            }`}
                          >
                            {v.checked && <span className="font-bold text-sm leading-none">✓</span>}
                          </button>

                          {/* Variant name (read-only, from category) */}
                          <span className={`text-xl flex-1 ${v.checked ? 'text-gray-700' : 'text-gray-400'}`}>
                            {v.name}
                            {v.isLegacy && (
                              <span className="ml-2 text-lg text-orange-400">(not in category)</span>
                            )}
                          </span>

                          {/* Price — only active when checked */}
                          <span className={`text-xl shrink-0 ${v.checked ? 'text-gray-600' : 'text-gray-300'}`}>₱</span>
                          <input
                            type="number" min="0" value={v.price}
                            disabled={!v.checked}
                            onChange={e => updateVariantPrice(i, e.target.value)}
                            placeholder="0"
                            className={`w-28 border rounded-lg px-3 py-3 text-xl text-gray-700 outline-none text-center transition-colors ${
                              v.checked
                                ? 'border-gray-300 focus:border-[#3ca4c7]'
                                : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
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
                disabled={!menuName.trim() || checkedVariants.length === 0}
                className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-20 py-3.5 rounded-full text-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200 shrink-0">
              <h3 className="text-2xl font-semibold text-gray-800">
                {isEditMode ? `Editing: ${editingItem.name}` : 'Creating a new Menu Item'}
              </h3>
              <button
                onClick={handleGoBackToStep1}
                title="Back to form"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronsLeft size={24} />
              </button>
            </div>

            <div className="flex-1 px-12 py-8 overflow-y-auto flex flex-col gap-6">
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={() => setCurrentVariantIdx(i => Math.max(0, i - 1))}
                  disabled={currentVariantIdx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                  <h4 className="text-2xl font-semibold text-gray-800">
                    {currentVariantEntry?.name || `Variant ${currentVariantIdx + 1}`} — {menuName}
                  </h4>
                  <p className="text-xl text-gray-400 mt-1">
                    Variant {currentVariantIdx + 1} of {checkedVariants.length}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentVariantIdx(i => Math.min(checkedVariants.length - 1, i + 1))}
                  disabled={currentVariantIdx === checkedVariants.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

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

            <div className="px-12 pb-10 shrink-0 flex justify-center">
              <button
                onClick={handlePrepareConfirm}
                className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-20 py-3.5 rounded-full text-xl font-semibold transition-colors"
              >
                {isEditMode ? 'Save Changes' : 'Confirm'}
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
            <h3 className="text-2xl font-semibold text-gray-800">
              {isEditMode ? 'Save Changes?' : 'Save New Menu Item?'}
            </h3>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
              <p className="text-xl text-gray-700">ID: <span className="font-semibold">{pendingMenu.menuItemId}</span></p>
              <p className="text-xl text-gray-700">Name: <span className="font-semibold">{pendingMenu.name}</span></p>
              <p className="text-xl text-gray-700">Category: <span className="font-semibold">{pendingMenu.category}</span></p>
              <p className="text-xl text-gray-700 mt-1 font-semibold">Variants:</p>
              {pendingMenu.variants.map((v, i) => (
                <p key={i} className="text-xl text-gray-600 pl-4">
                  {v.name} — ₱{v.price}
                  {v.connections.length > 0 && ` (${v.connections.length} connection${v.connections.length > 1 ? 's' : ''})`}
                </p>
              ))}
            </div>
            {pendingMenu.addOns.length > 0 && (
              <p className="text-xl text-gray-400 italic">{pendingMenu.addOns.length} add-on(s) configured.</p>
            )}
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => setShowMenuConf(false)}
                disabled={menuSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >Cancel</button>
              <button
                onClick={handleConfirmSave}
                disabled={menuSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xl transition-colors ${menuSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}
              >
                {menuSaving ? <><Loader size={18} className="animate-spin" /> Saving...</> : 'Confirm'}
              </button>
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
            <h3 className="text-2xl font-semibold text-gray-800">
              {isEditMode ? 'Menu Item Updated!' : 'New Menu Item Saved!'}
            </h3>
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
          onConfirm={() => { setShowDiscard(false); setShowStep1(false); setShowStep2(false); resetAll(); }}
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
                disabled={hideSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >Cancel</button>
              <button
                onClick={handleConfirmHide}
                disabled={hideSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xl transition-colors ${hideSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}
              >
                {hideSaving ? <><Loader size={18} className="animate-spin" /> Saving...</> : 'Confirm'}
              </button>
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
                disabled={retrieveSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >Cancel</button>
              <button
                onClick={handleConfirmRetrieve}
                disabled={retrieveSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xl transition-colors ${retrieveSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}
              >
                {retrieveSaving ? <><Loader size={18} className="animate-spin" /> Saving...</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away to close filter panel */}
      {showFilterPanel && (
        <div className="fixed inset-0 z-20" onClick={() => setShowFilterPanel(false)} />
      )}

      {/* ══════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════ */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[580px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Menu Item Details</h3>
              <button onClick={() => setViewingItem(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
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
              {(viewingItem.variants || viewingItem.sizes || []).length > 0 && (
                <div className="border-b border-gray-100 pb-3">
                  <p className="font-semibold mb-2">Variants</p>
                  {(viewingItem.variants || viewingItem.sizes || []).map((v, vi) => (
                    <div key={vi} className="pl-4 mb-2">
                      <p className="text-gray-700">{v.name || v.size} — ₱{v.price}</p>
                      {(v.connections || []).length > 0 && (
                        <div className="pl-4 mt-1 flex flex-col gap-0.5">
                          {v.connections.map((c, i) => (
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