import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Filter, RefreshCw, Maximize2, X, Download } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';

const CHART_COLORS = [
  '#3ca4c7','#f59e0b','#10b981','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16',
];

function quickSort(arr, keyFn) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left  = arr.filter(x => keyFn(x) < keyFn(pivot));
  const mid   = arr.filter(x => keyFn(x) === keyFn(pivot));
  const right = arr.filter(x => keyFn(x) > keyFn(pivot));
  return [...quickSort(left, keyFn), ...mid, ...quickSort(right, keyFn)];
}

function PieChart({ data, total }) {
  if (!data.length || total === 0) {
    return (
      <div className="w-full aspect-square rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-base">No data</span>
      </div>
    );
  }
  const cx = 150, cy = 150, r = 130;
  let cumAngle = -Math.PI / 2;
  const slices = data.map((item, i) => {
    const fraction = item.count / total;
    if (fraction <= 0) return null;
    const sweep = fraction * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += sweep;
    return { item, i, fraction, sweep, startAngle, endAngle: cumAngle };
  }).filter(Boolean);

  return (
    <svg viewBox="0 0 300 300" className="w-full aspect-square drop-shadow-sm">
      {slices.map(({ item, i, fraction, sweep, startAngle, endAngle }) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        if (fraction >= 1) {
          return <circle key={item.name} cx={cx} cy={cy} r={r} fill={color} />;
        }
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const large = sweep > Math.PI ? 1 : 0;
        return (
          <path
            key={item.name}
            d={`M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`}
            fill={color}
          />
        );
      })}
    </svg>
  );
}

export default function Dashboard({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;

  const [sales,              setSales]              = useState([]);
  const [ingredients,        setIngredients]        = useState([]);
  const [materials,          setMaterials]          = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [viewingSale,        setViewingSale]        = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showStockModal,     setShowStockModal]     = useState(false);
  const [analyticsDate,      setAnalyticsDate]      = useState(() => new Date().toISOString().split('T')[0]);
  const [analyticsRangeEnd,  setAnalyticsRangeEnd]  = useState('');
  const [analyticsIsRange,   setAnalyticsIsRange]   = useState(false);

  // ── Sales History filter ──
  const [showFilterPanel,  setShowFilterPanel]  = useState(false);
  const [filterDate,       setFilterDate]       = useState('');
  const [filterRangeEnd,   setFilterRangeEnd]   = useState('');
  const [filterIsRange,    setFilterIsRange]    = useState(false);
  const [filterOrderMode,  setFilterOrderMode]  = useState('');

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

  const fmtDateTs = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US');
  };

  const splitDateTime = str => {
    if (!str) return { date: '—', time: '—' };
    const last = str.lastIndexOf(', ');
    return last === -1
      ? { date: str, time: '—' }
      : { date: str.slice(0, last), time: str.slice(last + 2) };
  };

  const parseSaleDate = sale => {
    if (sale.createdAt?.toDate) return sale.createdAt.toDate();
    if (sale.dateAndTimeStr) {
      const { date, time } = splitDateTime(sale.dateAndTimeStr);
      const d = new Date(`${date} ${time}`);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate();

  // ── Critical Stock ──
  const stockItems = [
    ...materials
      .filter(m => m.isActive !== false && (m.maxLimit || 0) > 0)
      .map(m => ({
        id: m.id,
        displayId:   m.materialId || m.id,
        name:        `${m.size ? `(${m.size[0]}) ` : ''}${m.name}`,
        stock:       m.stock ?? 0,
        maxLimit:    m.maxLimit,
        unit:        'units',
        lastUpdated: fmtDateTs(m.lastUpdated),
      })),
    ...ingredients
      .filter(i => i.isActive !== false && i.archived !== true && (i.maxLimit || 0) > 0)
      .map(i => {
        const total = (i.batches || []).reduce((s, b) => s + (b.quantity || 0), 0);
        return {
          id: i.id,
          displayId:   i.ingredientId || i.id,
          name:        i.name,
          stock:       total,
          maxLimit:    i.maxLimit,
          unit:        i.unit || 'units',
          lastUpdated: fmtDateTs(i.lastUpdated),
        };
      }),
  ];
  const sortedStock    = quickSort(stockItems, x => x.stock / x.maxLimit);
  const displayedStock = sortedStock.slice(0, 5);

  // ── Sales Analytics panel (weekly tally, top 5) ──
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
  const tally = {};
  sales.forEach(sale => {
    const d = parseSaleDate(sale);
    if (d && d < oneWeekAgo) return;
    (sale.orders || []).forEach(order => {
      const name = order.name || 'Unknown';
      tally[name] = (tally[name] || 0) + (Number(order.qty) || 1);
    });
  });
  const ranked = Object.entries(tally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .map((x, i) => ({ ...x, rank: i + 1 }));

  // ── Modal tally (date-filtered) ──
  const modalTally = {};
  sales.forEach(sale => {
    const d = parseSaleDate(sale);
    if (!d) return;
    let include = false;
    if (analyticsIsRange && analyticsDate && analyticsRangeEnd) {
      const start = new Date(analyticsDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(analyticsRangeEnd); end.setHours(23, 59, 59, 999);
      include = d >= start && d <= end;
    } else if (analyticsDate) {
      include = isSameDay(d, new Date(analyticsDate));
    }
    if (!include) return;
    (sale.orders || []).forEach(order => {
      const name = order.name || 'Unknown';
      modalTally[name] = (modalTally[name] || 0) + (Number(order.qty) || 1);
    });
  });
  const modalRanked = Object.entries(modalTally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .map((x, i) => ({ ...x, rank: i + 1 }));
  const modalTotal = modalRanked.reduce((s, x) => s + x.count, 0);

  // ── Sales History filter ──
  const orderModes = [...new Set(sales.map(s => s.orderMode).filter(Boolean))].sort();
  const isFiltered = !!(filterDate || filterOrderMode);

  const filtered = sales.filter(s => {
    if (searchQuery && !(s.transactionNumber || s.id || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterDate) {
      const d = parseSaleDate(s);
      if (!d) return false;
      if (filterIsRange && filterRangeEnd) {
        const start = new Date(filterDate); start.setHours(0, 0, 0, 0);
        const end   = new Date(filterRangeEnd); end.setHours(23, 59, 59, 999);
        if (d < start || d > end) return false;
      } else {
        if (!isSameDay(d, new Date(filterDate))) return false;
      }
    }
    if (filterOrderMode && s.orderMode !== filterOrderMode) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterDate(''); setFilterRangeEnd('');
    setFilterIsRange(false); setFilterOrderMode('');
  };

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
          <div className="flex-[2] flex flex-col border border-gray-200 rounded-xl min-h-0 overflow-hidden shadow-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-2xl font-semibold text-gray-800">Sales History</h2>
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 transition-colors" title="Refresh">
                <RefreshCw size={20} />
              </button>
            </div>
            {/* Search + Filter toggle */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2 flex-1 border-b border-gray-300 pb-1">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text" placeholder="Search here" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilterPanel(v => !v)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xl transition-colors shrink-0 ${
                  isFiltered || showFilterPanel
                    ? 'bg-[#3ca4c7] text-white hover:bg-[#2b8aa8]'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <Filter size={16} /> Filter the List
              </button>
            </div>
            {/* Filter panel */}
            {showFilterPanel && (
              <div className="flex flex-col gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-xl text-gray-600 w-20 shrink-0">Date:</span>
                  <input
                    type="date" value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                  />
                  <label className="flex items-center gap-2 text-xl text-gray-600 shrink-0 cursor-pointer">
                    <input
                      type="checkbox" checked={filterIsRange}
                      onChange={e => setFilterIsRange(e.target.checked)}
                      className="w-4 h-4 accent-[#3ca4c7]"
                    />
                    Range
                  </label>
                  <input
                    type="date" value={filterRangeEnd}
                    onChange={e => setFilterRangeEnd(e.target.value)}
                    disabled={!filterIsRange}
                    className={`flex-1 border rounded-lg px-3 py-2 text-xl outline-none transition-colors ${
                      filterIsRange
                        ? 'border-gray-300 text-gray-700 bg-white focus:border-[#3ca4c7]'
                        : 'border-gray-200 text-gray-300 bg-white cursor-not-allowed'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl text-gray-600 w-20 shrink-0">Mode:</span>
                  <div className="relative flex-1">
                    <select
                      value={filterOrderMode}
                      onChange={e => setFilterOrderMode(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xl text-gray-700 outline-none appearance-none bg-white focus:border-[#3ca4c7]"
                    >
                      <option value="">All modes</option>
                      {orderModes.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <span className="absolute right-3 top-2.5 text-gray-400 pointer-events-none">▾</span>
                  </div>
                  {isFiltered && (
                    <button
                      onClick={clearFilters}
                      className="text-xl text-red-500 hover:text-red-700 transition-colors shrink-0 px-3 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Column headers */}
            <div className="flex items-center px-5 py-3 border-b border-gray-200 bg-white shrink-0">
              <span className="w-[18%] pl-10 text-xl font-semibold text-gray-800 text-center">Sales ID</span>
              <span className="w-[40%] text-xl font-semibold text-gray-800 text-center">Date</span>
              <span className="w-[16%] text-xl font-semibold text-gray-800 text-center">Time</span>
              <span className="w-[25%] text-xl font-semibold text-gray-800 text-center">Action</span>
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
                    <span className="w-[18%] pl-10 text-xl text-gray-700">{sale.transactionNumber || sale.id}</span>
                    <span className="w-[40%] text-xl text-gray-700 text-center">{date}</span>
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
            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden min-h-0 shadow-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">Sales Analytics</h2>
                  <p className="text-base text-gray-400 mt-0.5">This week</p>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <button onClick={() => setShowAnalyticsModal(true)} title="Expand">
                    <Maximize2 size={18} className="cursor-pointer hover:text-gray-600 transition-colors" />
                  </button>
                  <RefreshCw size={18} className="cursor-pointer hover:text-gray-600 transition-colors" onClick={loadData} />
                </div>
              </div>
              <div className="flex items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                <span className="w-14 text-base font-semibold text-gray-600 text-center">Top</span>
                <span className="flex-1 text-base font-semibold text-gray-600 pl-2">Menu Item</span>
                <span className="w-20 text-base font-semibold text-gray-600 text-right">Orders</span>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col" style={{ scrollbarGutter: 'stable' }}>
                {ranked.length === 0
                  ? <p className="text-xl text-gray-400 text-center py-8">No sales this week.</p>
                  : ranked.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.name}
                      className={`flex items-center px-5 py-3 ${idx < Math.min(ranked.length, 5) - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <span className="w-14 text-xl font-semibold text-gray-400 text-center">{item.rank}</span>
                      <span className="flex-1 text-xl text-gray-700 pl-2 truncate">{item.name}</span>
                      <span className="w-20 text-xl font-bold text-gray-800 text-right">{item.count}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Critical Stock */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden min-h-0 shadow-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <h2 className="text-2xl font-semibold text-gray-800">Critical Stock</h2>
                <div className="flex items-center gap-3 text-gray-400">
                  <button onClick={() => setShowStockModal(true)} title="Expand">
                    <Maximize2 size={18} className="cursor-pointer hover:text-gray-600 transition-colors" />
                  </button>
                  <RefreshCw size={18} className="cursor-pointer hover:text-gray-600 transition-colors" onClick={loadData} />
                </div>
              </div>
              <div className="flex items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                <span className="flex-1 text-base font-semibold text-gray-600">Name</span>
                <span className="w-32 text-base font-semibold text-gray-600 text-right">Stock</span>
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
            </div>

          </div>
        </div>
      </main>

      {/* ── Sales Analytics Modal ── */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[1400px] max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 shrink-0">
              <h3 className="text-2xl font-semibold text-gray-800">Viewing Sales Analytics</h3>
              <div className="flex items-center gap-3 text-gray-400">
                <RefreshCw size={20} className="cursor-pointer hover:text-gray-600 transition-colors" onClick={loadData} />
                <button onClick={() => setShowAnalyticsModal(false)} className="hover:text-gray-600 transition-colors">
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex flex-1 min-h-0 px-8 py-6 gap-8">

              {/* Left: Pie chart + legend + date filter */}
              <div className="flex-1 flex flex-col items-center gap-5 shrink-0 min-w-0">
                <div className="w-full max-w-[300px]">
                  <PieChart data={modalRanked} total={modalTotal} />
                </div>
                {modalRanked.length > 0 && (
                  <div className="w-full flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                    {modalRanked.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2.5 shrink-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-base text-gray-600 truncate">{item.name}</span>
                        <span className="text-base text-gray-400 ml-auto shrink-0">{Math.round(item.count / modalTotal * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="w-full flex flex-col gap-4 border-t border-gray-100 pt-5 mt-auto">
                  <div className="flex items-center gap-4">
                    <span className="text-xl text-gray-600 w-20 shrink-0 text-right">Date:</span>
                    <input
                      type="date" value={analyticsDate}
                      onChange={e => setAnalyticsDate(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl text-gray-600 w-20 shrink-0 text-right">Range:</span>
                    <input
                      type="checkbox" checked={analyticsIsRange}
                      onChange={e => setAnalyticsIsRange(e.target.checked)}
                      className="w-5 h-5 accent-[#3ca4c7] shrink-0 cursor-pointer"
                    />
                    <input
                      type="date" value={analyticsRangeEnd}
                      onChange={e => setAnalyticsRangeEnd(e.target.value)}
                      disabled={!analyticsIsRange}
                      className={`flex-1 border rounded-lg px-4 py-2.5 text-xl outline-none transition-colors ${
                        analyticsIsRange
                          ? 'border-gray-300 text-gray-700 bg-white focus:border-[#3ca4c7]'
                          : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Ranked list */}
              <div className="flex-1 flex flex-col min-h-0 border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center px-5 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
                  <span className="w-14 text-xl font-semibold text-gray-700 text-center">Top</span>
                  <span className="flex-1 text-xl font-semibold text-gray-700 pl-2">Menu Item</span>
                  <span className="w-24 text-xl font-semibold text-gray-700 text-right">Orders</span>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col" style={{ scrollbarGutter: 'stable' }}>
                  {modalRanked.length === 0
                    ? <p className="text-xl text-gray-400 text-center py-8">No sales for this period.</p>
                    : modalRanked.map((item, i) => (
                      <div key={item.name} className={`flex items-center px-5 py-3.5 ${i < modalRanked.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <span className="w-14 text-xl font-semibold text-gray-400 text-center">{item.rank}</span>
                        <span className="flex-1 text-xl text-gray-700 pl-2 truncate">{item.name}</span>
                        <span className="w-24 text-xl font-bold text-gray-800 text-right">{item.count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Critical Stock Modal ── */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[1200px] max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 shrink-0">
              <h3 className="text-2xl font-semibold text-gray-800">Viewing Critical Stock Materials / Ingredients</h3>
              <div className="flex items-center gap-3 text-gray-400">
                <RefreshCw size={20} className="cursor-pointer hover:text-gray-600 transition-colors" onClick={loadData} />
                <button onClick={() => setShowStockModal(false)} className="hover:text-gray-600 transition-colors">
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-8 py-5">
              <div className="flex items-center px-5 py-3 bg-gray-50 border border-gray-200 rounded-t-xl shrink-0">
                <span className="w-[22%] text-xl font-semibold text-gray-700 text-center">ID</span>
                <span className="w-[30%] text-xl font-semibold text-gray-700 text-center">Name</span>
                <span className="w-[24%] text-xl font-semibold text-gray-700 text-center">Current Stock</span>
                <span className="flex-1 text-xl font-semibold text-gray-700 text-center">Last Updated</span>
              </div>
              <div className="flex-1 overflow-y-auto border border-t-0 border-gray-200 rounded-b-xl flex flex-col" style={{ scrollbarGutter: 'stable' }}>
                {sortedStock.length === 0
                  ? <p className="text-xl text-gray-400 text-center py-8">No items found.</p>
                  : sortedStock.map((item, idx) => {
                    const isLow = item.stock / item.maxLimit < 0.1;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center px-5 py-3.5 ${idx < sortedStock.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <span className="w-[22%] text-xl text-gray-500 text-center">{item.displayId}</span>
                        <span className="w-[30%] text-xl font-semibold text-gray-700 text-center">{item.name}</span>
                        <span className={`w-[24%] text-xl text-center font-semibold ${isLow ? 'text-[#DF0C0C]' : 'text-[#06BC2E]'}`}>
                          {item.stock} {item.unit}
                        </span>
                        <span className="flex-1 text-xl text-gray-500 text-center">{item.lastUpdated}</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </div>
      )}

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