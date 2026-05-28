import { collection, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { saveTransaction, formatTransactionDate } from './transactionHelpers';

async function deductInventoryForSale(sale) {
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
    const sizeConfig = (menuItem.sizes || []).find(s => s.size === order.size);
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
  await updateDoc(doc(db, 'salestransaction', sale.id), { stockDeducted: true });

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

  return deductions;
}

async function applyDeduction(conn, totalDeduct, ingredients, materials, deductions) {
  if (conn.type === 'ingredient') {
    const ing = ingredients.find(i => i.id === conn.refId);
    if (!ing) return;

    // FIFO: deduct from earliest batch first
    let remaining = totalDeduct;
    const batches = (ing.batches || []).map(b => ({ ...b }));
    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity || 0, remaining);
      batch.quantity -= take;
      remaining -= take;
    }

    await updateDoc(doc(db, 'ingredients', ing.id), { batches, lastUpdated: new Date() });
    deductions.push({ type: 'ingredient', name: conn.name || ing.name, deducted: totalDeduct, unit: conn.unit || ing.unit || '' });

  } else if (conn.type === 'material') {
    const mat = materials.find(m => m.id === conn.refId);
    if (!mat) return;

    const newStock = Math.max(0, (mat.stock ?? 0) - totalDeduct);
    await updateDoc(doc(db, 'materials', mat.id), { stock: newStock, lastUpdated: new Date() });
    deductions.push({ type: 'material', name: conn.name || mat.name, deducted: totalDeduct, unit: conn.unit || 'units' });
  }
}

// Call this once when the app starts. Returns an unsubscribe function.
export function startSalesInventoryListener() {
  const unsubscribe = onSnapshot(
    collection(db, 'salestransaction'),
    async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const sale = { id: change.doc.id, ...change.doc.data() };
        if (sale.stockDeducted === true) continue;

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
