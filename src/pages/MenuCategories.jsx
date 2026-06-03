import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Plus, X, Tag, RefreshCw } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

export default function MenuCategories() {
  const [categories, setCategories] = useState([]);
  const [menuItems,  setMenuItems]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  // ── New Category form ──
  const [showForm,    setShowForm]    = useState(false);
  const [catName,     setCatName]     = useState('');
  const [isParent,    setIsParent]    = useState(false);
  const [subNames,    setSubNames]    = useState(['']);
  const [nameError,   setNameError]   = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);

  // ── New Subcategory form (opened via "+ Sub" button) ──
  const [showSubForm,   setShowSubForm]   = useState(false);
  const [subParent,     setSubParent]     = useState(null); // full parent object
  const [subName,       setSubName]       = useState('');
  const [subNameError,  setSubNameError]  = useState('');
  const [showSubConfirm, setShowSubConfirm] = useState(false);
  const [subSaving,     setSubSaving]     = useState(false);

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

  // ── Derived ──
  const topLevel = categories.filter(c => !c.parentId);

  const sortedCategories = (() => {
    const result = [];
    for (const parent of topLevel) {
      result.push({ ...parent, indent: false });
      categories
        .filter(c => c.parentId === parent.id)
        .forEach(child => result.push({ ...child, indent: true, parentName: parent.name }));
    }
    const listed = new Set(result.map(c => c.id));
    categories.filter(c => !listed.has(c.id)).forEach(c => result.push({ ...c, indent: !!c.parentId }));
    return result;
  })();

  const countFor = name => menuItems.filter(m => m.category === name).length;
  const isDuplicate = name =>
    categories.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());

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

  // ── New Category handlers ──
  const handleOpenForm = () => {
    setCatName(''); setIsParent(false); setSubNames(['']); setNameError(''); setShowForm(true);
  };
  const handleCloseForm = () => {
    setShowForm(false); setCatName(''); setIsParent(false); setSubNames(['']); setNameError('');
  };

  const handleSubmit = () => {
    const trimmed = catName.trim();
    if (!trimmed) { setNameError('Category name is required.'); return; }
    if (isDuplicate(trimmed)) { setNameError('A category with this name already exists.'); return; }
    // Validate filled-in subcategory names for duplicates
    const filledSubs = subNames.map(s => s.trim()).filter(Boolean);
    for (const sub of filledSubs) {
      if (isDuplicate(sub)) { setNameError(`Subcategory "${sub}" already exists.`); return; }
    }
    const unique = new Set(filledSubs.map(s => s.toLowerCase()));
    if (unique.size < filledSubs.length) { setNameError('Duplicate subcategory names.'); return; }
    setNameError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const parentRef = await addDoc(collection(db, 'categories'), {
        name: catName.trim(), isParent, parentId: null,
      });
      const filledSubs = subNames.map(s => s.trim()).filter(Boolean);
      await Promise.all(filledSubs.map(sub =>
        addDoc(collection(db, 'categories'), { name: sub, isParent: false, parentId: parentRef.id })
      ));
      await logAudit('ADD_CATEGORY', parentRef.id, catName.trim(), {
        isParent, subcategories: filledSubs,
      });
      await loadData();
      setShowConfirm(false);
      setShowForm(false);
      setCatName(''); setIsParent(false); setSubNames(['']);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // ── Subcategory handlers ──
  const handleOpenSubForm = (parent) => {
    setSubParent(parent); setSubName(''); setSubNameError(''); setShowSubForm(true);
  };
  const handleCloseSubForm = () => { setShowSubForm(false); setSubParent(null); setSubName(''); setSubNameError(''); };

  const handleSubSubmit = () => {
    const trimmed = subName.trim();
    if (!trimmed) { setSubNameError('Subcategory name is required.'); return; }
    if (isDuplicate(trimmed)) { setSubNameError('A category with this name already exists.'); return; }
    setSubNameError('');
    setShowSubConfirm(true);
  };

  const handleSubConfirm = async () => {
    setSubSaving(true);
    try {
      const subRef = await addDoc(collection(db, 'categories'), {
        name: subName.trim(),
        isParent: false,
        parentId: subParent.id,
      });
      await logAudit('ADD_SUBCATEGORY', subRef.id, subName.trim(), {
        parentCategory: subParent.name, parentId: subParent.id,
      });
      await loadData();
      setShowSubConfirm(false);
      setShowSubForm(false);
      setSubParent(null); setSubName('');
    } catch (e) { console.error(e); }
    setSubSaving(false);
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Menu Categories</h1>
          <div className="flex items-center justify-between">
            <span className="text-xl text-gray-500">
              {loading ? '…' : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenForm}
                className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"
              >
                <Plus size={16} /> New Category
              </button>
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[10%] text-xl font-semibold text-gray-800 text-center">#</span>
            <span className="flex-1  text-xl font-semibold text-gray-800 text-center">Category Name</span>
            <span className="w-[18%] text-xl font-semibold text-gray-800 text-center">Menu Items</span>
            <span className="w-[14%]" />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {loading ? (
              <p className="py-12 text-gray-400 text-xl text-center">Loading…</p>
            ) : sortedCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Tag size={36} className="text-gray-300" />
                <p className="text-xl text-gray-400">No categories yet. Create one to get started.</p>
              </div>
            ) : (
              sortedCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className={`flex items-center bg-white rounded-xl border shadow-sm px-5 py-3.5 ${
                    cat.indent ? 'border-gray-100 ml-8' : 'border-gray-200'
                  }`}
                >
                  <span className="w-[10%] text-xl text-gray-500 text-center">{idx + 1}</span>
                  <span className="flex-1 text-xl text-gray-700 text-center font-medium flex items-center justify-center gap-2">
                    {cat.indent && <span className="text-gray-400">↳</span>}
                    {cat.name}
                    {cat.indent && cat.parentName && (
                      <span className="text-xl text-gray-400 font-normal">({cat.parentName})</span>
                    )}
                  </span>
                  <span className="w-[18%] text-xl text-gray-700 text-center">{countFor(cat.name)}</span>
                  <span className="w-[14%] flex justify-center">
                    {cat.isParent && (
                      <button
                        onClick={() => handleOpenSubForm(cat)}
                        className="flex items-center gap-1 text-xl text-[#3ca4c7] hover:text-[#2b8aa8] transition-colors"
                      >
                        <Plus size={14} /> Sub
                      </button>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* ── New Category Form ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px]">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Category</h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="px-8 py-7 flex flex-col gap-5">

              <div className="flex flex-col gap-2">
                <label className="text-xl font-medium text-gray-700">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={e => { setCatName(e.target.value); setNameError(''); }}
                  placeholder="e.g. Milk Tea"
                  className={`border rounded-lg px-4 py-3 text-xl text-gray-700 outline-none transition-colors ${
                    nameError ? 'border-red-400' : 'border-gray-300 focus:border-[#3ca4c7]'
                  }`}
                />
                {nameError && <p className="text-lg text-red-500">{nameError}</p>}
              </div>

              <div className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-xl">
                <div>
                  <p className="text-xl font-medium text-gray-700">This category will have subcategories</p>
                  <p className="text-xl text-gray-400 mt-0.5">Add subcategories below after checking</p>
                </div>
                <button
                  onClick={() => { setIsParent(v => !v); setSubNames(['']); }}
                  className={`w-10 h-10 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isParent ? 'bg-[#3ca4c7] border-[#3ca4c7] text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  {isParent && <span className="font-bold text-xl">✓</span>}
                </button>
              </div>

              {/* Inline subcategory list */}
              {isParent && (
                <div className="flex flex-col gap-3">
                  <p className="text-xl font-medium text-gray-700">Subcategories</p>
                  <div className="border border-gray-200 rounded-xl px-4 pt-4 pb-3 flex flex-col gap-3">
                    {subNames.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl text-gray-400 w-6 text-center shrink-0">{i + 1}</span>
                        <input
                          type="text"
                          value={s}
                          onChange={e => setSubNames(p => p.map((v, idx) => idx === i ? e.target.value : v))}
                          placeholder="Subcategory name"
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                        />
                        <button
                          onClick={() => setSubNames(p => p.filter((_, idx) => idx !== i))}
                          disabled={subNames.length === 1}
                          className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setSubNames(p => [...p, ''])}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-full text-xl transition-colors mt-1"
                    >
                      + Add another subcategory
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3 rounded-xl text-xl font-semibold transition-colors"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm New Category ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Category?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">Name: <span className="font-semibold">{catName.trim()}</span></p>
              {isParent && subNames.filter(s => s.trim()).length > 0 && (
                <>
                  <p className="text-xl text-gray-500 mt-1">Subcategories:</p>
                  {subNames.filter(s => s.trim()).map((s, i) => (
                    <p key={i} className="text-xl text-gray-700 pl-4">↳ {s.trim()}</p>
                  ))}
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowConfirm(false)} disabled={saving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={saving}
                className={`px-6 py-2 rounded-full text-xl transition-colors ${saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'}`}>
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Subcategory Form ── */}
      {showSubForm && subParent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px]">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">New Subcategory</h3>
                <p className="text-xl text-gray-400 mt-0.5">Under: <span className="font-medium text-gray-600">{subParent.name}</span></p>
              </div>
              <button onClick={handleCloseSubForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="px-8 py-7 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xl font-medium text-gray-700">Subcategory Name</label>
                <input
                  type="text"
                  value={subName}
                  onChange={e => { setSubName(e.target.value); setSubNameError(''); }}
                  placeholder={`e.g. Fruit Tea`}
                  className={`border rounded-lg px-4 py-3 text-xl text-gray-700 outline-none transition-colors ${
                    subNameError ? 'border-red-400' : 'border-gray-300 focus:border-[#3ca4c7]'
                  }`}
                />
                {subNameError && <p className="text-lg text-red-500">{subNameError}</p>}
              </div>
              <button
                onClick={handleSubSubmit}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3 rounded-xl text-xl font-semibold transition-colors"
              >
                Save Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm New Subcategory ── */}
      {showSubConfirm && subParent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Subcategory?</h3>
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
              <p className="text-xl text-gray-700">Name: <span className="font-semibold">{subName.trim()}</span></p>
              <p className="text-xl text-gray-700">Under: <span className="font-semibold">{subParent.name}</span></p>
            </div>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowSubConfirm(false)} disabled={subSaving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
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
