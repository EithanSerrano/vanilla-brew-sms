import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Filter, RefreshCw, Maximize2, X, Download } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';

function quickSort(arr, keyFn) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left  = arr.filter(x => keyFn(x) < keyFn(pivot));
  const mid   = arr.filter(x => keyFn(x) === keyFn(pivot));
  const right = arr.filter(x => keyFn(x) > keyFn(pivot));
  return [...quickSort(left, keyFn), ...mid, ...quickSort(right, keyFn)];
}

export default function Dashboard({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;

  const [sales,            setSales]            = useState([]);
  const [ingredients,      setIngredients]      = useState([]);
  const [materials,        setMaterials]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [viewingSale,      setViewingSale]      = useState(null);
  const [showAllStock,     setShowAllStock]     = useState(false);
  const [showAllAnalytics, setShowAllAnalytics] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transSnap, ingSnap, matSnap] = await Promise.all([
        getDocs(collection(db, 'salestransaction')),
        getDocs(collection(db, 'ingredients')),
        getDocs(collection(db, 'materials')),
      ]);
      const data = transSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const getTime = s => {
        if (s.createdAt?.toDate) return s.createdAt.toDate().getTime();
        if (s.dateAndTimeStr) return new Date(s.dateAndTimeStr).getTime() || 0;
        return 0;
      };
      data.sort((a, b) => getTime(b) - getTime(a));
      setSales(data);
      setIngredients(ingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMaterials(matSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Critical Stock (quicksorted by stock/maxLimit ratio ascending) ──
  const stockItems = [
    ...materials
      .filter(m => m.isActive !== false && (m.maxLimit || 0) > 0)
      .map(m => ({
        id: m.id,
        name: `${m.size ? `(${m.size[0]}) ` : ''}${m.name}`,
        stock: m.stock ?? 0,
        maxLimit: m.maxLimit,
        unit: 'units',
      })),
    ...ingredients
      .filter(i => i.isActive !== false && i.archived !== true && (i.maxLimit || 0) > 0)
      .map(i => {
        const total = (i.batches || []).reduce((s, b) => s + (b.quantity || 0), 0);
        return { id: i.id, name: i.name, stock: total, maxLimit: i.maxLimit, unit: i.unit || 'units' };
      }),
  ];
  const sortedStock    = quickSort(stockItems, x => x.stock / x.maxLimit);
  const displayedStock = showAllStock ? sortedStock : sortedStock.slice(0, 4);

  // ── Sales Analytics (weekly tally) ──
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
  const tally = {};
  sales.forEach(sale => {
    const d = sale.createdAt?.toDate?.() || (sale.dateAndTimeStr ? new Date(sale.dateAndTimeStr) : null);
    if (d && d < oneWeekAgo) return;
    (sale.orders || []).forEach(order => {
      const name = order.name || 'Unknown';
      tally[name] = (tally[name] || 0) + (Number(order.qty) || 1);
    });
  });
  const ranked          = Object.entries(tally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .map((x, i) => ({ ...x, rank: i + 1 }));
  const displayedRanked = showAllAnalytics ? ranked : ranked.slice(0, 5);

  const splitDateTime = str => {
    if (!str) return { date: '—', time: '—' };
    const last = str.lastIndexOf(', ');
    return last === -1
      ? { date: str, time: '—' }
      : { date: str.slice(0, last), time: str.slice(last + 2) };
  };

  const filtered = sales.filter(s =>
    !searchQuery ||
    (s.transactionNumber || s.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadReceipt = sale => {
    const { date, time } = splitDateTime(sale.dateAndTimeStr);
    const lines = [
      '=== RECEIPT ===',
      `Sales ID   : ${sale.transactionNumber || sale.id}`,
      `Date       : ${date}`,
      `Time       : ${time}`,
      `Order Mode : ${sale.orderMode || '—'}`,
      `Payment    : ${sale.modeOfPayment || '—'}`,
      '',
      '--- ITEMS ---',
      ...(sale.orders || []).map(o =>
        `  ${o.qty}x ${o.name}${o.size ? ` (${o.size})` : ''}${o.addons ? ` + ${o.addons}` : ''}  ₱${o.totalPrice}`
      ),
      '',
      `TOTAL      : ₱${sale.totalAmount ?? '—'}`,
      '================',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `receipt-${sale.transactionNumber || sale.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full h-full">
      <Sidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-5 shrink-0">Dashboard</h1>

        <div className="flex gap-5 flex-1 min-h-0">

          {/* ── LEFT: Sales History ── */}
          <div className="flex-[2] flex flex-col border border-gray-200 rounded-xl min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-2xl font-semibold text-gray-800">Sales History</h2>
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 transition-colors" title="Refresh">
                <RefreshCw size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2 flex-1 border-b border-gray-300 pb-1">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text" placeholder="Search here" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
                />
              </div>
              <button className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-full text-xl transition-colors shrink-0">
                <Filter size={16} /> Filter the List
              </button>
            </div>
            <div className="flex items-center px-17 py-3 border-b border-gray-200 bg-white shrink-0">
              <span className="w-[32%] pl-10 text-xl font-semibold text-gray-800">Sales ID</span>
              <span className="w-[21%] text-xl font-semibold text-gray-800 text-center">Date</span>
              <span className="w-[21%] text-xl font-semibold text-gray-800 text-center">Time</span>
              <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Action</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
              {loading && <p className="py-12 text-gray-400 text-xl text-center">Loading…</p>}
              {!loading && filtered.length === 0 && (
                <p className="py-12 text-gray-400 text-xl text-center">No sales records found.</p>
              )}
              {filtered.map(sale => {
                const { date, time } = splitDateTime(sale.dateAndTimeStr);
                return (
                  <div key={sale.id} className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5">
                    <span className="w-[32%] pl-10 text-xl text-gray-700">{sale.transactionNumber || sale.id}</span>
                    <span className="w-[23%] text-xl text-gray-700 text-center">{date}</span>
                    <span className="w-[18%] text-xl text-gray-700 text-center">{time}</span>
                    <div className="flex-1 flex justify-center">
                      <button
                        onClick={() => setViewingSale(sale)}
                        className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-5 py-1.5 rounded-full text-xl transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Analytics + Stock stacked ── */}
          <div className="flex-[1] flex flex-col gap-5 min-h-0">

            {/* Sales Analytics */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden min-h-0">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">Sales Analytics</h2>
                  <p className="text-base text-gray-400 mt-0.5">This week</p>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <button onClick={() => setShowAllAnalytics(v => !v)} title={showAllAnalytics ? 'Collapse' : 'Expand'}>
                    <Maximize2 size={18} className="cursor-pointer hover:text-gray-600 transition-colors" />
                  </button>
                  <RefreshCw size={18} className="cursor-pointer hover:text-gray-600 transition-colors" onClick={loadData} />
                </div>
              </div>
              {/* Column headers */}
              <div className="flex items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                <span className="w-14 text-lg font-semibold text-gray-600 text-center">Top</span>
                <span className="flex-1 text-lg font-semibold text-gray-600 pl-2">Menu Item</span>
                <span className="w-20 text-lg font-semibold text-gray-600 text-right">Orders</span>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col" style={{ scrollbarGutter: 'stable' }}>
                {ranked.length === 0
                  ? <p className="text-xl text-gray-400 text-center py-8">No sales this week.</p>
                  : displayedRanked.map((item, idx) => (
                    <div
                      key={item.name}
                      className={`flex items-center px-5 py-3 ${idx < displayedRanked.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <span className="w-14 text-xl font-semibold text-gray-400 text-center">{item.rank}</span>
                      <span className="flex-1 text-xl text-gray-700 pl-2 truncate">{item.name}</span>
                      <span className="w-20 text-xl font-bold text-gray-800 text-right">{item.count}</span>
                    </div>
                  ))
                }
              </div>
              {ranked.length > 5 && (
                <button
                  onClick={() => setShowAllAnalytics(v => !v)}
                  className="px-6 py-2.5 text-xl text-[#3ca4c7] hover:bg-gray-50 border-t border-gray-100 text-center transition-colors shrink-0"
                >
                  {showAllAnalytics ? 'Show less ↑' : 'Expand to see more ↓'}
                </button>
              )}
            </div>

            {/* Critical Stock */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden min-h-0">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <h2 className="text-2xl font-semibold text-gray-800">Critical Stock</h2>
                <div className="flex items-center gap-3 text-gray-400">
                  <button onClick={() => setShowAllStock(v => !v)} title={showAllStock ? 'Collapse' : 'Expand'}>
                    <Maximize2 size={18} className="cursor-pointer hover:text-gray-600 transition-colors" />
                  </button>
                  <RefreshCw size={18} className="cursor-pointer hover:text-gray-600 transition-colors" onClick={loadData} />
                </div>
              </div>
              {/* Column headers */}
              <div className="flex items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                <span className="flex-1 text-lg font-semibold text-gray-600">Name</span>
                <span className="w-32 text-lg font-semibold text-gray-600 text-right">Stock</span>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col" style={{ scrollbarGutter: 'stable' }}>
                {displayedStock.length === 0
                  ? <p className="text-xl text-gray-400 text-center py-8">All items well-stocked.</p>
                  : displayedStock.map((item, idx) => {
                    const isLow = item.stock / item.maxLimit < 0.1;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center px-5 py-3 ${idx < displayedStock.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <span className="flex-1 text-xl text-gray-700 truncate">{item.name}</span>
                        <span className={`w-32 text-xl font-bold text-right ${isLow ? 'text-[#DF0C0C]' : 'text-[#06BC2E]'}`}>
                          {item.stock} {item.unit}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
              {sortedStock.length > 4 && (
                <div className="flex justify-center px-5 py-3 border-t border-gray-100 shrink-0">
                  <button
                    onClick={() => setShowAllStock(v => !v)}
                    className="px-5 py-1.5 text-base bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white rounded-full transition-colors font-medium"
                  >
                    {showAllStock ? 'Show less' : 'Expand to see more'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* ── View Sale Modal ── */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1100px] max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 shrink-0">
              <h3 className="text-2xl font-semibold text-gray-800">Viewing Sales</h3>
              <button onClick={() => setViewingSale(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="flex flex-1 min-h-0 px-8 py-6 gap-10">

              {/* Left: Order Information */}
              <div className="flex-1 flex flex-col gap-4 shrink-0">
                <p className="text-xl font-semibold text-gray-800">Order Information</p>
                {(() => {
                  const { date, time } = splitDateTime(viewingSale.dateAndTimeStr);
                  return [
                    ['Sales ID',      viewingSale.transactionNumber || viewingSale.id],
                    ['Date',          date],
                    ['Time',          time],
                    ['Customer Name', viewingSale.customerName],
                    ['Cashier Name',  viewingSale.cashierName],
                    ['Order Mode',    viewingSale.orderMode],
                    ['Payment Mode',  viewingSale.modeOfPayment],
                  ];
                })().map(([label, value]) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="text-xl text-gray-600 w-44 shrink-0 text-right">{label}</span>
                    <div className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 bg-gray-50 min-h-[48px]">
                      {value || ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Order List */}
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <p className="text-xl font-semibold text-gray-800">Order List</p>
                <div className="flex-1 border border-gray-200 rounded-xl overflow-y-auto p-3 bg-gray-50 flex flex-col gap-2 min-h-0">
                  {(viewingSale.orders || []).length === 0 ? (
                    <p className="text-xl text-gray-400 text-center py-6">No items.</p>
                  ) : (
                    <>
                      <div className="flex items-center px-3 py-1.5 text-xl font-semibold text-gray-600 border-b border-gray-200 mb-1">
                        <span className="w-12 text-center">Qty</span>
                        <span className="flex-1 pl-2">Item</span>
                        <span className="w-20 text-center">Size</span>
                        <span className="w-28 text-right">Total</span>
                      </div>
                      {(viewingSale.orders || []).map((order, i) => (
                        <div key={i} className="flex items-start bg-white rounded-lg border border-gray-200 px-3 py-2 text-xl text-gray-700">
                          <span className="w-12 text-center">{order.qty}</span>
                          <span className="flex-1 pl-2">
                            {order.name}
                            {order.addons ? <span className="block text-gray-400 text-lg">+ {order.addons}</span> : null}
                          </span>
                          <span className="w-20 text-center text-gray-500">{order.size}</span>
                          <span className="w-28 text-right font-medium">₱{order.totalPrice}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xl font-semibold text-gray-800">Total</span>
                  <span className="text-xl font-semibold text-gray-800">₱{viewingSale.totalAmount ?? '—'}</span>
                </div>
                <div className="flex justify-end shrink-0">
                  <button
                    onClick={() => handleDownloadReceipt(viewingSale)}
                    className="flex items-center gap-2 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-6 py-2.5 rounded-full text-xl transition-colors"
                  >
                    <Download size={18} />
                    Download Receipt
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}