import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, RefreshCw, Banknote, Receipt, Tag, Coffee } from 'lucide-react';
import { db } from '../firebase';
import AdminSidebar from '../layouts/AdminSidebar';

const RANGES = [
  { key: 'today', label: 'Today',   days: 1 },
  { key: '7d',    label: '7 Days',  days: 7 },
  { key: '30d',   label: '30 Days', days: 30 },
  { key: '90d',   label: '90 Days', days: 90 },
];

const ACCENT = '#b87050';
const HIGHLIGHT = '#0A5A3A';

const peso = (n) => `₱${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
const pctChange = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// Revenue only counts orders that were actually sold.
const isSold = (o) => o.status !== 'Returned' && o.status !== 'Refunded';

const summarize = (orders) => {
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const items = orders.reduce((sum, o) => sum + o.items.reduce((q, i) => q + i.qty, 0), 0);
  return { revenue, count: orders.length, items, aov: orders.length ? revenue / orders.length : 0 };
};

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
          <div key={i} className="flex-1 flex justify-center">
            <span className="w-11 shrink-0 text-center text-xs text-gray-500">{d.label}</span>
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
        setOrders(snap.docs.map((d) => {
          const data = d.data();
          return {
            date: toDate(data.createdAt) || new Date(),
            status: data.status || 'Completed',
            total: Number(data.totalAmount) || 0,
            payment: data.modeOfPayment || 'Cash',
            customerType: data.customerType || 'Regular',
            cashier: data.cashierName || 'Unknown Cashier',
            discount: Number(data.discountAmount) || 0,
            promoDiscount: Number(data.promoDiscountAmount) || 0,
            promos: data.appliedPromotions || [],
            items: (data.orders || []).map((o) => ({
              name: o.name || 'Item',
              qty: Number(o.qty) || 1,
              price: Number(o.effectivePrice ?? o.totalPrice) || 0,
            })),
          };
        }));
      })
      .catch((e) => {
        console.error('Analytics load error:', e);
        if (!cancelled) setError('Could not load sales data. Check your connection and try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [prevStart, reloadKey]);

  const data = useMemo(() => {
    const sold = orders.filter(isSold);
    const cur = sold.filter((o) => o.date >= start);
    const prev = sold.filter((o) => o.date < start);
    const k = summarize(cur);
    const pk = summarize(prev);

    // Returns & refunds are reported separately from sales figures.
    const lost = orders.filter((o) => !isSold(o));
    const lostCur = lost.filter((o) => o.date >= start);
    const lostAmount = lostCur.reduce((sum, o) => sum + o.total, 0);
    const lostPrevAmount = lost.filter((o) => o.date < start).reduce((sum, o) => sum + o.total, 0);
    const totalCurOrders = orders.filter((o) => o.date >= start).length;
    const lostItemMap = {};
    lostCur.forEach((o) => o.items.forEach((i) => {
      lostItemMap[i.name] = lostItemMap[i.name] || { label: i.name, value: 0, amount: 0 };
      lostItemMap[i.name].value += i.qty;
      lostItemMap[i.name].amount += i.price;
    }));
    const returns = {
      returned: lostCur.filter((o) => o.status === 'Returned').length,
      refunded: lostCur.filter((o) => o.status === 'Refunded').length,
      amount: lostAmount,
      amountChange: pctChange(lostAmount, lostPrevAmount),
      rate: totalCurOrders ? (lostCur.length / totalCurOrders) * 100 : 0,
      items: Object.values(lostItemMap).sort((a, b) => b.value - a.value).slice(0, 5),
      recent: [...lostCur].sort((a, b) => b.date - a.date).slice(0, 8),
    };

    // Trend: daily revenue (a single day compares today with yesterday).
    const trendDays = range.days === 1 ? 2 : range.days;
    const trendStart = range.days === 1 ? prevStart : start;
    const bucketSize = trendDays > 31 ? 7 : 1;
    const bucketCount = Math.ceil(trendDays / bucketSize);
    const trend = Array.from({ length: bucketCount }, (_, i) => {
      const d = new Date(trendStart);
      d.setDate(d.getDate() + i * bucketSize);
      const md = `${d.getMonth() + 1}/${d.getDate()}`;
      return { label: bucketSize === 1 && trendDays > 10 ? (i % 5 === 0 ? md : '') : md, md, value: 0 };
    });
    sold.forEach((o) => {
      if (o.date < trendStart) return;
      const idx = Math.floor((startOfDay(o.date) - trendStart) / 86400000 / bucketSize);
      if (trend[idx]) trend[idx].value += o.total;
    });
    trend.forEach((t) => { t.tip = `${t.md}: ${peso(t.value)}`; });

    // Peak hours
    const hours = Array.from({ length: 24 }, (_, h) => ({ label: h % 3 === 0 ? hourLabel(h) : '', value: 0, orders: 0, hour: h }));
    cur.forEach((o) => { hours[o.date.getHours()].value += o.total; hours[o.date.getHours()].orders += 1; });
    const peak = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);
    hours.forEach((h) => { h.highlight = peak.value > 0 && h.hour === peak.hour; h.tip = `${hourLabel(h.hour)}: ${peso(h.value)} · ${h.orders} orders`; });

    // Items
    const itemMap = {};
    cur.forEach((o) => o.items.forEach((i) => {
      itemMap[i.name] = itemMap[i.name] || { label: i.name, qty: 0, revenue: 0 };
      itemMap[i.name].qty += i.qty;
      itemMap[i.name].revenue += i.price;
    }));
    const itemList = Object.values(itemMap).map((i) => ({ ...i, value: i.qty }));
    const topItems = [...itemList].sort((a, b) => b.qty - a.qty).slice(0, 8);
    const bottomItems = [...itemList].sort((a, b) => a.qty - b.qty).slice(0, 5);

    // Payments and cashiers
    const group = (keyFn) => {
      const map = {};
      cur.forEach((o) => {
        const key = keyFn(o);
        map[key] = map[key] || { label: key, value: 0, count: 0 };
        map[key].value += o.total;
        map[key].count += 1;
      });
      return Object.values(map).sort((a, b) => b.value - a.value);
    };
    const payments = group((o) => o.payment);
    const cashiers = group((o) => o.cashier);

    // Discounts & promos
    const seniorPwd = cur.filter((o) => o.customerType === 'Senior' || o.customerType === 'PWD');
    const promoMap = {};
    cur.forEach((o) => o.promos.forEach((p) => {
      const name = p.promoName || 'Promo';
      promoMap[name] = promoMap[name] || { label: name, saved: 0, value: 0 };
      promoMap[name].saved += Number(p.savings) || 0;
      promoMap[name].value += 1;
    }));
    const promos = Object.values(promoMap).sort((a, b) => b.value - a.value).slice(0, 5);
    const withPromo = cur.filter((o) => o.promos.length > 0);
    const withoutPromo = cur.filter((o) => o.promos.length === 0);

    return {
      k, pk, trend, hours, peak, topItems, bottomItems, payments, cashiers, returns, promos,
      seniorPwdCount: seniorPwd.length,
      discountTotal: cur.reduce((sum, o) => sum + o.discount, 0),
      promoTotal: cur.reduce((sum, o) => sum + o.promoDiscount, 0),
      promoAov: summarize(withPromo).aov,
      noPromoAov: summarize(withoutPromo).aov,
      hasPromoOrders: withPromo.length > 0,
    };
  }, [orders, start, prevStart, range.days]);

  const prevLabel = range.days === 1 ? 'yesterday' : 'prev. period';
  const kpis = [
    { label: 'Revenue',         value: peso(data.k.revenue), delta: pctChange(data.k.revenue, data.pk.revenue), Icon: Banknote },
    { label: 'Orders',          value: String(data.k.count), delta: pctChange(data.k.count, data.pk.count),     Icon: Receipt },
    { label: 'Avg Order Value', value: peso(data.k.aov),     delta: pctChange(data.k.aov, data.pk.aov),         Icon: Tag },
    { label: 'Items Sold',      value: String(data.k.items), delta: pctChange(data.k.items, data.pk.items),     Icon: Coffee },
  ];

  const exportPdf = () => {
    const pdoc = new jsPDF('p', 'mm', 'a4');
    pdoc.setFontSize(18);
    pdoc.text('Sales Analytics', 14, 16);
    pdoc.setFontSize(10);
    pdoc.text(`${range.label} · ${start.toLocaleDateString('en-US')} - ${new Date().toLocaleDateString('en-US')}`, 14, 22);
    // jsPDF's built-in font has no peso sign, so the report uses "PHP".
    const money = (n) => `PHP ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const section = (title, head, body) => {
      autoTable(pdoc, {
        startY: (pdoc.lastAutoTable?.finalY ?? 22) + 8,
        head: [[title, ...head]],
        body: body.length ? body : [['No data']],
        headStyles: { fillColor: [97, 64, 51] },
        styles: { fontSize: 9 },
      });
    };
    section('Summary', ['Value'], [
      ['Revenue', money(data.k.revenue)],
      ['Orders', String(data.k.count)],
      ['Average order value', money(data.k.aov)],
      ['Items sold', String(data.k.items)],
      ['Peak hour', data.peak.value > 0 ? `${hourLabel(data.peak.hour)} (${money(data.peak.value)}, ${data.peak.orders} orders)` : '-'],
    ]);
    section('Top items', ['Qty', 'Revenue'], data.topItems.map((r) => [r.label, r.qty, money(r.revenue)]));
    section('Payment methods', ['Revenue', 'Orders'], data.payments.map((r) => [r.label, money(r.value), r.count]));
    section('Cashier performance', ['Revenue', 'Orders'], data.cashiers.map((r) => [r.label, money(r.value), r.count]));
    section('Returns & refunds', ['Value'], [
      ['Returned orders', String(data.returns.returned)],
      ['Refunded orders', String(data.returns.refunded)],
      ['Value lost', money(data.returns.amount)],
      ['Return/refund rate', `${data.returns.rate.toFixed(1)}%`],
    ]);
    section('Discounts & promotions', ['Value'], [
      [`Senior/PWD discounts (${data.seniorPwdCount} orders)`, money(data.discountTotal)],
      ['Promo savings given', money(data.promoTotal)],
    ]);
    section('Most used promos', ['Uses', 'Saved'], data.promos.map((r) => [r.label, r.value, money(r.saved)]));
    pdoc.save(`sales-analytics-${range.key}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
            <button
              onClick={exportPdf}
              disabled={loading || !!error}
              className="flex items-center gap-2 bg-[#3ca4c7] hover:bg-[#2b8aa8] disabled:opacity-50 text-white px-5 py-2 rounded-full text-lg font-medium transition-colors"
            >
              <Download size={18} /> Export PDF
            </button>
          </div>
        </div>

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
