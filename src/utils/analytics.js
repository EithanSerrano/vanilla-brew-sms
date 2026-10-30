// Shared sales-analytics helpers, used by the Analytics page and the
// "Sales Analytics" report on the Reports page.

export const peso = (n) =>
  `₱${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// jsPDF's built-in fonts have no peso sign, so PDFs use "PHP".
export const phpText = (n) =>
  `PHP ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
export const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
export const pctChange = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// Normalise a salestransaction document into the shape the analytics use.
export const toOrder = (data) => ({
  date: toDate(data.createdAt) || toDate(data.dateAndTimeStr) || new Date(),
  status: data.status || 'Completed',
  total: Number(data.totalAmount) || 0,
  payment: data.modeOfPayment || 'Cash',
  orderMode: data.orderMode || 'Take Out',
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
});

// Revenue only counts orders that were actually sold.
const isSold = (o) => o.status !== 'Returned' && o.status !== 'Refunded' && o.status !== 'Canceled';

const summarize = (orders) => {
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const items = orders.reduce((sum, o) => sum + o.items.reduce((q, i) => q + i.qty, 0), 0);
  return { revenue, count: orders.length, items, aov: orders.length ? revenue / orders.length : 0 };
};

// `orders` must cover [prevStart, end]. The current period is [start, end]
// and the previous period is [prevStart, start).
export function computeAnalytics(orders, start, end, prevStart) {
  const days = Math.round((startOfDay(end) - startOfDay(start)) / 86400000) + 1;
  const inCur = (o) => o.date >= start && o.date <= end;

  const sold = orders.filter(isSold);
  const cur = sold.filter(inCur);
  const prev = sold.filter((o) => o.date < start);
  const k = summarize(cur);
  const pk = summarize(prev);

  // Returns & refunds are reported separately from sales figures.
  const lost = orders.filter((o) => !isSold(o));
  const lostCur = lost.filter(inCur);
  const lostAmount = lostCur.reduce((sum, o) => sum + o.total, 0);
  const lostPrevAmount = lost.filter((o) => o.date < start).reduce((sum, o) => sum + o.total, 0);
  const totalCurOrders = orders.filter(inCur).length;
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

  // Trend: daily revenue (a single day compares with the day before).
  const trendDays = days === 1 ? 2 : days;
  const trendStart = days === 1 ? prevStart : start;
  const bucketSize = trendDays > 31 ? 7 : 1;
  const bucketCount = Math.ceil(trendDays / bucketSize);
  const trend = Array.from({ length: bucketCount }, (_, i) => {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i * bucketSize);
    const md = `${d.getMonth() + 1}/${d.getDate()}`;
    return { label: bucketSize === 1 && trendDays > 10 ? (i % 5 === 0 ? md : '') : md, md, value: 0 };
  });
  sold.forEach((o) => {
    if (o.date < trendStart || o.date > end) return;
    const idx = Math.floor((startOfDay(o.date) - trendStart) / 86400000 / bucketSize);
    if (trend[idx]) trend[idx].value += o.total;
  });
  trend.forEach((t) => { t.tip = `${t.md}: ${peso(t.value)}`; });

  // Peak hours
  const hours = Array.from({ length: 24 }, (_, h) => ({ label: h % 3 === 0 ? hourLabel(h) : '', value: 0, orders: 0, hour: h }));
  cur.forEach((o) => { hours[o.date.getHours()].value += o.total; hours[o.date.getHours()].orders += 1; });
  const peak = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);
  hours.forEach((h) => {
    h.highlight = peak.value > 0 && h.hour === peak.hour;
    h.tip = `${hourLabel(h.hour)}: ${peso(h.value)} · ${h.orders} orders`;
  });

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
    days, k, pk, trend, hours, peak, topItems, bottomItems, payments, cashiers, returns, promos,
    seniorPwdCount: seniorPwd.length,
    discountTotal: cur.reduce((sum, o) => sum + o.discount, 0),
    promoTotal: cur.reduce((sum, o) => sum + o.promoDiscount, 0),
    promoAov: summarize(withPromo).aov,
    noPromoAov: summarize(withoutPromo).aov,
    hasPromoOrders: withPromo.length > 0,
  };
}
