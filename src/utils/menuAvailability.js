import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { usableStock, batchExpiry, daysUntilExpiry, EXPIRING_DAYS, toDate } from './supply';

// A product is "available" while its ingredients and materials can still make a serving.
// `isAvailable` is the flag the POS reads. This module sets it automatically and marks
// those changes with `autoUnavailable`, so a manual "Mark as Unavailable" is never undone.

export const LOW_SERVINGS = 5;
const FAST_DAYS_LEFT = 3;
const DAY_MS = 86400000;

export const variantsOf = (item) => item.variants || item.sizes || [];
export const variantName = (v) => v.name ?? v.size;

// Servings left for one size, limited by its scarcest connection. Infinity = no limit known.
function variantServings(variant, ingredients, materials) {
  let least = Infinity;
  for (const conn of (variant.connections || [])) {
    const amount = Number(conn.amount) || 0;
    if (amount <= 0) continue;
    let available = null;
    if (conn.type === 'ingredient') {
      const ing = ingredients.find(i => i.id === conn.refId);
      if (ing) available = usableStock(ing);
    } else {
      const mat = materials.find(m => m.id === conn.refId);
      if (mat) available = mat.stock ?? 0;
    }
    if (available == null) continue;
    least = Math.min(least, Math.floor(available / amount));
  }
  return least;
}

// Servings the product can still make (best size), or null when nothing limits it.
export function computeServings(item, ingredients, materials) {
  const variants = variantsOf(item);
  if (!variants.length) return null;
  let best = 0;
  for (const v of variants) {
    const s = variantServings(v, ingredients, materials);
    if (s === Infinity) return null;
    best = Math.max(best, s);
  }
  return best;
}

const COUNTED = (sale) => !['Canceled', 'Returned', 'Refunded'].includes(sale.status);

// Units sold per product name over the last `days` days.
export function salesRates(sales, days = 7) {
  const since = Date.now() - days * DAY_MS;
  const sold = {};
  let earliest = Date.now();
  for (const sale of sales) {
    if (!COUNTED(sale)) continue;
    const when = toDate(sale.createdAt) || (sale.dateAndTimeStr ? new Date(sale.dateAndTimeStr) : null);
    if (!when || isNaN(when.getTime()) || when.getTime() < since) continue;
    earliest = Math.min(earliest, when.getTime());
    for (const o of (sale.orders || [])) {
      const name = o.name || 'Unknown';
      sold[name] = (sold[name] || 0) + (Number(o.qty) || 1);
    }
  }
  const spanDays = Math.min(days, Math.max(1, Math.ceil((Date.now() - earliest) / DAY_MS)));
  return { sold, spanDays };
}

// Per-product availability and sell-through, for the Dashboard.
export function menuInsights({ menuItems, ingredients, materials, sales }) {
  const { sold, spanDays } = salesRates(sales);
  return menuItems
    .filter(m => m.isActive !== false)
    .map(item => {
      const servings = computeServings(item, ingredients, materials);
      const qty = sold[item.name] || 0;
      const perDay = qty / spanDays;
      const daysLeft = servings != null && perDay > 0 ? servings / perDay : null;
      const soldOut = item.autoUnavailable === true || servings === 0;
      const low = !soldOut && servings != null && servings < LOW_SERVINGS;
      return {
        item, servings, sold: qty, perDay, daysLeft, soldOut, low,
        fast: daysLeft != null && daysLeft < FAST_DAYS_LEFT,
      };
    });
}

// Products that use an ingredient expiring soon: worth pushing before it goes to waste.
export function moveSoonItems(menuItems, ingredients) {
  const soon = [];
  for (const ing of ingredients) {
    if (ing.isActive === false || ing.archived === true) continue;
    const batch = (ing.batches || [])
      .filter(b => (b.quantity || 0) > 0 && batchExpiry(b))
      .map(b => ({ b, days: daysUntilExpiry(b) }))
      .filter(x => x.days >= 0 && x.days <= EXPIRING_DAYS)
      .sort((x, y) => x.days - y.days)[0];
    if (batch) soon.push({ ing, days: batch.days, qty: batch.b.quantity });
  }
  const rows = [];
  for (const m of menuItems) {
    if (m.isActive === false || m.isAvailable === false) continue;
    const uses = soon.filter(s => variantsOf(m).some(v => (v.connections || []).some(c => c.refId === s.ing.id)));
    if (!uses.length) continue;
    const worst = uses.reduce((a, b) => (a.days <= b.days ? a : b));
    rows.push({ item: m, ingredient: worst.ing.name, days: worst.days, qty: worst.qty, unit: worst.ing.unit || 'units' });
  }
  return rows.sort((a, b) => a.days - b.days);
}

let syncing = false;

// Brings every product's `isAvailable` and `servingsLeft` in line with current stock.
// Safe to call often: it only writes products whose values changed.
export async function syncMenuAvailability(preloaded = {}) {
  if (syncing) return 0;
  syncing = true;
  try {
    const read = async (name, given) =>
      given || (await getDocs(collection(db, name))).docs.map(d => ({ id: d.id, ...d.data() }));
    const [menuItems, ingredients, materials] = await Promise.all([
      read('menuItems', preloaded.menuItems), read('ingredients', preloaded.ingredients), read('materials', preloaded.materials),
    ]);
    let changed = 0;
    for (const item of menuItems) {
      if (item.isActive === false) continue;
      const servings = computeServings(item, ingredients, materials);
      const patch = {};
      if ((item.servingsLeft ?? null) !== servings) patch.servingsLeft = servings;
      if (servings === 0 && item.isAvailable !== false) {
        patch.isAvailable = false;
        patch.autoUnavailable = true;
      } else if ((servings === null || servings > 0) && item.autoUnavailable === true) {
        patch.isAvailable = true;
        patch.autoUnavailable = false;
      }
      if (!Object.keys(patch).length) continue;
      try {
        await updateDoc(doc(db, 'menuItems', item.id), patch);
        changed += 1;
      } catch (err) {
        console.error(`Availability sync failed for ${item.name}:`, err);
      }
    }
    return changed;
  } catch (err) {
    console.error('Availability sync error:', err);
    return 0;
  } finally {
    syncing = false;
  }
}
