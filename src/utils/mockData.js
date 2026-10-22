// Development-only mock sales data for the Analytics page.
// Every generated order is tagged isMock: true and stockDeducted: true, so it can be
// removed again with removeMockOrders() and never triggers inventory deduction.

import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const FALLBACK_MENU = [
  { name: 'Latte',      variants: [{ size: 'Regular', price: 89 },  { size: 'Large', price: 109 }] },
  { name: 'Americano',  variants: [{ size: 'Regular', price: 75 },  { size: 'Large', price: 95 }] },
  { name: 'Cappuccino', variants: [{ size: 'Regular', price: 95 },  { size: 'Large', price: 115 }] },
  { name: 'Matcha',     variants: [{ size: 'Regular', price: 110 }, { size: 'Large', price: 130 }] },
  { name: 'Mocha',      variants: [{ size: 'Regular', price: 105 }, { size: 'Large', price: 125 }] },
  { name: 'Croissant',  variants: [{ size: 'Regular', price: 70 }] },
  { name: 'Cookie',     variants: [{ size: 'Regular', price: 55 }] },
];

const FALLBACK_CASHIERS = ['Mock Cashier A', 'Mock Cashier B', 'Mock Cashier C'];

const PAYMENTS = [
  ['Cash', 60], ['E-Wallet - GCash', 24], ['E-Wallet - Maya', 6], ['Bank - GoTyme', 4], ['Bank - BDO', 3],
];
const ORDER_MODES = [['Take Out', 82], ['For Delivery - GrabFood', 10], ['For Delivery - Foodpanda', 8]];
const CUSTOMER_TYPES = [['Regular', 87], ['Senior', 8], ['PWD', 5]];
const HOUR_WEIGHTS = { 7: 2, 8: 5, 9: 6, 10: 4, 11: 5, 12: 9, 13: 8, 14: 5, 15: 5, 16: 6, 17: 9, 18: 10, 19: 7, 20: 4, 21: 2 };

// Small seeded RNG so regenerated data looks the same each time.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickWeighted = (rand, pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of pairs) { r -= w; if (r <= 0) return value; }
  return pairs[pairs.length - 1][0];
};
const round2 = (n) => Math.round(n * 100) / 100;

export function generateMockOrders({ menu, cashiers, promoNames, days = 90, now = new Date() }) {
  const rand = mulberry32(20260101);
  const items = menu.length >= 3 ? menu : FALLBACK_MENU;
  const staff = cashiers.length ? cashiers : FALLBACK_CASHIERS;
  const promos = promoNames.length ? promoNames : ['Mock Promo'];
  // Popularity: earlier items in the list sell more.
  const itemWeights = items.map((it, i) => [it, Math.max(1, items.length - i) ** 1.3]);
  const cashierWeights = staff.map((c, i) => [c, i === 0 ? 40 : 30]);
  const hourWeights = Object.entries(HOUR_WEIGHTS).map(([h, w]) => [Number(h), w]);

  const orders = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - d);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const growth = 0.8 + 0.35 * ((days - 1 - d) / (days - 1));
    let count = Math.round(28 * growth * (weekend ? 1.25 : 1) * (0.75 + rand() * 0.5));
    if (d === 0) count = Math.round(count * Math.min(1, now.getHours() / 22));

    const times = [];
    for (let i = 0; i < count; i++) {
      const hour = pickWeighted(rand, hourWeights);
      const t = new Date(day);
      t.setHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
      if (t <= now) times.push(t);
    }
    times.sort((a, b) => a - b);

    const yy = String(day.getFullYear()).slice(-2);
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');

    times.forEach((createdAt, idx) => {
      const lines = 1 + Math.floor(rand() * 3 + (rand() < 0.25 ? 1 : 0));
      const cart = [];
      for (let l = 0; l < lines; l++) {
        const item = pickWeighted(rand, itemWeights);
        const variant = item.variants[Math.floor(rand() * item.variants.length)];
        const qty = rand() < 0.8 ? 1 : 2;
        cart.push({ name: item.name, size: variant.size, qty, addons: '', totalPrice: round2(variant.price * qty), effectivePrice: round2(variant.price * qty) });
      }
      const subTotal = round2(cart.reduce((s, c) => s + c.totalPrice, 0));

      const customerType = pickWeighted(rand, CUSTOMER_TYPES);
      const discountAmount = customerType === 'Regular' ? 0 : round2(subTotal - (subTotal / 1.12) * 0.8);

      const appliedPromotions = [];
      let promoDiscountAmount = 0;
      if (rand() < 0.14) {
        promoDiscountAmount = round2(Math.min(subTotal, cart[0].totalPrice) * 0.1);
        appliedPromotions.push({ promoName: pickWeighted(rand, promos.map((p, i) => [p, i === 0 ? 50 : 30])), savings: promoDiscountAmount });
        cart[0].effectivePrice = round2(cart[0].totalPrice - promoDiscountAmount);
      }

      const status = (() => {
        const r = rand();
        return r < 0.035 ? 'Returned' : r < 0.05 ? 'Refunded' : 'Completed';
      })();
      const payment = pickWeighted(rand, PAYMENTS);
      const totalAmount = round2(Math.max(0, subTotal - discountAmount - promoDiscountAmount));
      const seq = String(idx + 1).padStart(4, '0');

      orders.push({
        id: `MOCK-${mm}${dd}${yy}-${seq}`,
        data: {
          transactionNumber: `MOCK-${mm}${dd}${yy}-${seq}`,
          customerName: '',
          customerType,
          orders: cart,
          orderMode: pickWeighted(rand, ORDER_MODES),
          modeOfPayment: payment,
          dateAndTimeStr: createdAt.toLocaleString('en-US'),
          createdAt,
          subTotal,
          discountAmount,
          promoDiscountAmount,
          appliedPromotions,
          totalAmount,
          ...(payment === 'Cash' && { cashTendered: Math.ceil(totalAmount / 50) * 50, changeGiven: round2(Math.ceil(totalAmount / 50) * 50 - totalAmount) }),
          cashierName: pickWeighted(rand, cashierWeights),
          cashierUid: null,
          status,
          stockDeducted: true,
          isMock: true,
        },
      });
    });
  }
  return orders;
}

// Pull real menu items, staff names and promo names so the data matches the shop.
async function loadReferenceData() {
  const [menuSnap, userSnap, promoSnap] = await Promise.all([
    getDocs(collection(db, 'menuItems')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'promotions')),
  ]);
  const menu = menuSnap.docs
    .map((d) => d.data())
    .filter((m) => m.name && m.isActive !== false)
    .map((m) => ({
      name: m.name,
      variants: (m.variants || m.sizes || [])
        .map((v) => ({ size: v.name ?? v.size ?? 'Regular', price: Number(v.price) || 0 }))
        .filter((v) => v.price > 0),
    }))
    .filter((m) => m.variants.length > 0);
  const cashiers = userSnap.docs
    .map((d) => d.data())
    .filter((u) => u.status !== 'Inactive' && u.name && (u.role === 'staff' || u.role === 'manager'))
    .map((u) => u.name);
  const promoNames = promoSnap.docs.map((d) => d.data()).filter((p) => p.isActive !== false && p.name).map((p) => p.name);
  return { menu, cashiers, promoNames };
}

const commitInBatches = async (ops) => {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
};

export async function seedMockOrders(days = 90) {
  const ref = await loadReferenceData();
  const orders = generateMockOrders({ ...ref, days });
  await commitInBatches(orders.map((o) => (batch) => batch.set(doc(db, 'salestransaction', o.id), o.data)));
  return orders.length;
}

export async function countMockOrders() {
  const snap = await getDocs(query(collection(db, 'salestransaction'), where('isMock', '==', true)));
  return snap.size;
}

export async function removeMockOrders() {
  const snap = await getDocs(query(collection(db, 'salestransaction'), where('isMock', '==', true)));
  await commitInBatches(snap.docs.map((d) => (batch) => batch.delete(d.ref)));
  return snap.size;
}
