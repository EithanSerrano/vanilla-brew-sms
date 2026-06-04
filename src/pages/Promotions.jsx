import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Search, Plus, X, RefreshCw, Filter, AlignJustify, Loader } from 'lucide-react';
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
        <h3 className="text-2xl font-semibold text-gray-800">Discard Progress?</h3>
        <p className="text-xl text-gray-500">If confirmed, the progress cannot be recovered.</p>
        <div className="flex gap-3 justify-end mt-1">
          <button onClick={onCancel} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Discard</button>
        </div>
      </div>
    </div>
  );
}

export default function Promotions() {
  const [promos,       setPromos]       = useState([]);
  const [menuItems,    setMenuItems]    = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [showInactive,    setShowInactive]    = useState(false);
  const [showArrange,     setShowArrange]     = useState(false);
  const [sortField,       setSortField]       = useState('promoId');
  const [sortDir,         setSortDir]         = useState('asc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterMenuItem,  setFilterMenuItem]  = useState('');
  const [filterCategory,  setFilterCategory]  = useState('');

  // ── Form ──
  const [showForm,            setShowForm]            = useState(false);
  const [editingPromo,        setEditingPromo]        = useState(null);
  const [promoType,           setPromoType]           = useState('item'); // 'item' | 'category'
  const [promoName,           setPromoName]           = useState('');
  const [selectedItemId,      setSelectedItemId]      = useState('');
  const [selectedVariant,     setSelectedVariant]     = useState('');
  const [selectedCategoryId,       setSelectedCategoryId]       = useState('');
  const [selectedCategoryVariant,  setSelectedCategoryVariant]  = useState('');
  const [triggerQty,          setTriggerQty]          = useState('2');
  const [bundlePrice,         setBundlePrice]         = useState('');
  const [showDiscard,         setShowDiscard]         = useState(false);
  const [showConf,            setShowConf]            = useState(false);
  const [showOk,              setShowOk]              = useState(false);

  // ── Archive ──
  const [archiveTarget,   setArchiveTarget]   = useState(null);
  const [showArchiveConf, setShowArchiveConf] = useState(false);

  // ── Retrieve ──
  const [retrieveTarget,   setRetrieveTarget]   = useState(null);
  const [showRetrieveConf, setShowRetrieveConf] = useState(false);
  const [showRetrieveOk,   setShowRetrieveOk]   = useState(false);

  // ── Save loading guard ──
  const [confSaving, setConfSaving] = useState(false);
  const confSavingRef = useRef(false);

  const loadData = async () => {
    try {
      const [ps, ms, cs] = await Promise.all([
        getDocs(collection(db, 'promotions')),
        getDocs(collection(db, 'menuItems')),
        getDocs(collection(db, 'categories')),
      ]);
      setPromos(ps.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.promoId));
      setMenuItems(ms.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.menuItemId && d.isActive !== false));
      setCategories(cs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('Promotions load error:', e); }
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const close = () => { setShowArrange(false); setShowFilterPanel(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Derived ──
  const selectedItem     = menuItems.find(m => m.id === selectedItemId);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const variants = selectedItem
    ? (selectedItem.variants || selectedItem.sizes || []).filter(v => v.name?.trim())
    : [];

  const menuItemOptions  = [...new Set(promos.map(p => p.menuItemName).filter(Boolean))].sort();
  const categoryOptions  = [...new Set(promos.filter(p => p.promoType === 'category').map(p => p.categoryName).filter(Boolean))].sort();
  const isFiltered       = !!filterMenuItem || !!filterCategory;

  const displayed = promos
    .filter(p => showInactive ? p.isActive === false : p.isActive !== false)
    .filter(p =>
      !searchQuery ||
      (p.promoId      || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.name         || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.menuItemName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.categoryName || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(p => !filterMenuItem || p.menuItemName === filterMenuItem)
    .filter(p => !filterCategory || p.categoryName === filterCategory)
    .sort((a, b) => {
      let av, bv;
      if (sortField === 'name') {
        av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase();
      } else if (sortField === 'menuItemName') {
        av = (a.menuItemName || a.categoryName || '').toLowerCase();
        bv = (b.menuItemName || b.categoryName || '').toLowerCase();
      } else if (sortField === 'bundlePrice') {
        av = a.bundlePrice ?? 0; bv = b.bundlePrice ?? 0;
      } else {
        av = a.promoId || ''; bv = b.promoId || '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  // ── Form helpers ──
  const formHasData = () =>
    promoName.trim() !== '' || bundlePrice !== '' ||
    (promoType === 'item' ? selectedItemId !== '' : selectedCategoryId !== '');

  const resetForm = () => {
    setPromoName(''); setSelectedItemId(''); setSelectedVariant('');
    setSelectedCategoryId(''); setSelectedCategoryVariant(''); setTriggerQty('2'); setBundlePrice('');
    setEditingPromo(null); setPromoType('item');
  };
  const closeForm = () => formHasData() ? setShowDiscard(true) : (setShowForm(false), resetForm());

  const handleItemChange = id => {
    setSelectedItemId(id);
    const item = menuItems.find(m => m.id === id);
    const v = item ? (item.variants || item.sizes || []).filter(v => v.name?.trim()) : [];
    setSelectedVariant(v[0]?.name || '');
  };

  const openNew  = () => { resetForm(); setShowForm(true); };
  const openEdit = promo => {
    setEditingPromo(promo);
    setPromoName(promo.name || '');
    setPromoType(promo.promoType || 'item');
    setSelectedItemId(promo.menuItemDocId || '');
    setSelectedVariant(promo.variantName || '');
    setSelectedCategoryId(promo.categoryDocId || '');
    setSelectedCategoryVariant(promo.promoType === 'category' ? (promo.variantName || '') : '');
    setTriggerQty(String(promo.triggerQty || 2));
    setBundlePrice(String(promo.bundlePrice || ''));
    setShowForm(true);
  };

  const handleSave = () => {
    if (promoType === 'item') {
      if (!selectedItemId || !selectedVariant || !bundlePrice) return;
    } else {
      if (!selectedCategoryId || !selectedCategoryVariant || !bundlePrice) return;
    }
    setShowConf(true);
  };

  // ── Audit log ──
  const logAudit = async (action, itemId, itemName, details = {}) => {
    try {
      let performedBy = 'Unknown';
      const user = auth.currentUser;
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) performedBy = snap.data().name || 'Unknown';
      }
      await addDoc(collection(db, 'auditlog'), {
        action, itemType: 'promo', itemId, itemName, details, performedBy, timestamp: new Date(),
      });
    } catch (e) { console.error('Audit log error:', e); }
  };

  // ── Save / Edit ──
  const handleConfirmSave = async () => {
    if (confSavingRef.current) return;
    confSavingRef.current = true;
    setConfSaving(true);
    const isEdit = !!editingPromo;
    let data;

    if (promoType === 'item') {
      const item = menuItems.find(m => m.id === selectedItemId);
      data = {
        promoType:     'item',
        name:          promoName.trim() || `${parseInt(triggerQty) || 2}× ${item?.name} (${selectedVariant})`,
        menuItemDocId: selectedItemId,
        menuItemName:  item?.name || '',
        variantName:   selectedVariant,
        categoryDocId: '',
        categoryName:  '',
        triggerQty:    parseInt(triggerQty) || 2,
        bundlePrice:   parseFloat(bundlePrice) || 0,
        isActive:      isEdit ? editingPromo.isActive : true,
      };
    } else {
      const cat = categories.find(c => c.id === selectedCategoryId);
      data = {
        promoType:     'category',
        name:          promoName.trim() || `${parseInt(triggerQty) || 2}× any ${cat?.name} (${selectedCategoryVariant}) for ₱${bundlePrice}`,
        menuItemDocId: '',
        menuItemName:  '',
        variantName:   selectedCategoryVariant,
        categoryDocId: selectedCategoryId,
        categoryName:  cat?.name || '',
        triggerQty:    parseInt(triggerQty) || 2,
        bundlePrice:   parseFloat(bundlePrice) || 0,
        isActive:      isEdit ? editingPromo.isActive : true,
      };
    }

    if (isEdit) {
      await updateDoc(doc(db, 'promotions', editingPromo.id), data);
      await logAudit('EDIT_PROMO', editingPromo.promoId, data.name, data);
    } else {
      const snap = await getDocs(collection(db, 'promotions'));
      const nums = snap.docs
        .map(d => d.data().promoId || '')
        .filter(id => /^PROMO\d+$/.test(id))
        .map(id => parseInt(id.slice(5)));
      const base = nums.length ? Math.max(...nums) : 0;
      const promoId = `PROMO${String(base + 1).padStart(3, '0')}`;
      await addDoc(collection(db, 'promotions'), { ...data, promoId, createdAt: new Date() });
      await logAudit('ADD_PROMO', promoId, data.name, data);
    }
    await loadData();
    setShowConf(false);
    setShowOk(true);
    confSavingRef.current = false;
    setConfSaving(false);
  };

  // ── Archive ──
  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    await updateDoc(doc(db, 'promotions', archiveTarget.id), { isActive: false, hiddenAt: new Date() });
    await logAudit('ARCHIVE_PROMO', archiveTarget.promoId, archiveTarget.name, {});
    setArchiveTarget(null);
    setShowArchiveConf(false);
    await loadData();
  };

  // ── Retrieve ──
  const handleConfirmRetrieve = async () => {
    if (!retrieveTarget) return;
    await updateDoc(doc(db, 'promotions', retrieveTarget.id), { isActive: true, hiddenAt: null });
    await logAudit('RETRIEVE_PROMO', retrieveTarget.promoId, retrieveTarget.name, {});
    setShowRetrieveConf(false);
    setShowRetrieveOk(true);
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />
      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8 gap-5">

        {/* Header */}
        <div className="shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Promotions</h1>
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
                {showInactive ? 'Showing Archived List' : 'Showing Active List'}
              </span>
            </div>

            {/* Right — Filter, Arrange, New Promo, Refresh */}
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
                    className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-60 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="text-xl font-semibold text-gray-700">Filter</span>
                      {isFiltered && (
                        <button
                          onClick={() => { setFilterMenuItem(''); setFilterCategory(''); setShowFilterPanel(false); }}
                          className="text-xl text-red-400 hover:text-red-600 transition-colors"
                        >Clear all</button>
                      )}
                    </div>

                    {/* Filter by Menu Item */}
                    <div className="px-4 pt-3 pb-3">
                      <p className="text-lg font-medium text-gray-500 mb-1.5">Menu Item</p>
                      <div className="flex flex-col max-h-36 overflow-y-auto">
                        {menuItemOptions.map(name => (
                          <button
                            key={name}
                            onClick={() => { setFilterMenuItem(filterMenuItem === name ? '' : name); setShowFilterPanel(false); }}
                            className={`w-full text-left px-3 py-2 text-xl rounded-lg transition-colors ${
                              filterMenuItem === name
                                ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >{name}</button>
                        ))}
                        {menuItemOptions.length === 0 && (
                          <p className="text-xl text-gray-400 px-3 py-2">No items yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Filter by Category */}
                    {categoryOptions.length > 0 && (
                      <div className="px-4 pt-2 pb-3 border-t border-gray-100">
                        <p className="text-lg font-medium text-gray-500 mb-1.5">Category</p>
                        <div className="flex flex-col max-h-36 overflow-y-auto">
                          {categoryOptions.map(name => (
                            <button
                              key={name}
                              onClick={() => { setFilterCategory(filterCategory === name ? '' : name); setShowFilterPanel(false); }}
                              className={`w-full text-left px-3 py-2 text-xl rounded-lg transition-colors ${
                                filterCategory === name
                                  ? 'bg-[#3ca4c7]/10 text-[#3ca4c7] font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >{name}</button>
                          ))}
                        </div>
                      </div>
                    )}
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
                      { field: 'promoId',      labelAsc: 'ID (A → Z)',              labelDesc: 'ID (Z → A)' },
                      { field: 'name',         labelAsc: 'Name (A → Z)',             labelDesc: 'Name (Z → A)' },
                      { field: 'menuItemName', labelAsc: 'Item / Category (A → Z)',  labelDesc: 'Item / Category (Z → A)' },
                      { field: 'bundlePrice',  labelAsc: 'Bundle Price (Low → High)',labelDesc: 'Bundle Price (High → Low)' },
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
                  onClick={openNew}
                  className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"
                >
                  <Plus size={16} /> New Promo
                </button>
              )}
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {isFiltered && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filterMenuItem && (
                <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                  {filterMenuItem}
                  <button onClick={() => setFilterMenuItem('')} className="hover:text-[#2b8aa8] transition-colors ml-1"><X size={13} /></button>
                </span>
              )}
              {filterCategory && (
                <span className="flex items-center gap-1.5 bg-[#3ca4c7]/10 text-[#3ca4c7] text-xl font-medium px-3 py-1 rounded-full">
                  {filterCategory} <span className="text-base opacity-70">(cat.)</span>
                  <button onClick={() => setFilterCategory('')} className="hover:text-[#2b8aa8] transition-colors ml-1"><X size={13} /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-gray-300 pb-1 shrink-0">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text" placeholder="Search promos..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[10%] text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[22%] text-xl font-semibold text-gray-800 text-center">Promo Name</span>
            <span className="w-[11%] text-xl font-semibold text-gray-800 text-center">Type</span>
            <span className="w-[20%] text-xl font-semibold text-gray-800 text-center">Item / Category</span>
            <span className="w-[9%]  text-xl font-semibold text-gray-800 text-center">Buy Qty</span>
            <span className="w-[12%] text-xl font-semibold text-gray-800 text-center">
              {showInactive ? 'Date Archived' : 'Bundle Price'}
            </span>
            <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {displayed.length === 0 && (
              <p className="py-12 text-gray-400 text-xl text-center">
                {showInactive ? 'No archived promotions.' : 'No promotions found.'}
              </p>
            )}
            {displayed.map(promo => {
              const isCatPromo = promo.promoType === 'category';
              return (
                <div key={promo.id} className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5">
                  <span className="w-[10%] text-xl text-gray-700 text-center">{promo.promoId}</span>
                  <span className="w-[22%] text-xl text-gray-700 text-center">{promo.name}</span>
                  <span className="w-[11%] text-center">
                    <span className={`text-lg font-medium px-2.5 py-1 rounded-full ${
                      isCatPromo
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isCatPromo ? 'Category' : 'Item'}
                    </span>
                  </span>
                  <span className="w-[20%] text-xl text-gray-700 text-center">
                    {isCatPromo ? promo.categoryName : promo.menuItemName}
                  </span>
                  <span className="w-[9%] text-xl text-gray-700 text-center">{promo.triggerQty}</span>

                  {showInactive ? (
                    <>
                      <span className="w-[12%] text-xl text-gray-700 text-center">{fmtDate(promo.hiddenAt)}</span>
                      <div className="flex-1 flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setRetrieveTarget(promo); setShowRetrieveConf(true); }}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                        >Retrieve</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="w-[12%] text-xl text-gray-700 text-center">₱{promo.bundlePrice}</span>
                      <div className="flex-1 flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(promo)}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                        >Edit</button>
                        <button
                          onClick={() => { setArchiveTarget(promo); setShowArchiveConf(true); }}
                          className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-3 py-1.5 rounded-full text-xl transition-colors"
                        >Archive</button>
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
          FORM MODAL
      ══════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[900px]">
            <div className="flex items-center justify-between px-12 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">
                {editingPromo ? 'Edit Promo' : 'New Promo'}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="px-12 py-8 flex flex-col gap-6">

              {/* Promo Type toggle */}
              <div className="flex items-center gap-5">
                <label className="text-xl text-gray-600 w-48 shrink-0">Promo Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPromoType('item'); setSelectedCategoryId(''); }}
                    className={`px-5 py-2 rounded-full text-xl font-medium transition-colors ${
                      promoType === 'item'
                        ? 'bg-[#3ca4c7] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >Menu Item</button>
                  <button
                    onClick={() => { setPromoType('category'); setSelectedItemId(''); setSelectedVariant(''); }}
                    className={`px-5 py-2 rounded-full text-xl font-medium transition-colors ${
                      promoType === 'category'
                        ? 'bg-[#3ca4c7] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >Menu Category</button>
                </div>
              </div>

              {/* Promo Name */}
              <div className="flex items-center gap-5">
                <label className="text-xl text-gray-600 w-48 shrink-0">
                  Promo Name <span className="text-gray-400 text-lg">(optional)</span>
                </label>
                <input
                  type="text" value={promoName} onChange={e => setPromoName(e.target.value)}
                  placeholder="e.g. 2-cup deal"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                />
              </div>

              {/* Item promo fields */}
              {promoType === 'item' && (
                <div className="flex gap-6">
                  <div className="flex items-center gap-5 flex-1">
                    <label className="text-xl text-gray-600 w-32 shrink-0">Menu Item</label>
                    <div className="relative flex-1">
                      <select
                        value={selectedItemId} onChange={e => handleItemChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                      >
                        <option value="">— Select item —</option>
                        {menuItems.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 flex-1">
                    <label className="text-xl text-gray-600 w-32 shrink-0">Variant / Size</label>
                    <div className="relative flex-1">
                      <select
                        value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}
                        disabled={variants.length === 0}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7] disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        {variants.length === 0
                          ? <option>— Select item first —</option>
                          : variants.map(v => (
                              <option key={v.name} value={v.name}>{v.name} (₱{v.price})</option>
                            ))
                        }
                      </select>
                      <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Category promo fields */}
              {promoType === 'category' && (
                <div className="flex gap-6">
                <div className="flex items-center gap-5 flex-1">
                  <label className="text-xl text-gray-600 w-32 shrink-0">Category</label>
                  <div className="relative flex-1">
                    <select
                      value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                    >
                      <option value="">— Select category —</option>
                      {(() => {
                        const parents = categories
                          .filter(c => !c.parentId)
                          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                        const ordered = [];
                        for (const parent of parents) {
                          ordered.push(parent);
                          categories
                            .filter(c => c.parentId === parent.id)
                            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                            .forEach(sub => ordered.push(sub));
                        }
                        // orphaned subcategories (parent was deleted)
                        const knownParentIds = new Set(parents.map(p => p.id));
                        categories
                          .filter(c => c.parentId && !knownParentIds.has(c.parentId))
                          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                          .forEach(c => ordered.push(c));
                        return ordered.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.parentId ? `    ↳ ${c.name}` : c.name}
                          </option>
                        ));
                      })()}
                    </select>
                    <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                  </div>
                </div>
                <div className="flex items-center gap-5 flex-1">
                  <label className="text-xl text-gray-600 w-32 shrink-0">Variant / Size</label>
                  <div className="relative flex-1">
                    <select
                      value={selectedCategoryVariant}
                      onChange={e => setSelectedCategoryVariant(e.target.value)}
                      disabled={!(selectedCategory?.variants?.length)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7] disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">— Select variant —</option>
                      {(selectedCategory?.variants || []).map(v => (
                        <option key={v.name} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                    <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none text-xl">▾</span>
                  </div>
                </div>
                </div>
              )}

              {/* Buy Qty + Bundle Price side by side */}
              <div className="flex gap-6">
                <div className="flex items-center gap-5 flex-1">
                  <label className="text-xl text-gray-600 w-32 shrink-0">Buy Quantity</label>
                  <input
                    type="number" min="2" value={triggerQty} onChange={e => setTriggerQty(e.target.value)}
                    className="w-28 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7] text-center"
                  />
                  <span className="text-xl text-gray-500 shrink-0">pcs</span>
                </div>
                <div className="flex items-center gap-5 flex-1">
                  <label className="text-xl text-gray-600 w-32 shrink-0">Bundle Price</label>
                  <span className="text-xl text-gray-500 shrink-0">₱</span>
                  <input
                    type="number" min="0" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                  />
                </div>
              </div>

              {/* Live preview */}
              {promoType === 'item' && selectedVariant && bundlePrice && (
                <div className="bg-[#3ca4c7]/10 border border-[#3ca4c7]/30 rounded-xl px-5 py-4">
                  <p className="text-xl text-[#3ca4c7] font-medium">
                    Buy {parseInt(triggerQty) || 2}× {selectedItem?.name} ({selectedVariant}) for ₱{bundlePrice}
                  </p>
                </div>
              )}
              {promoType === 'category' && selectedCategoryId && selectedCategoryVariant && bundlePrice && (
                <div className="bg-[#3ca4c7]/10 border border-[#3ca4c7]/30 rounded-xl px-5 py-4">
                  <p className="text-xl text-[#3ca4c7] font-medium">
                    Buy {parseInt(triggerQty) || 2}× any {selectedCategory?.name} ({selectedCategoryVariant}) for ₱{bundlePrice}
                  </p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={
                  promoType === 'item'
                    ? !selectedItemId || !selectedVariant || !bundlePrice
                    : !selectedCategoryId || !selectedCategoryVariant || !bundlePrice
                }
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-xl text-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingPromo ? 'Save Changes' : 'Save Promo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm save ── */}
      {showConf && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">
              {editingPromo ? 'Save Changes?' : 'Save New Promo?'}
            </h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              {promoType === 'item' ? (
                <>
                  <p className="text-xl text-gray-700">Item: <span className="font-semibold">{selectedItem?.name}</span></p>
                  <p className="text-xl text-gray-700">Variant: <span className="font-semibold">{selectedVariant}</span></p>
                </>
              ) : (
                <>
                  <p className="text-xl text-gray-700">Category: <span className="font-semibold">{selectedCategory?.name}</span></p>
                  <p className="text-xl text-gray-700">Variant: <span className="font-semibold">{selectedCategoryVariant}</span></p>
                </>
              )}
              <p className="text-xl text-gray-700">Buy Qty: <span className="font-semibold">{triggerQty} pcs</span></p>
              <p className="text-xl text-gray-700">Bundle Price: <span className="font-semibold">₱{bundlePrice}</span></p>
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowConf(false)} disabled={confSaving} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirmSave} disabled={confSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xl transition-colors ${confSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>
                {confSaving ? <><Loader size={17} className="animate-spin" /> Saving…</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save success ── */}
      {showOk && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">
              {editingPromo ? 'Promo Updated!' : 'Promo Saved!'}
            </h3>
            <p className="text-xl text-gray-600">
              The promotion has been {editingPromo ? 'updated' : 'created'} successfully.
            </p>
            <div className="flex justify-end mt-1">
              <button
                onClick={() => { setShowOk(false); setShowForm(false); resetForm(); }}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discard ── */}
      {showDiscard && (
        <DiscardDialog
          onCancel={() => setShowDiscard(false)}
          onConfirm={() => { setShowDiscard(false); setShowForm(false); resetForm(); }}
        />
      )}

      {/* ── Archive confirm ── */}
      {showArchiveConf && archiveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Archive Promo?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{archiveTarget.name}</span> will be moved to the archived list. You can retrieve it later.
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setArchiveTarget(null); setShowArchiveConf(false); }} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmArchive} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Retrieve confirm ── */}
      {showRetrieveConf && retrieveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Retrieve Promo?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{retrieveTarget.name}</span> will be restored to the active list.
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setRetrieveTarget(null); setShowRetrieveConf(false); }} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmRetrieve} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Retrieve</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Retrieve success ── */}
      {showRetrieveOk && retrieveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Promo Retrieved!</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{retrieveTarget.name}</span> has been restored to the active list.
            </p>
            <div className="flex justify-end mt-1">
              <button
                onClick={() => { setShowRetrieveOk(false); setRetrieveTarget(null); loadData(); }}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >Done</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
