import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { saveTransaction, formatTransactionDate } from './transactionHelpers';
import { usableBatchOrder } from './supply';
import { syncMenuAvailability, variantsOf, variantName } from './menuAvailability';

async function deductInventoryForSale(sale) {
  // Re-read the sale: it may have been canceled (here or on the POS) since the snapshot fired.
  const fresh = await getDoc(doc(db, 'salestransaction', sale.id));
  if (!fresh.exists() || fresh.data().status === 'Canceled' || fresh.data().stockDeducted === true) return [];

  const [menuSnap, ingSnap, matSnap] = await Promise.all([
    getDocs(collection(db, 'menuItems')),
    getDocs(collection(db, 'ingredients')),
    getDocs(collection(db, 'materials')),
  ]);

  const menuItems   = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const ingredients = ingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const materials   = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const deductions = [];

  for (const order of (sale.orders || [])) {
    const qty = Number(order.qty) || 1;

    const menuItem = menuItems.find(m => m.name === order.name && m.isActive !== false);
    if (!menuItem) continue;

    // Deduct base size connections
    const sizeConfig = variantsOf(menuItem).find(v => variantName(v) === order.size);
    if (sizeConfig) {
      for (const conn of (sizeConfig.connections || [])) {
        const totalDeduct = (conn.amount || 0) * qty;
        if (totalDeduct <= 0) continue;
        await applyDeduction(conn, totalDeduct, ingredients, materials, deductions);
      }
    }

    // Deduct add-on ingredients
    if (order.addons && menuItem.addOns?.length) {
      const addonNames = order.addons.split(',').map(s => s.trim().toLowerCase());
      for (const addon of menuItem.addOns) {
        if (!addonNames.includes((addon.name || '').toLowerCase())) continue;
        const totalDeduct = (addon.amount || 0) * qty;
        if (totalDeduct <= 0) continue;
        const fakeConn = { type: 'ingredient', refId: addon.ingredientId, name: addon.name, amount: addon.amount, unit: addon.unit };
        await applyDeduction(fakeConn, totalDeduct, ingredients, materials, deductions);
      }
    }
  }

  // Mark sale as stock-processed to prevent double-deduction
  // Keep the per-batch breakdown so a canceled order can put the stock back where it came from.
  await updateDoc(doc(db, 'salestransaction', sale.id), { stockDeducted: true, stockDeductions: deductions });

  // Canceled while the deduction was running: that cancel saw no deduction record and
  // restored nothing, so put the stock back now.
  const after = await getDoc(doc(db, 'salestransaction', sale.id));
  if (after.exists() && after.data().status === 'Canceled' && after.data().stockRestored !== true) {
    await restoreInventoryForSale({ ...sale, stockDeductions: deductions });
    await updateDoc(doc(db, 'salestransaction', sale.id), { stockRestored: true });
    return [];
  }

  if (deductions.length > 0) {
    const summary = deductions
      .map(d => `${d.name} -${d.deducted}${d.unit ? ' ' + d.unit : ''}`)
      .join(', ');

    await saveTransaction('SLS', {
      type: 'Sales',
      action: 'StockDeducted',
      saleId: sale.id,
      transactionNumber: sale.transactionNumber || sale.id,
      deductions,
      summary: `Stock deducted for sale ${sale.transactionNumber || sale.id}: ${summary}`,
      date: formatTransactionDate(),
    });
  }

  await syncMenuAvailability();
  return deductions;
}

async function applyDeduction(conn, totalDeduct, ingredients, materials, deductions) {
  if (conn.type === 'ingredient') {
    const ing = ingredients.find(i => i.id === conn.refId);
    if (!ing) return;

    // Earliest expiry first; expired batches are never drawn from.
    let remaining = totalDeduct;
    const batches = (ing.batches || []).map(b => ({ ...b }));
    const taken = [];
    for (const i of usableBatchOrder(batches)) {
      if (remaining <= 0) break;
      const batch = batches[i];
      const take = Math.min(batch.quantity || 0, remaining);
      if (take <= 0) continue;
      batch.quantity -= take;
      remaining -= take;
      taken.push({ batchId: batch.batchId || null, quantity: take });
    }

    await updateDoc(doc(db, 'ingredients', ing.id), { batches, lastUpdated: new Date() });
    deductions.push({ type: 'ingredient', refId: ing.id, name: conn.name || ing.name, deducted: totalDeduct, unit: conn.unit || ing.unit || '', batches: taken });

  } else if (conn.type === 'material') {
    const mat = materials.find(m => m.id === conn.refId);
    if (!mat) return;

    const newStock = Math.max(0, (mat.stock ?? 0) - totalDeduct);
    await updateDoc(doc(db, 'materials', mat.id), { stock: newStock, lastUpdated: new Date() });
    deductions.push({ type: 'material', refId: mat.id, name: conn.name || mat.name, deducted: totalDeduct, taken: (mat.stock ?? 0) - newStock, unit: conn.unit || 'units' });
  }
}

// Put the stock of a sale back into the batches it was taken from.
async function restoreInventoryForSale(sale) {
  const restored = [];
  for (const d of (sale.stockDeductions || [])) {
    if (d.type === 'ingredient') {
      const ref = doc(db, 'ingredients', d.refId);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;
      const batches = (snap.data().batches || []).map(b => ({ ...b }));
      for (const taken of (d.batches || [])) {
        const batch = batches.find(b => b.batchId && b.batchId === taken.batchId);
        if (batch) batch.quantity = (batch.quantity || 0) + taken.quantity;
        else if (batches.length) batches[0].quantity = (batches[0].quantity || 0) + taken.quantity;
      }
      await updateDoc(ref, { batches, lastUpdated: new Date() });
      restored.push({ name: d.name, restored: d.deducted, unit: d.unit });
    } else if (d.type === 'material') {
      const ref = doc(db, 'materials', d.refId);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;
      const back = d.taken ?? d.deducted;
      await updateDoc(ref, { stock: (snap.data().stock ?? 0) + back, lastUpdated: new Date() });
      restored.push({ name: d.name, restored: back, unit: d.unit });
    }
  }
  return restored;
}

// Cancel an Ongoing order: mark it Canceled with a reason and return its stock.
// Returns { restored, stockRestored } where stockRestored is false when the sale has no
// deduction record (stock was never taken, or the sale predates the record).
export async function cancelOngoingSale(saleId, { reason, canceledBy }) {
  const ref = doc(db, 'salestransaction', saleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found.');
  const sale = { id: snap.id, ...snap.data() };
  if (sale.status !== 'Ongoing') throw new Error('Only Ongoing orders can be canceled.');

  const hasRecord = Array.isArray(sale.stockDeductions) && sale.stockDeductions.length > 0;
  const restored = hasRecord ? await restoreInventoryForSale(sale) : [];

  await updateDoc(ref, {
    status: 'Canceled',
    cancelReason: reason,
    canceledBy,
    canceledAt: new Date(),
    stockRestored: hasRecord,
    // No deduction yet (the SMS was closed when the order came in): make sure it never happens.
    ...(hasRecord ? {} : { stockDeducted: true }),
  });

  await syncMenuAvailability();

  const number = sale.transactionNumber || sale.id;
  const summary = restored.map(r => `${r.name} +${r.restored}${r.unit ? ' ' + r.unit : ''}`).join(', ');
  await saveTransaction('SLS', {
    type: 'Sales',
    action: 'OrderCanceled',
    saleId: sale.id,
    transactionNumber: number,
    reason,
    canceledBy,
    restored,
    summary: `Order ${number} canceled by ${canceledBy} (${reason}).${summary ? ` Stock restored: ${summary}` : ''}`,
    date: formatTransactionDate(),
  });

  return { restored, stockRestored: hasRecord };
}

// Call this once when the app starts. Returns an unsubscribe function.
export function startSalesInventoryListener() {
  const unsubscribe = onSnapshot(
    collection(db, 'salestransaction'),
    async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const sale = { id: change.doc.id, ...change.doc.data() };
        if (sale.stockDeducted === true || sale.status === 'Canceled') continue;

        try {
          await deductInventoryForSale(sale);
        } catch (err) {
          console.error(`Inventory deduction failed for sale ${sale.id}:`, err);
        }
      }
    },
    (err) => console.error('Sales inventory listener error:', err)
  );

  return unsubscribe;
}
