import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Plus, X, Tag, RefreshCw, Search, Filter, AlignJustify, Loader } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US');
}

function DiscardDialog({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
        <h3 className="text-2xl font-semibold text-gray-800">Discard Changes?</h3>
        <p className="text-xl text-gray-500">If confirmed, your changes cannot be recovered.</p>
        <div className="flex gap-3 justify-end mt-1">
          <button onClick={onCancel}  className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Discard</button>
        </div>
      </div>
    </div>
  );
}

export default function MenuCategories() {
  const [categories, setCategories] = useState([]);
  const [menuItems,  setMenuItems]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  // ── List controls ──
  const [showInactive,    setShowInactive]    = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [showArrange,     setShowArrange]     = useState(false);
  const [sortField,       setSortField]       = useState('name');
  const [sortDir,         setSortDir]         = useState('asc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterType,      setFilterType]      = useState(''); // '' | 'top-level' | 'subcategory'

  // ── New Category form ──
  const [showForm,    setShowForm]    = useState(false);
  const [catName,     setCatName]     = useState('');
  const [catVariants, setCatVariants] = useState([{ name: '' }]);
  const [isParent,    setIsParent]    = useState(false);
  const [subNames,    setSubNames]    = useState([{ name: '', variants: [{ name: '' }] }]);
  const [nameError,   setNameError]   = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);

  // ── Edit Category form ──
  const [editingCat,      setEditingCat]      = useState(null);
  const [showEditForm,    setShowEditForm]    = useState(false);
  const [editName,        setEditName]        = useState('');
  const [editVariants,    setEditVariants]    = useState([{ name: '' }]);
  const [editNameError,   setEditNameError]   = useState('');
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [editSaving,      setEditSaving]      = useState(false);

  // ── New Subcategory form ("+Sub" button) ──
  const [showSubForm,    setShowSubForm]    = useState(false);
  const [subParent,      setSubParent]      = useState(null);
  const [subName,        setSubName]        = useState('');
  const [subVariants,    setSubVariants]    = useState([{ name: '' }]);
  const [subNameError,   setSubNameError]   = useState('');
  const [showSubConfirm, setShowSubConfirm] = useState(false);
  const [subSaving,      setSubSaving]      = useState(false);

  // ── Discard dialogs ──
  const [showNewFormDiscard,  setShowNewFormDiscard]  = useState(false);
  const [showEditFormDiscard, setShowEditFormDiscard] = useState(false);

  // ── Hide ──
  const [hideTarget,   setHideTarget]   = useState(null);
  const [showHideConf, setShowHideConf] = useState(false);
  const [hideSaving,   setHideSaving]   = useState(false);

  // ── Retrieve ──
  const [retrieveTarget,   setRetrieveTarget]   = useState(null);
  const [showRetrieveConf, setShowRetrieveConf] = useState(false);
  const [retrieveSaving,   setRetrieveSaving]   = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catsSnap, itemsSnap] = await Promise.all([
        getDocs(query(collection(db, 'categories'), orderBy('name'))),
        getDocs(collection(db, 'menuItems')),
      ]);
      setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMenuItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.menuItemId));
    } catch (e) { console.error('MenuCategories load error:', e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const close = () => { setShowArrange(false); setShowFilterPanel(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Derived ──
  const countFor = name => menuItems.filter(m => m.category === name).length;
  const isFiltered = !!filterType;

  const isDuplicate = (name, excludeId = null) =>
    categories.some(c => c.id !== excludeId && c.name.trim().toLowerCase() === name.trim().toLowerCase());

  const newFormHasData = () =>
    catName.trim() !== '' ||
    catVariants.some(v => v.name.trim()) ||
    (isParent && subNames.some(s => s.name.trim()));

  const editFormHasChanges = () => {
    if (!editingCat) return false;
    if (editName.trim() !== editingCat.name) return true;
    const origVars = (editingCat.variants || []).map(v => v.name).join('|');
    const newVars  = editVariants.filter(v => v.name.trim()).map(v => v.name.trim()).join('|');
    return origVars !== newVars;
  };

  const sortFn = (a, b) => {
    let av, bv;
    if (sortField === 'itemCount') { av = countFor(a.name); bv = countFor(b.name); }
    else { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  };

  const sortedCategories = (() => {
    const base = categories.filter(c =>
      showInactive ? c.isActive === false : c.isActive !== false
    );

    const typeFiltered = !filterType ? base
      : filterType === 'top-level' ? base.filter(c => !c.parentId)
      : base.filter(c => !!c.parentId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return [...typeFiltered]
        .filter(c => c.name.toLowerCase().includes(q))
        .sort(sortFn)
        .map(c => {
          const parentCat = categories.find(p => p.id === c.parentId);
          return { ...c, indent: !!c.parentId, parentName: parentCat?.name };
        });
    }

    const parents = [...typeFiltered.filter(c => !c.parentId)].sort(sortFn);
    const result = [];
    for (const parent of parents) {
      result.push({ ...parent, indent: false });
      if (filterType !== 'top-level') {
        [...base.filter(c => c.parentId === parent.id)]
          .sort(sortFn)
          .forEach(child => result.push({ ...child, indent: true, parentName: parent.name }));
      }
    }
    const listed = new Set(result.map(c => c.id));
    [...typeFiltered.filter(c => !listed.has(c.id))].sort(sortFn).forEach(c => {
      const parentCat = categories.find(p => p.id === c.parentId);
      result.push({ ...c, indent: !!c.parentId, parentName: parentCat?.name });
    });
    return result;
  })();

  // ── Audit log ──
  const logAudit = async (action, itemId, itemName, details = {}) => {
    try {
      let performedBy = 'Unknown';
      const currentUser = auth.currentUser;
      if (currentUser) {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) performedBy = snap.data().name || 'Unknown';
      }
      await addDoc(collection(db, 'auditlog'), {
        action, itemType: 'category', itemId, itemName, details, performedBy, timestamp: new Date(),
      });
    } catch (e) { console.error('Audit log error:', e); }
  };

  // ── Helpers: sub variant manipulation ──
  const updateSubVariant = (subIdx, varIdx, value) =>
    setSubNames(prev => prev.map((s, si) =>
      si !== subIdx ? s : { ...s, variants: s.variants.map((v, vi) => vi === varIdx ? { name: value } : v) }
    ));
  const addSubVariant = subIdx =>
    setSubNames(prev => prev.map((s, si) =>
      si !== subIdx ? s : { ...s, variants: [...s.variants, { name: '' }] }
    ));
  const removeSubVariant = (subIdx, varIdx) =>
    setSubNames(prev => prev.map((s, si) =>
      si !== subIdx ? s : {
        ...s, variants: s.variants.length <= 1 ? s.variants : s.variants.filter((_, vi) => vi !== varIdx),
      }
    ));

  // ── New Category handlers ──
  const handleOpenForm = () => {
    setCatName(''); setCatVariants([{ name: '' }]); setIsParent(false);
    setSubNames([{ name: '', variants: [{ name: '' }] }]); setNameError(''); setShowForm(true);
  };
  const resetNewForm = () => {
    setCatName(''); setCatVariants([{ name: '' }]);
    setIsParent(false); setSubNames([{ name: '', variants: [{ name: '' }] }]); setNameError('');
  };
  const handleCloseForm = () => {
    newFormHasData() ? setShowNewFormDiscard(true) : (setShowForm(false), resetNewForm());
  };

  const handleSubmit = () => {
    const trimmed = catName.trim();
    if (!trimmed) { setNameError('Category name is required.'); return; }
    if (isDuplicate(trimmed)) { setNameError('A category with this name already exists.'); return; }
    if (isParent) {
      const filledSubs = subNames.filter(s => s.name.trim());
      for (const sub of filledSubs) {
        if (isDuplicate(sub.name.trim())) { setNameError(`Subcategory "${sub.name}" already exists.`); return; }
      }
      const lowers = filledSubs.map(s => s.name.trim().toLowerCase());
      if (new Set(lowers).size < lowers.length) { setNameError('Duplicate subcategory names.'); return; }
    }
    setNameError(''); setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const catVarsToSave = catVariants.filter(v => v.name.trim()).map(v => ({ name: v.name.trim() }));
      const parentRef = await addDoc(collection(db, 'categories'), {
        name: catName.trim(), isParent, parentId: null, variants: catVarsToSave,
      });
      if (isParent) {
        const filledSubs = subNames.filter(s => s.name.trim());
        await Promise.all(filledSubs.map(sub => {
          const subVarsToSave = sub.variants.filter(v => v.name.trim()).map(v => ({ name: v.name.trim() }));
          return addDoc(collection(db, 'categories'), {
            name: sub.name.trim(), isParent: false, parentId: parentRef.id, variants: subVarsToSave,
          });
        }));
        await logAudit('ADD_CATEGORY', parentRef.id, catName.trim(), {
          isParent, variants: catVarsToSave, subcategories: filledSubs.map(s => s.name.trim()),
        });
      } else {
        await logAudit('ADD_CATEGORY', parentRef.id, catName.trim(), { isParent, variants: catVarsToSave });
      }
      await loadData();
      setShowConfirm(false); setShowForm(false);
      resetNewForm();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // ── Edit handlers ──
  const openEdit = (cat) => {
    setEditingCat(cat);
    setEditName(cat.name);
    setEditVariants((cat.variants || []).length > 0
      ? cat.variants.map(v => ({ name: v.name }))
      : [{ name: '' }]);
    setEditNameError('');
    setShowEditForm(true);
  };
  const resetEditForm = () => {
    setShowEditForm(false); setEditingCat(null); setEditName('');
    setEditVariants([{ name: '' }]); setEditNameError('');
  };
  const closeEditForm = () => {
    editFormHasChanges() ? setShowEditFormDiscard(true) : resetEditForm();
  };
  const handleEditSubmit = () => {
    const trimmed = editName.trim();
    if (!trimmed) { setEditNameError('Category name is required.'); return; }
    if (isDuplicate(trimmed, editingCat.id)) { setEditNameError('A category with this name already exists.'); return; }
    setEditNameError(''); setShowEditConfirm(true);
  };
  const handleConfirmEdit = async () => {
    setEditSaving(true);
    try {
      const oldName = editingCat.name;
      const newName = editName.trim();
      const variantsToSave = editVariants.filter(v => v.name.trim()).map(v => ({ name: v.name.trim() }));

      await updateDoc(doc(db, 'categories', editingCat.id), { name: newName, variants: variantsToSave });

      // Cascade rename to menu items if name changed
      if (oldName !== newName) {
        const affected = menuItems.filter(m => m.category === oldName);
        await Promise.all(affected.map(item =>
          updateDoc(doc(db, 'menuItems', item.id), { category: newName })
        ));
      }

      await logAudit('EDIT_CATEGORY', editingCat.id, newName, { oldName, newName, variants: variantsToSave });
      await loadData();
      setShowEditConfirm(false); closeEditForm();
    } catch (e) { console.error(e); }
    setEditSaving(false);
  };

  // ── Hide handler ──
  const handleConfirmHide = async () => {
    if (!hideTarget || hideSaving) return;
    setHideSaving(true);
    try {
      const affected = menuItems.filter(m => m.category === hideTarget.name);
      await Promise.all(affected.map(item =>
        updateDoc(doc(db, 'menuItems', item.id), { isAvailable: false })
      ));
      await updateDoc(doc(db, 'categories', hideTarget.id), { isActive: false, hiddenAt: new Date() });
      await logAudit('HIDE_CATEGORY', hideTarget.id, hideTarget.name, { affectedItems: affected.length });
      setShowHideConf(false); setHideTarget(null); await loadData();
    } finally { setHideSaving(false); }
  };

  // ── Retrieve handler ──
  const handleConfirmRetrieve = async () => {
    if (!retrieveTarget || retrieveSaving) return;
    setRetrieveSaving(true);
    try {
      await updateDoc(doc(db, 'categories', retrieveTarget.id), { isActive: true, hiddenAt: null });
      await logAudit('RETRIEVE_CATEGORY', retrieveTarget.id, retrieveTarget.name, {});
      setShowRetrieveConf(false); setRetrieveTarget(null); await loadData();
    } finally { setRetrieveSaving(false); }
  };

  // ── Subcategory handlers ──
  const handleOpenSubForm = (parent) => {
    setSubParent(parent); setSubName(''); setSubVariants([{ name: '' }]); setSubNameError(''); setShowSubForm(true);
  };
  const handleCloseSubForm = () => {
    setShowSubForm(false); setSubParent(null); setSubName(''); setSubVariants([{ name: '' }]); setSubNameError('');
  };
  const handleSubSubmit = () => {
    const trimmed = subName.trim();
    if (!trimmed) { setSubNameError('Subcategory name is required.'); return; }
    if (isDuplicate(trimmed)) { setSubNameError('A category with this name already exists.'); return; }
    setSubNameError(''); setShowSubConfirm(true);
  };
  const handleSubConfirm = async () => {
    setSubSaving(true);
    try {
      const subVarsToSave = subVariants.filter(v => v.name.trim()).map(v => ({ name: v.name.trim() }));
      const subRef = await addDoc(collection(db, 'categories'), {
        name: subName.trim(), isParent: false, parentId: subParent.id, variants: subVarsToSave,
      });
      await logAudit('ADD_SUBCATEGORY', subRef.id, subName.trim(), {
        parentCategory: subParent.name, parentId: subParent.id, variants: subVarsToSave,
      });
      await loadData();
      setShowSubConfirm(false); setShowSubForm(false);
      setSubParent(null); setSubName(''); setSubVariants([{ name: '' }]);
    } catch (e) { console.error(e); }
    setSubSaving(false);
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8 gap-5">

        {/* Header */}
        <div className="shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Menu Categories</h1>
          <div className="flex items-center justify-between">

            {/* Left — toggle */}
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

            {/* Right — controls */}
            <div className="flex items-center gap-3">

              {/* Filter */}
              <div className="relative shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setShowFilterPanel(v => !v); setShowArrange(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl transition-colors ${
                    isFiltered || showFilterPanel
                      ? 'bg-[#3ca4c7] text-white hover:bg-[#2b8aa8]'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <Filter size={16} /> Filter List
                </button>
                {showFilterPanel && (
                  <div
                    className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-52 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="text-xl font-semibold text-gray-700">Filter</span>
                      {isFiltered && (
                        <button
                          onClick={() => { setFilterType(''); setShowFilterPanel(false); }}
                          className="text-xl text-red-400 hover:text-red-600 transition-colors"
                        >Clear</button>
                      )}
                    </div>
                    <div className="px-4 pt-3 pb-3">
                      <p className="text-lg font-medium text-gray-500 mb-1.5">Category Type</p>
                      {[
                        { value: 'top-level',   label: 'Top Level' },
                        { value: 'subcategory', label: 'Subcategory' },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => { setFilterType(filterType === value ? '' : value); setShowFilterPanel(false); }}
                          className={`w-full text-left px-3 py-2 text-xl rounded-lg transition-colors ${
                            filterType === value
                              ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Arrange */}
              <div className="relative shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setShowArrange(v => !v); setShowFilterPanel(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl transition-colors ${
                    showArrange ? 'bg-[#3ca4c7] text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <AlignJustify size={16} /> Arrange
                </button>
                {showArrange && (
                  <div
                    className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-60 py-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="px-4 pt-1 pb-2 text-lg font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">Sort by</p>
                    {[
                      { field: 'name',      labelAsc: 'Name (A → Z)',            labelDesc: 'Name (Z → A)' },
                      { field: 'itemCount', labelAsc: 'Menu Items (Low → High)', labelDesc: 'Menu Items (High → Low)' },
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
                          >{label}</button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!showInactive && (
                <button
                  onClick={handleOpenForm}
                  className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"
                >
                  <Plus size={16} /> New Category
                </button>
              )}
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Filter chip */}
          {isFiltered && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                {filterType === 'top-level' ? 'Top Level' : 'Subcategory'}
                <button onClick={() => setFilterType('')} className="hover:text-[#2b8aa8] transition-colors ml-1">
                  <X size={13} />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-gray-300 pb-1 shrink-0">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text" placeholder="Search categories..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>

        {/* List */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[9%] text-xl font-semibold text-gray-800 text-center">#</span>
            <span className="w-[40%] text-xl font-semibold text-gray-800 text-center">Category Name</span>
            <span className="w-[24%] text-xl font-semibold text-gray-800 text-center">Variants / Sizes</span>
            <span className="w-[11%] text-xl font-semibold text-gray-800 text-center">
              {showInactive ? 'Date Hidden' : 'Menu Items'}
            </span>
            <span className="w-[22%] text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {loading ? (
              <p className="py-12 text-gray-400 text-xl text-center">Loading…</p>
            ) : sortedCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Tag size={36} className="text-gray-300" />
                <p className="text-xl text-gray-400">
                  {showInactive ? 'No inactive categories.' : 'No categories yet. Create one to get started.'}
                </p>
              </div>
            ) : (
              sortedCategories.map((cat, idx) => {
                const variantNames = (cat.variants || []).map(v => v.name).filter(Boolean);
                return (
                  <div
                    key={cat.id}
                    className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5"
                  >
                    <span className="w-[7%] text-xl text-gray-500 text-center">{idx + 1}</span>

                    <span className="flex-1 text-xl text-gray-700 font-medium flex items-center justify-center gap-2">
                      {cat.name}
                      {cat.parentName && (
                        <span className="text-xl text-gray-400 font-normal">({cat.parentName})</span>
                      )}
                    </span>

                    <span className="w-[22%] text-center">
                      {variantNames.length > 0 ? (
                        <span className="flex flex-wrap gap-1 justify-center">
                          {variantNames.map(n => (
                            <span key={n} className="bg-gray-100 text-gray-600 text-lg px-2 py-0.5 rounded-full">{n}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xl text-gray-400">—</span>
                      )}
                    </span>

                    {showInactive ? (
                      <span className="w-[11%] text-xl text-gray-700 text-center">{fmtDate(cat.hiddenAt)}</span>
                    ) : (
                      <span className="w-[11%] text-xl text-gray-700 text-center">{countFor(cat.name)}</span>
                    )}

                    <div className="w-[20%] flex items-center justify-center gap-2">
                      {showInactive ? (
                        <button
                          onClick={() => { setRetrieveTarget(cat); setShowRetrieveConf(true); }}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                        >Retrieve</button>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(cat)}
                            className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                          >Edit</button>
                          <button
                            onClick={() => { setHideTarget(cat); setShowHideConf(true); }}
                            className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                          >Hide</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          NEW CATEGORY FORM
      ══════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[640px] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 shrink-0">
              <h3 className="text-2xl font-semibold text-gray-800">New Category</h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col gap-5">

              <div className="flex flex-col gap-2">
                <label className="text-xl font-medium text-gray-700">Category Name</label>
                <input
                  type="text" value={catName}
                  onChange={e => { setCatName(e.target.value); setNameError(''); }}
                  placeholder="e.g. Milk Tea"
                  className={`border rounded-lg px-4 py-3 text-xl text-gray-700 outline-none transition-colors ${
                    nameError ? 'border-red-400' : 'border-gray-300 focus:border-[#3ca4c7]'
                  }`}
                />
                {nameError && <p className="text-lg text-red-500">{nameError}</p>}
              </div>

              {!isParent && (
                <div className="flex flex-col gap-3">
                  <label className="text-xl font-medium text-gray-700">Variants / Sizes</label>
                  <p className="text-xl text-gray-400 -mt-2">These become the size options for menu items in this category.</p>
                  <div className="border border-gray-200 rounded-xl px-4 pt-4 pb-3 flex flex-col gap-3">
                    {catVariants.map((v, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl text-gray-400 w-6 text-center shrink-0">{i + 1}</span>
                        <input
                          type="text" value={v.name}
                          onChange={e => setCatVariants(p => p.map((cv, idx) => idx === i ? { name: e.target.value } : cv))}
                          placeholder="e.g. Small, Regular, Large"
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                        />
                        <button
                          onClick={() => setCatVariants(p => p.length <= 1 ? p : p.filter((_, idx) => idx !== i))}
                          disabled={catVariants.length <= 1}
                          className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0"
                        ><X size={18} /></button>
                      </div>
                    ))}
                    <button
                      onClick={() => setCatVariants(p => [...p, { name: '' }])}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-full text-xl transition-colors mt-1"
                    >+ Add another variant</button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-xl">
                <div>
                  <p className="text-xl font-medium text-gray-700">This category will have subcategories</p>
                  <p className="text-xl text-gray-400 mt-0.5">Add subcategories below after checking</p>
                </div>
                <button
                  onClick={() => { setIsParent(v => !v); setSubNames([{ name: '', variants: [{ name: '' }] }]); }}
                  className={`w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isParent ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300'
                  }`}
                >{isParent && <span className="font-bold text-xl">✓</span>}</button>
              </div>

              {isParent && (
                <div className="flex flex-col gap-3">
                  <p className="text-xl font-medium text-gray-700">Subcategories</p>
                  <div className="flex flex-col gap-3">
                    {subNames.map((sub, si) => (
                      <div key={si} className="border border-gray-200 rounded-xl px-4 pt-4 pb-3 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl text-gray-400 w-6 text-center shrink-0">{si + 1}</span>
                          <input
                            type="text" value={sub.name}
                            onChange={e => setSubNames(p => p.map((s, idx) => idx === si ? { ...s, name: e.target.value } : s))}
                            placeholder="Subcategory name"
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                          />
                          <button
                            onClick={() => setSubNames(p => p.filter((_, idx) => idx !== si))}
                            disabled={subNames.length === 1}
                            className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0"
                          ><X size={18} /></button>
                        </div>
                        <div className="ml-8 flex flex-col gap-2">
                          <p className="text-lg font-medium text-gray-500">Variants / Sizes</p>
                          {sub.variants.map((v, vi) => (
                            <div key={vi} className="flex items-center gap-2">
                              <span className="text-lg text-gray-400 w-5 text-center shrink-0">{vi + 1}</span>
                              <input
                                type="text" value={v.name}
                                onChange={e => updateSubVariant(si, vi, e.target.value)}
                                placeholder="e.g. Small"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                              />
                              <button
                                onClick={() => removeSubVariant(si, vi)}
                                disabled={sub.variants.length <= 1}
                                className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0"
                              ><X size={16} /></button>
                            </div>
                          ))}
                          <button
                            onClick={() => addSubVariant(si)}
                            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-2 rounded-full text-lg transition-colors mt-0.5"
                          >+ Add variant</button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setSubNames(p => [...p, { name: '', variants: [{ name: '' }] }])}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-full text-xl transition-colors"
                    >+ Add another subcategory</button>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3 rounded-xl text-xl font-semibold transition-colors"
              >Save Category</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CONFIRM NEW CATEGORY
      ══════════════════════════════════════════ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Category?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700 flex items-baseline gap-1 min-w-0">Name: <span className="font-semibold truncate block max-w-[320px]">{catName.trim()}</span></p>
              {catVariants.filter(v => v.name.trim()).length > 0 && (
                <p className="text-xl text-gray-700 flex items-baseline gap-1 min-w-0">
                  Variants: <span className="font-semibold truncate block max-w-[300px]">{catVariants.filter(v => v.name.trim()).map(v => v.name.trim()).join(', ')}</span>
                </p>
              )}
              {isParent && subNames.filter(s => s.name.trim()).length > 0 && (
                <>
                  <p className="text-xl text-gray-500 mt-1">Subcategories:</p>
                  {subNames.filter(s => s.name.trim()).map((s, i) => (
                    <div key={i} className="pl-4">
                      <p className="text-xl text-gray-700">↳ {s.name.trim()}</p>
                      {s.variants.filter(v => v.name.trim()).length > 0 && (
                        <p className="text-xl text-gray-500 pl-4">{s.variants.filter(v => v.name.trim()).map(v => v.name.trim()).join(', ')}</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowConfirm(false)} disabled={saving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirm} disabled={saving}
                className={`px-6 py-2 rounded-full text-xl transition-colors ${saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EDIT CATEGORY FORM
      ══════════════════════════════════════════ */}
      {showEditForm && editingCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 shrink-0">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">Edit Category</h3>
                {editingCat.parentId && (
                  <p className="text-xl text-gray-400 mt-0.5">
                    Subcategory of: <span className="font-medium text-gray-600">
                      {categories.find(c => c.id === editingCat.parentId)?.name || '—'}
                    </span>
                  </p>
                )}
              </div>
              <button onClick={closeEditForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col gap-5">

              <div className="flex flex-col gap-2">
                <label className="text-xl font-medium text-gray-700">Category Name</label>
                <input
                  type="text" value={editName}
                  onChange={e => { setEditName(e.target.value); setEditNameError(''); }}
                  className={`border rounded-lg px-4 py-3 text-xl text-gray-700 outline-none transition-colors ${
                    editNameError ? 'border-red-400' : 'border-gray-300 focus:border-[#3ca4c7]'
                  }`}
                />
                {editNameError && <p className="text-lg text-red-500">{editNameError}</p>}
                {editName.trim() !== editingCat.name && editName.trim() && (
                  <p className="text-lg text-orange-500">
                    Renaming will update all menu items currently in "{editingCat.name}".
                  </p>
                )}
              </div>

              {!editingCat?.isParent && (
                <div className="flex flex-col gap-3">
                  <label className="text-xl font-medium text-gray-700">Variants / Sizes</label>
                  <div className="border border-gray-200 rounded-xl px-4 pt-4 pb-3 flex flex-col gap-3">
                    {editVariants.map((v, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl text-gray-400 w-6 text-center shrink-0">{i + 1}</span>
                        <input
                          type="text" value={v.name}
                          onChange={e => setEditVariants(p => p.map((ev, idx) => idx === i ? { name: e.target.value } : ev))}
                          placeholder="e.g. Small"
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                        />
                        <button
                          onClick={() => setEditVariants(p => p.length <= 1 ? p : p.filter((_, idx) => idx !== i))}
                          disabled={editVariants.length <= 1}
                          className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0"
                        ><X size={18} /></button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditVariants(p => [...p, { name: '' }])}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-full text-xl transition-colors mt-1"
                    >+ Add another variant</button>
                  </div>
                </div>
              )}

              <button
                onClick={handleEditSubmit}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3 rounded-xl text-xl font-semibold transition-colors"
              >Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Edit ── */}
      {showEditConfirm && editingCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save Changes?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {editName.trim() !== editingCat.name ? (
                <p className="text-xl text-gray-700 flex items-baseline gap-1 min-w-0">
                  Name: <span className="line-through text-gray-400 truncate block max-w-[160px]">{editingCat.name}</span>
                  {' → '}
                  <span className="font-semibold truncate block max-w-[160px]">{editName.trim()}</span>
                </p>
              ) : (
                <p className="text-xl text-gray-700 flex items-baseline gap-1 min-w-0">Name: <span className="font-semibold truncate block max-w-[320px]">{editName.trim()}</span></p>
              )}
              {editVariants.filter(v => v.name.trim()).length > 0 && (
                <p className="text-xl text-gray-700 flex items-baseline gap-1 min-w-0">
                  Variants: <span className="font-semibold truncate block max-w-[300px]">{editVariants.filter(v => v.name.trim()).map(v => v.name.trim()).join(', ')}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowEditConfirm(false)} disabled={editSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirmEdit} disabled={editSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xl transition-colors ${editSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>
                {editSaving ? <><Loader size={18} className="animate-spin" /> Saving…</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          HIDE CONFIRM
      ══════════════════════════════════════════ */}
      {showHideConf && hideTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Hide Category?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{hideTarget.name}</span> will be moved to the inactive list. You can retrieve it later.
            </p>
            {menuItems.filter(m => m.category === hideTarget.name).length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xl text-orange-600 font-medium">
                  The following menu items will be marked as unavailable:
                </p>
                <div className="border border-orange-200 bg-orange-50 rounded-xl px-4 py-3 flex flex-col gap-1 max-h-44 overflow-y-auto">
                  {menuItems.filter(m => m.category === hideTarget.name).map(item => (
                    <p key={item.id} className="text-xl text-gray-700">• {item.name}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowHideConf(false); setHideTarget(null); }} disabled={hideSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirmHide} disabled={hideSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xl transition-colors ${hideSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-400 hover:bg-red-500 text-white'}`}>
                {hideSaving ? <><Loader size={18} className="animate-spin" /> Hiding…</> : 'Hide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          RETRIEVE CONFIRM
      ══════════════════════════════════════════ */}
      {showRetrieveConf && retrieveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Retrieve Category?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{retrieveTarget.name}</span> will be restored to the active list.
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setShowRetrieveConf(false); setRetrieveTarget(null); }} disabled={retrieveSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirmRetrieve} disabled={retrieveSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xl transition-colors ${retrieveSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>
                {retrieveSaving ? <><Loader size={18} className="animate-spin" /> Retrieving…</> : 'Retrieve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          NEW SUBCATEGORY FORM ("+Sub" button)
      ══════════════════════════════════════════ */}
      {showSubForm && subParent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 shrink-0">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">New Subcategory</h3>
                <p className="text-xl text-gray-400 mt-0.5">Under: <span className="font-medium text-gray-600">{subParent.name}</span></p>
              </div>
              <button onClick={handleCloseSubForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xl font-medium text-gray-700">Subcategory Name</label>
                <input
                  type="text" value={subName}
                  onChange={e => { setSubName(e.target.value); setSubNameError(''); }}
                  placeholder="e.g. Fruit Tea"
                  className={`border rounded-lg px-4 py-3 text-xl text-gray-700 outline-none transition-colors ${
                    subNameError ? 'border-red-400' : 'border-gray-300 focus:border-[#3ca4c7]'
                  }`}
                />
                {subNameError && <p className="text-lg text-red-500">{subNameError}</p>}
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xl font-medium text-gray-700">Variants / Sizes</label>
                <p className="text-xl text-gray-400 -mt-2">Size options for menu items in this subcategory.</p>
                <div className="border border-gray-200 rounded-xl px-4 pt-4 pb-3 flex flex-col gap-3">
                  {subVariants.map((v, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl text-gray-400 w-6 text-center shrink-0">{i + 1}</span>
                      <input
                        type="text" value={v.name}
                        onChange={e => setSubVariants(p => p.map((sv, idx) => idx === i ? { name: e.target.value } : sv))}
                        placeholder="e.g. Small, Regular, Large"
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                      />
                      <button
                        onClick={() => setSubVariants(p => p.length <= 1 ? p : p.filter((_, idx) => idx !== i))}
                        disabled={subVariants.length <= 1}
                        className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0"
                      ><X size={18} /></button>
                    </div>
                  ))}
                  <button
                    onClick={() => setSubVariants(p => [...p, { name: '' }])}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-full text-xl transition-colors mt-1"
                  >+ Add another variant</button>
                </div>
              </div>

              <button
                onClick={handleSubSubmit}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3 rounded-xl text-xl font-semibold transition-colors"
              >Save Subcategory</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discard new category form ── */}
      {showNewFormDiscard && (
        <DiscardDialog
          onCancel={() => setShowNewFormDiscard(false)}
          onConfirm={() => { setShowNewFormDiscard(false); setShowForm(false); resetNewForm(); }}
        />
      )}

      {/* ── Discard edit category form ── */}
      {showEditFormDiscard && (
        <DiscardDialog
          onCancel={() => setShowEditFormDiscard(false)}
          onConfirm={() => { setShowEditFormDiscard(false); resetEditForm(); }}
        />
      )}

      {/* ── Confirm New Subcategory ── */}
      {showSubConfirm && subParent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Subcategory?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">Name: <span className="font-semibold">{subName.trim()}</span></p>
              <p className="text-xl text-gray-700">Under: <span className="font-semibold">{subParent.name}</span></p>
              {subVariants.filter(v => v.name.trim()).length > 0 && (
                <p className="text-xl text-gray-700 flex items-baseline gap-1 min-w-0">
                  Variants: <span className="font-semibold truncate block max-w-[300px]">{subVariants.filter(v => v.name.trim()).map(v => v.name.trim()).join(', ')}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowSubConfirm(false)} disabled={subSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleSubConfirm} disabled={subSaving}
                className={`px-6 py-2 rounded-full text-xl transition-colors ${subSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>
                {subSaving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}