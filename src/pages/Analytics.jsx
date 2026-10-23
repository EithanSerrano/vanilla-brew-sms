import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { RefreshCw, Banknote, Receipt, Tag, Coffee } from 'lucide-react';
import { db } from '../firebase';
import AdminSidebar from '../layouts/AdminSidebar';
import { getSessionRole } from '../constants/roles';
import { countMockOrders, removeMockOrders, seedMockOrders } from '../utils/mockData';
import { computeAnalytics, endOfDay, hourLabel, pctChange, peso, startOfDay, toOrder } from '../utils/analytics';

const RANGES = [
  { key: 'today', label: 'Today',   days: 1 },
  { key: '7d',    label: '7 Days',  days: 7 },
  { key: '30d',   label: '30 Days', days: 30 },
  { key: '90d',   label: '90 Days', days: 90 },
];

const ACCENT = '#b87050';
const HIGHLIGHT = '#0A5A3A';

function Card({ title, sub, children, className = '' }) {
  return (
    <div className={`border border-gray-200 rounded-xl shadow-md p-6 bg-white ${className}`}>
      <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      {sub && <p className="text-base text-gray-500 mt-0.5">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BarChart({ data, formatValue, height = 160 }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 h-full flex items-end group relative">
            <div
              className="w-full rounded-t"
              style={{
                height: max > 0 ? `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%` : 0,
                backgroundColor: d.highlight ? HIGHLIGHT : ACCENT,
              }}
            />
            {d.tip && (
              <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-sm text-white z-10">
                {d.tip}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-[3px] mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 min-w-0 relative h-6">
            <span className={`absolute left-1/2 -translate-x-1/2 w-px bg-gray-300 top-0 ${d.label ? 'h-2' : 'h-1'}`} />
            <span className="absolute top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-500">{d.label}</span>
          </div>
        ))}
      </div>
      {formatValue && max > 0 && <p className="text-sm text-gray-500 mt-2">Peak: {formatValue(max)}</p>}
    </div>
  );
}

function RankRows({ rows, valueFmt, emptyText = 'No data for this period' }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0) return <p className="text-lg text-gray-400">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`}>
          <div className="flex justify-between gap-3 mb-1">
            <span className="text-lg text-gray-800 truncate">{r.label}</span>
            <span className="text-lg font-semibold text-gray-800 shrink-0">{valueFmt(r)}</span>
          </div>
          <div className="h-2 rounded-full bg-[#F0E6E1]">
            <div className="h-2 rounded-full" style={{ width: `${max > 0 ? (r.value / max) * 100 : 0}%`, backgroundColor: ACCENT }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ value, label, color }) {
  return (
    <div className="flex-1 min-w-[180px]">
      <p className="text-2xl font-bold" style={color ? { color } : undefined}>{value}</p>
      <p className="text-base text-gray-500">{label}</p>
    </div>
  );
}

// Demo helper (admin only; temporarily enabled in production builds):
// fills the last 90 days with tagged mock orders so the charts have something to show.
function MockDataPanel({ onChange }) {
  const [busy, setBusy] = useState('');
  const [count, setCount] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    countMockOrders().then(setCount).catch(() => setCount(null));
  }, []);

  const run = async (label, fn) => {
    setBusy(label);
    setMessage('');
    try {
      const n = await fn();
      setMessage(`${label === 'seed' ? 'Added' : 'Removed'} ${n} mock orders.`);
      setCount(await countMockOrders());
      onChange();
    } catch (e) {
      console.error('Mock data error:', e);
      setMessage('Something went wrong. See the browser console.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-5 py-3">
      <span className="text-lg font-semibold text-amber-800">Dev tools · Mock data</span>
      <span className="text-base text-amber-700">{count === null ? '' : `${count} mock orders in the database`}</span>
      <div className="ml-auto flex items-center gap-2">
        {message && <span className="text-base text-amber-800">{message}</span>}
        <button
          onClick={() => run('seed', () => seedMockOrders(90))}
          disabled={!!busy}
          className="rounded-full bg-amber-600 px-4 py-1.5 text-base text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy === 'seed' ? 'Adding…' : 'Add 90 days of mock data'}
        </button>
        <button
          onClick={() => run('remove', removeMockOrders)}
          disabled={!!busy || count === 0}
          className="rounded-full border border-amber-600 px-4 py-1.5 text-base text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          {busy === 'remove' ? 'Removing…' : 'Remove mock data'}
        </button>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [rangeKey, setRangeKey] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const range = RANGES.find((r) => r.key === rangeKey);
  const { start, prevStart } = useMemo(() => {
    const st = startOfDay(new Date());
    st.setDate(st.getDate() - (range.days - 1));
    const ps = new Date(st);
    ps.setDate(ps.getDate() - range.days);
    return { start: st, prevStart: ps };
  }, [range.days]);

  // One query covers the current and previous period so we can compare them.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getDocs(query(collection(db, 'salestransaction'), where('createdAt', '>=', prevStart), orderBy('createdAt', 'desc')))
      .then((snap) => {
        if (cancelled) return;
        setOrders(snap.docs.map((d) => toOrder(d.data())));
      })
      .catch((e) => {
        console.error('Analytics load error:', e);
        if (!cancelled) setError('Could not load sales data. Check your connection and try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [prevStart, reloadKey]);

  const data = useMemo(
    () => computeAnalytics(orders, start, endOfDay(new Date()), prevStart),
    [orders, start, prevStart]
  );

  const prevLabel = range.days === 1 ? 'yesterday' : 'prev. period';
  const kpis = [
    { label: 'Revenue',         value: peso(data.k.revenue), delta: pctChange(data.k.revenue, data.pk.revenue), Icon: Banknote },
    { label: 'Orders',          value: String(data.k.count), delta: pctChange(data.k.count, data.pk.count),     Icon: Receipt },
    { label: 'Avg Order Value', value: peso(data.k.aov),     delta: pctChange(data.k.aov, data.pk.aov),         Icon: Tag },
    { label: 'Items Sold',      value: String(data.k.items), delta: pctChange(data.k.items, data.pk.items),     Icon: Coffee },
  ];

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReloadKey((n) => n + 1)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {getSessionRole() === 'admin' && (
          <MockDataPanel onChange={() => setReloadKey((n) => n + 1)} />
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-5 py-2 rounded-full text-lg transition-colors ${
                rangeKey === r.key ? 'bg-[#614033] text-white font-semibold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center mt-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#b87050]" />
          </div>
        ) : error ? (
          <p className="text-center text-lg text-gray-500 mt-16">{error}</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
              {kpis.map(({ label, value, delta, Icon }) => (
                <div key={label} className="border border-gray-200 rounded-xl shadow-md p-5">
                  <Icon size={20} color={ACCENT} />
                  <p className="text-3xl font-bold text-gray-900 mt-2 truncate">{value}</p>
                  <p className="text-lg text-gray-500">{label}</p>
                  <p className={`text-base mt-1 ${delta === null ? 'text-gray-400' : delta >= 0 ? 'text-[#0A5A3A]' : 'text-[#C0392B]'}`}>
                    {delta === null ? `no data ${prevLabel}` : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(0)}% vs ${prevLabel}`}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Card title="Sales Trend" sub={range.days === 1 ? 'Yesterday vs today (daily revenue)' : 'Daily revenue'}>
                <BarChart data={data.trend} formatValue={peso} />
              </Card>
              <Card
                title="Peak Hours"
                sub={data.peak.value > 0 ? `Busiest: ${hourLabel(data.peak.hour)} · ${peso(data.peak.value)} from ${data.peak.orders} orders` : 'Revenue by hour of day'}
              >
                <BarChart data={data.hours} />
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Card title="Top Items" sub="By quantity sold">
                <RankRows rows={data.topItems} valueFmt={(r) => `${r.qty} · ${peso(r.revenue)}`} />
              </Card>
              <Card title="Slowest Items" sub="Lowest quantity sold, candidates to promote or drop">
                <RankRows rows={data.bottomItems} valueFmt={(r) => `${r.qty} · ${peso(r.revenue)}`} />
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Card title="Payment Methods" sub="Share of revenue">
                <RankRows rows={data.payments} valueFmt={(r) => `${peso(r.value)} · ${r.count}`} />
              </Card>
              <Card title="Cashier Performance" sub="Revenue and orders per cashier">
                <RankRows rows={data.cashiers} valueFmt={(r) => `${peso(r.value)} · ${r.count}`} />
              </Card>
            </div>

            <Card title="Returns & Refunds" sub="Orders marked Returned or Refunded, not counted in the sales figures above">
              <div className="flex flex-wrap gap-6">
                <Stat value={data.returns.returned} label="Returned orders" color="#D97B39" />
                <Stat value={data.returns.refunded} label="Refunded orders" color="#C0392B" />
                <Stat
                  value={peso(data.returns.amount)}
                  label={`Value lost${data.returns.amountChange === null ? '' : ` (${data.returns.amountChange >= 0 ? '▲' : '▼'} ${Math.abs(data.returns.amountChange).toFixed(0)}% vs ${prevLabel})`}`}
                />
                <Stat value={`${data.returns.rate.toFixed(1)}%`} label="Return/refund rate" />
              </div>
              <p className="text-base text-gray-500 mt-5 mb-2">Most returned items</p>
              <RankRows
                rows={data.returns.items}
                valueFmt={(r) => `${r.value} · ${peso(r.amount)}`}
                emptyText="No returns or refunds in this period"
              />
              {data.returns.recent.length > 0 && (
                <>
                  <p className="text-base text-gray-500 mt-5 mb-2">Recent</p>
                  {data.returns.recent.map((o, i) => (
                    <div key={i} className="flex justify-between py-1 text-lg">
                      <span className="text-gray-700 truncate">
                        {o.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {o.cashier}
                      </span>
                      <span className={`font-semibold shrink-0 ${o.status === 'Refunded' ? 'text-[#C0392B]' : 'text-[#D97B39]'}`}>
                        {o.status} · {peso(o.total)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </Card>

            <Card title="Discounts & Promotions">
              <div className="flex flex-wrap gap-6">
                <Stat value={peso(data.discountTotal)} label={`Senior/PWD discounts (${data.seniorPwdCount} orders)`} />
                <Stat value={peso(data.promoTotal)} label="Promo savings given" />
                <Stat
                  value={data.hasPromoOrders ? `${peso(data.promoAov)} vs ${peso(data.noPromoAov)}` : '–'}
                  label="Avg order: with promo vs without"
                />
              </div>
              <p className="text-base text-gray-500 mt-5 mb-2">Most used promos</p>
              <RankRows
                rows={data.promos}
                valueFmt={(r) => `${r.value} uses · ${peso(r.saved)}`}
                emptyText="No promos applied in this period"
              />
            </Card>

            <p className="text-center text-base text-gray-400">
              Sales figures exclude returned and refunded orders; those are shown in Returns & Refunds.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
