import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, X, Tag, RefreshCw } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

export default function MenuCategories() {
  const [categories, setCategories] = useState([]);
  const [menuItems,  setMenuItems]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  // ── New Category form ──
  const [showForm,    setShowForm]    = useState(false);
  const [catName,     setCatName]     = useState('');
  const [nameError,   setNameError]   = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);

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

  const countFor = name => menuItems.filter(m => m.category === name).length;

  const isDuplicate = name =>
    categories.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());

  const handleOpenForm = () => { setCatName(''); setNameError(''); setShowForm(true); };
  const handleCloseForm = () => { setShowForm(false); setCatName(''); setNameError(''); };

  const handleSubmit = () => {
    const trimmed = catName.trim();
    if (!trimmed) { setNameError('Category name is required.'); return; }
    if (isDuplicate(trimmed)) { setNameError('A category with this name already exists.'); return; }
    setNameError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'categories'), { name: catName.trim() });
      await loadData();
      setShowConfirm(false);
      setShowForm(false);
      setCatName('');
    } catch (e) { console.error(e); }
    setSaving(false);
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
          {/* Column headers */}
          <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[12%] text-xl font-semibold text-gray-800 text-center">#</span>
            <span className="flex-1  text-xl font-semibold text-gray-800 text-center">Category Name</span>
            <span className="w-[20%] text-xl font-semibold text-gray-800 text-center">Menu Items</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {loading ? (
              <p className="py-12 text-gray-400 text-xl text-center">Loading…</p>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Tag size={36} className="text-gray-300" />
                <p className="text-xl text-gray-400">No categories yet. Create one to get started.</p>
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5"
                >
                  <span className="w-[12%] text-xl text-gray-500 text-center">{idx + 1}</span>
                  <span className="flex-1  text-xl text-gray-700 text-center font-medium">{cat.name}</span>
                  <span className="w-[20%] text-xl text-gray-700 text-center">{countFor(cat.name)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* ── New Category Form ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px]">
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
                    nameError ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-[#3ca4c7]'
                  }`}
                />
                {nameError && <p className="text-lg text-red-500">{nameError}</p>}
              </div>
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

      {/* ── Confirm Dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save New Category?</h3>
            <p className="text-xl text-gray-600">
              Category: <span className="font-semibold">{catName.trim()}</span>
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className={`px-6 py-2 rounded-full text-xl transition-colors ${
                  saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'
                }`}
              >
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
