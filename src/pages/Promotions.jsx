import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Search, Plus, X, RefreshCw, MoreVertical } from 'lucide-react';
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
  const [searchQuery,  setSearchQuery]  = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // ── Form ──
  const [showForm,        setShowForm]        = useState(false);
  const [editingPromo,    setEditingPromo]    = useState(null);
  const [promoName,       setPromoName]       = useState('');
  const [selectedItemId,  setSelectedItemId]  = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [triggerQty,      setTriggerQty]      = useState('2');
  const [bundlePrice,     setBundlePrice]     = useState('');
  const [showDiscard,     setShowDiscard]     = useState(false);
  const [showConf,        setShowConf]        = useState(false);
  const [showOk,          setShowOk]          = useState(false);

  // ── Archive ──
  const [archiveTarget,   setArchiveTarget]   = useState(null);
  const [showArchiveConf, setShowArchiveConf] = useState(false);

  // ── Retrieve ──
  const [retrieveTarget,   setRetrieveTarget]   = useState(null);
  const [showRetrieveConf, setShowRetrieveConf] = useState(false);
  const [showRetrieveOk,   setShowRetrieveOk]   = useState(false);

  // ── Delete (from archived list) ──
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [showDeleteConf, setShowDeleteConf] = useState(false);

  const loadData = async () => {
    try {
      const [ps, ms] = await Promise.all([
        getDocs(collection(db, 'promotions')),
        getDocs(collection(db, 'menuItems')),
      ]);
      setPromos(ps.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.promoId));
      setMenuItems(ms.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.menuItemId && d.isActive !== false));
    } catch (e) { console.error('Promotions load error:', e); }
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const close = () => setOpenDropdownId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Derived ──
  const selectedItem = menuItems.find(m => m.id === selectedItemId);
  const variants = selectedItem
    ? (selectedItem.variants || selectedItem.sizes || []).filter(v => v.name?.trim())
    : [];

  const displayed = promos
    .filter(p => showInactive ? p.isActive === false : p.isActive !== false)
    .filter(p =>
      !searchQuery ||
      (p.promoId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.menuItemName || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (a.promoId || '').localeCompare(b.promoId || ''));

  // ── Form helpers ──
  const formHasData = () => promoName.trim() !== '' || selectedItemId !== '' || bundlePrice !== '';
  const resetForm = () => {
    setPromoName(''); setSelectedItemId(''); setSelectedVariant('');
    setTriggerQty('2'); setBundlePrice(''); setEditingPromo(null);
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
    setSelectedItemId(promo.menuItemDocId || '');
    setSelectedVariant(promo.variantName || '');
    setTriggerQty(String(promo.triggerQty || 2));
    setBundlePrice(String(promo.bundlePrice || ''));
    setShowForm(true);
  };

  const handleSave = () => {
    if (!selectedItemId || !selectedVariant || !bundlePrice) return;
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
    const isEdit = !!editingPromo;
    const item = menuItems.find(m => m.id === selectedItemId);
    const data = {
      name:          promoName.trim() || `${parseInt(triggerQty) || 2}× ${item?.name} (${selectedVariant})`,
      menuItemDocId: selectedItemId,
      menuItemName:  item?.name || '',
      variantName:   selectedVariant,
      triggerQty:    parseInt(triggerQty) || 2,
      bundlePrice:   parseFloat(bundlePrice) || 0,
      isActive:      isEdit ? editingPromo.isActive : true,
    };

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

  // ── Delete ──
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, 'promotions', deleteTarget.id));
    await logAudit('DELETE_PROMO', deleteTarget.promoId, deleteTarget.name, {});
    setDeleteTarget(null);
    setShowDeleteConf(false);
    await loadData();
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />
      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8 gap-5">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-3xl font-bold text-gray-800">Promotions</h1>
          <div className="flex items-center gap-3">
            {/* Active / Archived toggle */}
            <button
              onClick={() => setShowInactive(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${showInactive ? 'bg-red-400' : 'bg-green-400'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${showInactive ? 'left-6' : 'left-1'}`} />
            </button>
            <span className="text-xl text-gray-600 shrink-0">
              {showInactive ? 'Showing Archived List' : 'Showing Active List'}
            </span>

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
            <span className="w-[11%] text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[24%] text-xl font-semibold text-gray-800 text-center">Promo Name</span>
            <span className="w-[19%] text-xl font-semibold text-gray-800 text-center">Menu Item</span>
            <span className="w-[14%] text-xl font-semibold text-gray-800 text-center">Variant</span>
            <span className="w-[9%]  text-xl font-semibold text-gray-800 text-center">Buy Qty</span>
            <span className="w-[13%] text-xl font-semibold text-gray-800 text-center">
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
            {displayed.map(promo => (
              <div key={promo.id} className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5">
                <span className="w-[11%] text-xl text-gray-700 text-center">{promo.promoId}</span>
                <span className="w-[24%] text-xl text-gray-700 text-center">{promo.name}</span>
                <span className="w-[19%] text-xl text-gray-700 text-center">{promo.menuItemName}</span>
                <span className="w-[14%] text-xl text-gray-700 text-center">{promo.variantName}</span>
                <span className="w-[9%]  text-xl text-gray-700 text-center">{promo.triggerQty}</span>

                {showInactive ? (
                  <>
                    <span className="w-[13%] text-xl text-gray-700 text-center">{fmtDate(promo.hiddenAt)}</span>
                    <div className="flex-1 flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setRetrieveTarget(promo); setShowRetrieveConf(true); }}
                        className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                      >Retrieve</button>
                      <button
                        onClick={() => { setDeleteTarget(promo); setShowDeleteConf(true); }}
                        className="px-4 py-1.5 rounded-full border border-red-200 text-red-400 text-xl hover:bg-red-50 transition-colors"
                      >Delete</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="w-[13%] text-xl text-gray-700 text-center">₱{promo.bundlePrice}</span>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === promo.id ? null : promo.id); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openDropdownId === promo.id && (
                          <div
                            className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[140px] py-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { setOpenDropdownId(null); openEdit(promo); }}
                              className="w-full px-4 py-2.5 text-left text-xl text-gray-700 hover:bg-gray-50 rounded-t-xl"
                            >Edit</button>
                            <button
                              onClick={() => { setOpenDropdownId(null); setArchiveTarget(promo); setShowArchiveConf(true); }}
                              className="w-full px-4 py-2.5 text-left text-xl text-red-500 hover:bg-gray-50 rounded-b-xl"
                            >Archive</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
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

              {/* Menu Item + Variant side by side */}
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
              {selectedVariant && bundlePrice && (
                <div className="bg-[#3ca4c7]/10 border border-[#3ca4c7]/30 rounded-xl px-5 py-4">
                  <p className="text-xl text-[#3ca4c7] font-medium">
                    Buy {parseInt(triggerQty) || 2}× {selectedItem?.name} ({selectedVariant}) for ₱{bundlePrice}
                  </p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!selectedItemId || !selectedVariant || !bundlePrice}
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
              <p className="text-xl text-gray-700">Item: <span className="font-semibold">{selectedItem?.name}</span></p>
              <p className="text-xl text-gray-700">Variant: <span className="font-semibold">{selectedVariant}</span></p>
              <p className="text-xl text-gray-700">Buy Qty: <span className="font-semibold">{triggerQty} pcs</span></p>
              <p className="text-xl text-gray-700">Bundle Price: <span className="font-semibold">₱{bundlePrice}</span></p>
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowConf(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmSave} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
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

      {/* ── Delete confirm (from archived list) ── */}
      {showDeleteConf && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Delete Promo?</h3>
            <p className="text-xl text-gray-600">
              This will permanently delete <span className="font-semibold">{deleteTarget.name}</span>. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => { setDeleteTarget(null); setShowDeleteConf(false); }} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmDelete} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
