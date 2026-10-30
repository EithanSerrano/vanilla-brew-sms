import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const EXPIRING_DAYS = 7;
export const WASTE_REASONS = ['Expired', 'Spoiled', 'Spilled', 'Damaged', 'Contaminated', 'Other'];

const DAY_MS = 86400000;

export const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// 'YYYY-MM-DD' for a date input, `days` after today.
export const addDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const batchExpiry = (batch) => {
  const d = toDate(batch?.expirationDate);
  return d && !isNaN(d.getTime()) ? d : null;
};

// Whole days from today until the batch expires (negative once expired); null without a date.
export const daysUntilExpiry = (batch) => {
  const e = batchExpiry(batch);
  if (!e) return null;
  const end = new Date(e);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - startOfToday()) / DAY_MS);
};

export const isExpiredBatch = (batch) => {
  const days = daysUntilExpiry(batch);
  return days !== null && days < 0;
};

// Sellable stock: batches that have not expired.
export const usableStock = (ingredient) =>
  (ingredient.batches || []).reduce((sum, b) => (isExpiredBatch(b) ? sum : sum + (b.quantity || 0)), 0);

// Indexes of the batches to draw from, earliest expiry first, expired ones excluded.
export const usableBatchOrder = (batches) =>
  batches
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => (b.quantity || 0) > 0 && !isExpiredBatch(b))
    .sort((x, y) => {
      const ex = batchExpiry(x.b)?.getTime() ?? Infinity;
      const ey = batchExpiry(y.b)?.getTime() ?? Infinity;
      return ex - ey || x.i - y.i;
    })
    .map(({ i }) => i);

const currentUserName = () => {
  const s = JSON.parse(localStorage.getItem('sessionUser') || '{}');
  return s.name || s.email || 'Unknown';
};

// One entry per delivery: a new ingredient batch or a material resupply.
export async function logRestock(entry) {
  try {
    const quantity = Number(entry.quantity) || 0;
    const unitCost = entry.unitCost === '' || entry.unitCost == null ? null : Number(entry.unitCost);
    await addDoc(collection(db, 'restocklog'), {
      itemType: entry.itemType,
      refId: entry.refId,
      displayId: entry.displayId || '',
      name: entry.name,
      unit: entry.unit || 'units',
      batchId: entry.batchId || null,
      expirationDate: entry.expirationDate || null,
      quantity,
      supplier: (entry.supplier || '').trim(),
      unitCost,
      totalCost: unitCost == null ? null : Math.round(unitCost * quantity * 100) / 100,
      receivedBy: currentUserName(),
      receivedAt: new Date(),
    });
  } catch (err) {
    console.error('Restock log error:', err);
  }
}

export async function logWastage(entry) {
  const quantity = Number(entry.quantity) || 0;
  const unitCost = entry.unitCost == null ? null : Number(entry.unitCost);
  await addDoc(collection(db, 'wastage'), {
    itemType: entry.itemType,
    refId: entry.refId,
    displayId: entry.displayId || '',
    name: entry.name,
    unit: entry.unit || 'units',
    batchId: entry.batchId || null,
    quantity,
    reason: entry.reason,
    note: (entry.note || '').trim(),
    cost: unitCost == null ? null : Math.round(unitCost * quantity * 100) / 100,
    disposedBy: currentUserName(),
    disposedAt: new Date(),
  });
}
