import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Filter, RefreshCw, Maximize2, Eye, X } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';

export default function Dashboard({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingSale, setViewingSale] = useState(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'transactions'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) =>
        (b.createdAt?.toDate?.()?.getTime() || 0) -
        (a.createdAt?.toDate?.()?.getTime() || 0)
      );
      setSales(data);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSales(); }, []);

  const filtered = sales.filter(s =>
    !searchQuery ||
    (s.transNo || s.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex w-full h-full">
      <Sidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">
        {/* Page title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-5 shrink-0">Dashboard</h1>

        {/* Two-column content */}
        <div className="flex gap-5 flex-1 min-h-0">

          {/* ── LEFT: Sales History ── */}
          <div className="flex-[2] flex flex-col border border-gray-200 rounded-xl min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-2xl font-semibold text-gray-800">Sales History</h2>
              <button
                onClick={loadSales}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {/* Search + Filter */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2 flex-1 border-b border-gray-300 pb-1">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search here"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
                />
              </div>
              <button className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-full text-xl transition-colors shrink-0">
                <Filter size={16} />
                Filter the List
              </button>
            </div>

            {/* Table */}
            {/* Column headers */}
            <div className="flex items-center px-5 py-3 border-b border-gray-200 bg-white shrink-0">
              <span className="w-[30%] text-xl font-semibold text-gray-800 text-center">Sales ID</span>
              <span className="w-[25%] text-xl font-semibold text-gray-800 text-center">Date</span>
              <span className="w-[25%] text-xl font-semibold text-gray-800 text-center">Time</span>
              <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Action</span>
            </div>
            {/* Scrollable cards */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {loading && (
                <p className="py-12 text-gray-400 text-xl text-center">Loading…</p>
              )}
              {!loading && filtered.length === 0 && (
                <p className="py-12 text-gray-400 text-xl text-center">No sales records found.</p>
              )}
              {filtered.map(sale => (
                <div
                  key={sale.id}
                  className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5"
                >
                  <span className="w-[30%] text-xl text-gray-700 text-center">{sale.transNo || sale.id}</span>
                  <span className="w-[25%] text-xl text-gray-700 text-center">{sale.date || '—'}</span>
                  <span className="w-[25%] text-xl text-gray-700 text-center">{sale.time || '—'}</span>
                  <div className="flex-1 flex justify-center">
                    <button
                      onClick={() => setViewingSale(sale)}
                      className="inline-flex items-center gap-2 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Analytics + Stock ── */}
          <div className="flex-[1] flex flex-col gap-5 min-h-0">

            {/* Sales Analytics */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <h2 className="text-2xl font-semibold text-gray-800">Sales Analytics</h2>
                <div className="flex items-center gap-3 text-gray-400">
                  <Maximize2 size={18} />
                  <RefreshCw size={18} />
                </div>
              </div>
              <div className="px-6 py-3 shrink-0">
                <div className="flex justify-between text-xl font-semibold text-gray-600 border-b border-gray-100 pb-2">
                  <span>Top</span>
                  <span>Menu Item</span>
                  <span>Orders</span>
                </div>
              </div>
              <div className="flex-1" />
            </div>

            {/* Critical Stock */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <h2 className="text-2xl font-semibold text-gray-800">Critical Stock</h2>
                <div className="flex items-center gap-3 text-gray-400">
                  <Maximize2 size={18} />
                  <RefreshCw size={18} />
                </div>
              </div>
              <div className="px-6 py-3 shrink-0">
                <div className="flex justify-between text-xl font-semibold text-gray-600 border-b border-gray-100 pb-2">
                  <span>Name</span>
                  <span>Stock</span>
                </div>
              </div>
              <div className="flex-1" />
            </div>

          </div>
        </div>
      </main>

      {/* ── View Sale Modal ── */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Sale Details</h3>
              <button
                onClick={() => setViewingSale(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={22} />
              </button>
            </div>
            <div className="px-8 py-6 flex flex-col gap-4 text-xl text-gray-700">
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold">Sales ID</span>
                <span>{viewingSale.transNo || viewingSale.id}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold">Date</span>
                <span>{viewingSale.date || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-semibold">Time</span>
                <span>{viewingSale.time || '—'}</span>
              </div>
              {viewingSale.details?.inCharge && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold">In Charge</span>
                  <span>{viewingSale.details.inCharge}</span>
                </div>
              )}
              {viewingSale.details?.orderType && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold">Order Type</span>
                  <span>{viewingSale.details.orderType}</span>
                </div>
              )}
              {viewingSale.details?.grandTotal && (
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="font-semibold">Total</span>
                  <span>{viewingSale.details.grandTotal}</span>
                </div>
              )}
              {viewingSale.details?.items?.length > 0 && (
                <div>
                  <p className="font-semibold mb-3">Items</p>
                  <table className="w-full text-xl text-center border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Qty</th>
                        <th className="py-2 px-3 font-semibold">Item</th>
                        <th className="py-2 px-3 font-semibold">Price</th>
                        <th className="py-2 px-3 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingSale.details.items.map((item, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2 px-3">{item.qty}</td>
                          <td className="py-2 px-3">{item.name}</td>
                          <td className="py-2 px-3">{item.price}</td>
                          <td className="py-2 px-3">{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}