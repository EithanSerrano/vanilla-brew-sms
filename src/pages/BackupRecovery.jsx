import { useState, useRef } from 'react';
import {
  collection, getDocs, addDoc, doc, getDoc, query, orderBy,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Download, Upload, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, FileText, Shield,
} from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

// ── CSV helpers ────────────────────────────────────────────────────────────────

const META_START = '##BACKUP_METADATA';
const META_END   = '##END_METADATA';
const SEC_END    = '##END_SECTION';
const secStart   = (name) => `##SECTION:${name}`;

function esc(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}
const row = (...cells) => cells.map(esc).join(',');

function parseCSVRow(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseBackupCSV(text) {
  const lines = text.split(/\r?\n/);
  const result = { metadata: {}, sections: {} };
  let mode = null; let section = null; let headers = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === META_START)          { mode = 'meta'; continue; }
    if (line === META_END)            { mode = null; continue; }
    if (line.startsWith('##SECTION:')) {
      section = line.replace('##SECTION:', '');
      result.sections[section] = [];
      headers = null; mode = 'section'; continue;
    }
    if (line === SEC_END) { mode = null; section = null; headers = null; continue; }

    if (mode === 'meta') {
      const [k, ...v] = line.split(',');
      result.metadata[k.trim()] = v.join(',').trim();
    } else if (mode === 'section' && section) {
      const cells = parseCSVRow(line);
      if (!headers) { headers = cells; continue; }
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
      result.sections[section].push(obj);
    }
  }
  return result;
}

// ── Main Component ─────────────────────────────────────────────────────────────

const AUDIT_LABELS = {
  ADD_MATERIAL: 'Add Material', ADD_INGREDIENT: 'Add Ingredient',
  HIDE: 'Hide Item', RETRIEVE: 'Retrieve Item', RESUPPLY: 'Resupply',
  ADJUST: 'Adjust Stock', EDIT: 'Edit Item',
  CREATE_ACCOUNT: 'Create Account', DEACTIVATE_ACCOUNT: 'Deactivate Account',
  REACTIVATE_ACCOUNT: 'Reactivate Account', EDIT_ACCOUNT: 'Edit Account',
};

const SECTION_LABELS = {
  SALES_TRANSACTIONS: 'Sales Transactions',
  MATERIALS: 'Materials',
  INGREDIENTS: 'Ingredients',
  AUDIT_LOGS: 'Audit Logs',
  GENERATED_DOCUMENTS: 'Generated Documents',
};

function defaultFrom() {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function BackupRecovery() {
  const [tab, setTab] = useState('backup');

  // Backup
  const [dateFrom,    setDateFrom]    = useState(defaultFrom);
  const [dateTo,      setDateTo]      = useState(() => new Date().toISOString().slice(0, 10));
  const [inclSales,   setInclSales]   = useState(true);
  const [inclInv,     setInclInv]     = useState(true);
  const [inclAudit,   setInclAudit]   = useState(true);
  const [inclDocs,    setInclDocs]    = useState(true);
  const [generating,  setGenerating]  = useState(false);

  // Recovery
  const [parsedBackup,    setParsedBackup]    = useState(null);
  const [checkResults,    setCheckResults]    = useState(null);
  const [checking,        setChecking]        = useState(false);
  const [restoring,       setRestoring]       = useState(false);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const [fileName,        setFileName]        = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileRef = useRef(null);

  const getUser = async () => {
    const u = auth.currentUser;
    if (!u) return 'Unknown';
    const snap = await getDoc(doc(db, 'users', u.uid));
    return snap.exists() ? (snap.data().name || 'Unknown') : 'Unknown';
  };

  // ── Generate backup CSV ────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const by    = await getUser();
      const now   = new Date();
      const start = new Date(dateFrom + 'T00:00:00');
      const end   = new Date(dateTo   + 'T23:59:59');
      const lines = [];

      lines.push(META_START);
      lines.push(row('system',       'Vanilla Brew Shop Management System'));
      lines.push(row('backup_date',  now.toLocaleDateString('en-US') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })));
      lines.push(row('generated_by', by));
      lines.push(row('date_from',    dateFrom));
      lines.push(row('date_to',      dateTo));
      lines.push(META_END);
      lines.push('');

      // Sales Transactions
      if (inclSales) {
        const snap = await getDocs(collection(db, 'salestransaction'));
        const rows = snap.docs
          .map(dc => ({ _id: dc.id, ...dc.data() }))
          .filter(s => {
            const d = s.createdAt?.toDate?.() || (s.dateAndTimeStr ? new Date(s.dateAndTimeStr) : null);
            return d && d >= start && d <= end;
          })
          .sort((a, b) => {
            const da = a.createdAt?.toDate?.() || new Date(a.dateAndTimeStr || 0);
            const db2 = b.createdAt?.toDate?.() || new Date(b.dateAndTimeStr || 0);
            return da - db2;
          });

        lines.push(secStart('SALES_TRANSACTIONS'));
        lines.push(row('transaction_number', 'firestore_id', 'date', 'time', 'order_mode', 'payment_method', 'total_amount', 'items'));
        for (const s of rows) {
          const d = s.createdAt?.toDate?.() || (s.dateAndTimeStr ? new Date(s.dateAndTimeStr) : new Date());
          lines.push(row(
            s.transactionNumber || s._id, s._id,
            d.toLocaleDateString('en-US'),
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            s.orderMode || '', s.modeOfPayment || '',
            Number(s.totalAmount || 0).toFixed(2),
            (s.orders || []).map(o => `${o.qty || 1}x ${o.name || ''}`).join(' | '),
          ));
        }
        lines.push(SEC_END);
        lines.push('');
      }

      // Inventory snapshot
      if (inclInv) {
        const [matSnap, ingSnap] = await Promise.all([
          getDocs(collection(db, 'materials')),
          getDocs(collection(db, 'ingredients')),
        ]);

        lines.push(secStart('MATERIALS'));
        lines.push(row('material_id', 'firestore_id', 'name', 'size', 'stock', 'max_limit', 'is_active'));
        for (const dc of matSnap.docs) {
          const m = { _id: dc.id, ...dc.data() };
          lines.push(row(m.materialId || m._id, m._id, m.name || '', m.size || '', m.stock ?? 0, m.maxLimit || '', m.isActive !== false ? 'true' : 'false'));
        }
        lines.push(SEC_END);
        lines.push('');

        lines.push(secStart('INGREDIENTS'));
        lines.push(row('ingredient_id', 'firestore_id', 'name', 'type', 'unit', 'total_stock', 'max_limit', 'is_active'));
        for (const dc of ingSnap.docs) {
          const i = { _id: dc.id, ...dc.data() };
          const total = (i.batches || []).reduce((s, b) => s + (b.quantity || 0), 0);
          lines.push(row(i.ingredientId || i._id, i._id, i.name || '', i.type || '', i.unit || '', total, i.maxLimit || '', (i.isActive !== false && !i.archived) ? 'true' : 'false'));
        }
        lines.push(SEC_END);
        lines.push('');
      }

      // Audit Logs
      if (inclAudit) {
        const snap = await getDocs(query(collection(db, 'auditlog'), orderBy('timestamp', 'asc')));
        const rows = snap.docs
          .map(dc => ({ _id: dc.id, ...dc.data() }))
          .filter(l => {
            const d = l.timestamp?.toDate?.() || (l.timestamp ? new Date(l.timestamp) : null);
            return d && d >= start && d <= end;
          });

        lines.push(secStart('AUDIT_LOGS'));
        lines.push(row('firestore_id', 'timestamp', 'action', 'item_type', 'item_name', 'performed_by'));
        for (const l of rows) {
          const d = l.timestamp?.toDate?.() || new Date();
          lines.push(row(
            l._id,
            d.toLocaleDateString('en-US') + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            AUDIT_LABELS[l.action] || l.action || '',
            l.itemType || '', l.itemName || '', l.performedBy || '',
          ));
        }
        lines.push(SEC_END);
        lines.push('');
      }

      // Generated Documents
      if (inclDocs) {
        const snap = await getDocs(query(collection(db, 'generateddocuments'), orderBy('generatedAt', 'desc')));
        lines.push(secStart('GENERATED_DOCUMENTS'));
        lines.push(row('document_id', 'firestore_id', 'document_type', 'generated_by', 'generated_at', 'date_from', 'date_to'));
        for (const dc of snap.docs) {
          const d = { _id: dc.id, ...dc.data() };
          const at = d.generatedAt?.toDate?.() || new Date();
          lines.push(row(
            d.documentId || '', d._id, d.documentType || '', d.generatedBy || '',
            at.toLocaleDateString('en-US') + ' ' + at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            d.dateFrom || '', d.dateTo || '',
          ));
        }
        lines.push(SEC_END);
      }

      const csv  = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `VNLBrew_Backup_${dateFrom}_${dateTo}.csv`.replace(/-/g, '');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup error:', err);
    } finally {
      setGenerating(false);
    }
  };

  // ── Parse uploaded file ────────────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setCheckResults(null);
    setRestoreComplete(false);
    const reader = new FileReader();
    reader.onload = (ev) => setParsedBackup(parseBackupCSV(ev.target.result));
    reader.readAsText(file);
  };

  // ── Integrity check ────────────────────────────────────────────────────────

  const handleCheck = async () => {
    if (!parsedBackup) return;
    setChecking(true);
    setRestoreComplete(false);
    try {
      const results = {};
      const { sections } = parsedBackup;

      if (sections.SALES_TRANSACTIONS) {
        const snap = await getDocs(collection(db, 'salestransaction'));
        const fsMap = {};
        snap.docs.forEach(dc => {
          const d = dc.data();
          fsMap[d.transactionNumber || dc.id] = { ...d, _docId: dc.id };
        });
        const missing = []; const inconsistent = []; let matched = 0;
        for (const r of sections.SALES_TRANSACTIONS) {
          const fs = fsMap[r.transaction_number];
          if (!fs) { missing.push(r); }
          else if (parseFloat(r.total_amount || 0).toFixed(2) !== Number(fs.totalAmount || 0).toFixed(2)) {
            inconsistent.push({ backup: r, firestore: fs });
          } else { matched++; }
        }
        results.SALES_TRANSACTIONS = { total: sections.SALES_TRANSACTIONS.length, matched, missing, inconsistent };
      }

      if (sections.MATERIALS) {
        const snap = await getDocs(collection(db, 'materials'));
        const fsMap = {};
        snap.docs.forEach(dc => { const d = dc.data(); fsMap[d.materialId || dc.id] = { ...d, _docId: dc.id }; });
        const missing = []; const inconsistent = []; let matched = 0;
        for (const r of sections.MATERIALS) {
          const fs = fsMap[r.material_id];
          if (!fs) { missing.push(r); }
          else if ((fs.name || '') !== (r.name || '')) { inconsistent.push({ backup: r, firestore: fs }); }
          else { matched++; }
        }
        results.MATERIALS = { total: sections.MATERIALS.length, matched, missing, inconsistent };
      }

      if (sections.INGREDIENTS) {
        const snap = await getDocs(collection(db, 'ingredients'));
        const fsMap = {};
        snap.docs.forEach(dc => { const d = dc.data(); fsMap[d.ingredientId || dc.id] = { ...d, _docId: dc.id }; });
        const missing = []; const inconsistent = []; let matched = 0;
        for (const r of sections.INGREDIENTS) {
          const fs = fsMap[r.ingredient_id];
          if (!fs) { missing.push(r); }
          else if ((fs.name || '') !== (r.name || '')) { inconsistent.push({ backup: r, firestore: fs }); }
          else { matched++; }
        }
        results.INGREDIENTS = { total: sections.INGREDIENTS.length, matched, missing, inconsistent };
      }

      if (sections.AUDIT_LOGS) {
        const snap = await getDocs(collection(db, 'auditlog'));
        const fsIds = new Set(snap.docs.map(dc => dc.id));
        const missing = sections.AUDIT_LOGS.filter(r => r.firestore_id && !fsIds.has(r.firestore_id));
        results.AUDIT_LOGS = {
          total: sections.AUDIT_LOGS.length,
          matched: sections.AUDIT_LOGS.length - missing.length,
          missing, inconsistent: [],
        };
      }

      if (sections.GENERATED_DOCUMENTS) {
        const snap = await getDocs(collection(db, 'generateddocuments'));
        const fsMap = {};
        snap.docs.forEach(dc => { const d = dc.data(); fsMap[d.documentId || dc.id] = true; });
        const missing = sections.GENERATED_DOCUMENTS.filter(r => !fsMap[r.document_id]);
        results.GENERATED_DOCUMENTS = {
          total: sections.GENERATED_DOCUMENTS.length,
          matched: sections.GENERATED_DOCUMENTS.length - missing.length,
          missing, inconsistent: [],
        };
      }

      setCheckResults(results);
    } catch (err) {
      console.error('Check error:', err);
    } finally {
      setChecking(false);
    }
  };

  // ── Restore missing records ────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!checkResults) return;
    setRestoring(true);
    try {
      for (const r of checkResults.SALES_TRANSACTIONS?.missing || []) {
        await addDoc(collection(db, 'salestransaction'), {
          transactionNumber: r.transaction_number,
          orderMode: r.order_mode,
          modeOfPayment: r.payment_method,
          totalAmount: parseFloat(r.total_amount || 0),
          orders: (r.items || '').split(' | ').filter(Boolean).map(i => {
            const m = i.match(/^(\d+)x (.+)$/);
            return m ? { qty: parseInt(m[1]), name: m[2] } : { qty: 1, name: i };
          }),
          _restoredFromBackup: true,
        });
      }

      for (const r of checkResults.MATERIALS?.missing || []) {
        await addDoc(collection(db, 'materials'), {
          materialId: r.material_id,
          name: r.name, size: r.size,
          stock: parseFloat(r.stock || 0),
          maxLimit: r.max_limit ? parseFloat(r.max_limit) : null,
          isActive: r.is_active !== 'false',
          _restoredFromBackup: true,
        });
      }

      for (const r of checkResults.INGREDIENTS?.missing || []) {
        await addDoc(collection(db, 'ingredients'), {
          ingredientId: r.ingredient_id,
          name: r.name, type: r.type, unit: r.unit,
          batches: [{ quantity: parseFloat(r.total_stock || 0) }],
          maxLimit: r.max_limit ? parseFloat(r.max_limit) : null,
          isActive: r.is_active !== 'false',
          _restoredFromBackup: true,
        });
      }

      for (const r of checkResults.GENERATED_DOCUMENTS?.missing || []) {
        await addDoc(collection(db, 'generateddocuments'), {
          documentId: r.document_id, documentType: r.document_type,
          generatedBy: r.generated_by, dateFrom: r.date_from, dateTo: r.date_to,
          _restoredFromBackup: true,
        });
      }

      setRestoreComplete(true);
      setCheckResults(null);
      setParsedBackup(null);
      setFileName('');
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setRestoring(false);
    }
  };

  const totalMissing       = checkResults ? Object.values(checkResults).reduce((s, r) => s + r.missing.length, 0) : 0;
  const totalInconsistent  = checkResults ? Object.values(checkResults).reduce((s, r) => s + r.inconsistent.length, 0) : 0;
  const noneSelected       = !inclSales && !inclInv && !inclAudit && !inclDocs;

  const doReset = () => {
    setDateFrom(defaultFrom());
    setDateTo(new Date().toISOString().slice(0, 10));
    setInclSales(true); setInclInv(true); setInclAudit(true); setInclDocs(true);
    setParsedBackup(null); setCheckResults(null);
    setRestoreComplete(false); setFileName('');
    if (fileRef.current) fileRef.current.value = '';
    setShowResetConfirm(false);
  };

  const handleReset = () => {
    if (parsedBackup || fileName) { setShowResetConfirm(true); } else { doReset(); }
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="mb-6 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Backup & Recovery</h1>
          <p className="text-xl text-gray-400">Generate weekly CSV backups and check data integrity against Firestore.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 shrink-0">
          {[['backup', 'Backup'], ['recovery', 'Recovery']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-2 rounded-full text-xl font-medium transition-colors ${
                tab === key ? 'bg-[#3ca4c7] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="text-gray-400 hover:text-gray-600 p-1 ml-1 transition-colors"
            title="Reset to default state"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* ── BACKUP TAB ── */}
        {tab === 'backup' && (
          <div className="flex-1 overflow-hidden flex gap-6 min-h-0">

            {/* Left — controls */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-6">
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 flex flex-col gap-6">
                <div>
                  <p className="text-xl font-semibold text-gray-700 mb-4">Date Range</p>
                  <div className="flex gap-5">
                    <div className="flex flex-col gap-2 flex-1">
                      <label className="text-xl text-gray-500">From</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-4 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <label className="text-xl text-gray-500">To</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom}
                        className="border border-gray-300 rounded-lg px-4 py-4 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <p className="text-xl font-semibold text-gray-700 mb-4">Include in Backup</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      [inclSales, setInclSales,   'Sales Transactions',  '(date-filtered)'],
                      [inclInv,   setInclInv,     'Inventory Snapshot',  '(materials & ingredients)'],
                      [inclAudit, setInclAudit,   'Audit Logs',          '(date-filtered)'],
                      [inclDocs,  setInclDocs,    'Generated Reports',   '(all records)'],
                    ].map(([val, setter, label, sub]) => (
                      <label key={label} className="flex items-start gap-3 cursor-pointer select-none">
                        <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                          className="w-5 h-5 mt-0.5 accent-[#3ca4c7]" />
                        <span>
                          <span className="text-xl text-gray-700 block">{label}</span>
                          <span className="text-lg text-gray-400">{sub}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || noneSelected}
                className="flex items-center gap-2 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-6 py-3 rounded-full text-xl transition-colors disabled:opacity-50 self-start"
              >
                {generating
                  ? <><RefreshCw size={18} className="animate-spin" /> Generating...</>
                  : <><Download size={18} /> Generate Backup CSV</>
                }
              </button>
            </div>

            {/* Right — info */}
            <div className="w-[38%] shrink-0 flex flex-col gap-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-6 text-xl text-amber-700 leading-relaxed">
                <p className="font-semibold mb-2">What gets saved?</p>
                <ul className="flex flex-col gap-2 list-disc list-inside text-amber-600">
                  <li><span className="font-medium text-amber-700">Sales Transactions</span> — all orders within the date range</li>
                  <li><span className="font-medium text-amber-700">Inventory Snapshot</span> — current state of all materials and ingredients</li>
                  <li><span className="font-medium text-amber-700">Audit Logs</span> — all system actions within the date range</li>
                  <li><span className="font-medium text-amber-700">Generated Reports</span> — metadata of all previously generated documents</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-6 py-6 text-xl text-blue-700 leading-relaxed">
                <p className="font-semibold mb-2">How to use</p>
                <p>Store the downloaded CSV in a safe location. When data loss or inconsistency is suspected, upload this file on the <span className="font-medium">Recovery</span> tab to check and restore records.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── RECOVERY TAB ── */}
        {tab === 'recovery' && (
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-5">

            {/* Upload + file summary row */}
            <div className="flex gap-5 shrink-0">

              {/* Upload zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="flex-1 border-2 border-dashed border-gray-300 rounded-2xl px-8 py-8 flex items-center gap-5 cursor-pointer hover:border-[#3ca4c7] hover:bg-blue-50 transition-colors"
              >
                <Upload size={28} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xl text-gray-600 font-medium">{fileName || 'Click to upload a backup CSV'}</p>
                  <p className="text-lg text-gray-400 mt-0.5">Only .csv files generated by this system</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* File summary */}
              {parsedBackup && (
                <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 p-6 flex gap-8">
                  <div className="flex-1">
                    <p className="text-xl font-semibold text-gray-700 mb-3">File Metadata</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xl">
                      {Object.entries(parsedBackup.metadata).map(([k, v]) => (
                        <div key={k} className="contents">
                          <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="text-gray-700 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {Object.keys(parsedBackup.sections).length > 0 && (
                    <div className="flex-1">
                      <p className="text-xl font-semibold text-gray-600 mb-3">Sections</p>
                      <div className="flex flex-col gap-1.5">
                        {Object.entries(parsedBackup.sections).map(([sec, rows]) => (
                          <div key={sec} className="flex justify-between text-xl">
                            <span className="text-gray-600">{SECTION_LABELS[sec] || sec}</span>
                            <span className="text-gray-400">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {parsedBackup && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleCheck}
                  disabled={checking}
                  className="flex items-center gap-2 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-6 py-2.5 rounded-full text-xl transition-colors disabled:opacity-50"
                >
                  {checking
                    ? <><RefreshCw size={16} className="animate-spin" /> Checking...</>
                    : <><Shield size={16} /> Run Integrity Check</>
                  }
                </button>
              </div>
            )}

            {/* Restore complete notice */}
            {restoreComplete && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-xl text-green-700 shrink-0">
                <CheckCircle size={20} /> Records restored successfully. Upload a new file to run another check.
              </div>
            )}

            {/* Check results */}
            {checkResults && (
              <>
                {/* Status pills */}
                <div className="flex flex-wrap gap-3 shrink-0">
                  {totalMissing === 0 && totalInconsistent === 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-green-50 text-green-700 border-green-200 text-xl font-medium">
                      <CheckCircle size={17} /> All records matched
                    </div>
                  )}
                  {totalMissing > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-red-50 text-red-700 border-red-200 text-xl font-medium">
                      <XCircle size={17} /> {totalMissing} missing
                    </div>
                  )}
                  {totalInconsistent > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-amber-50 text-amber-700 border-amber-200 text-xl font-medium">
                      <AlertTriangle size={17} /> {totalInconsistent} inconsistent
                    </div>
                  )}
                </div>

                {/* Section cards — 2-column grid */}
                <div className="grid grid-cols-2 gap-4 shrink-0">
                  {Object.entries(checkResults).map(([sec, r]) => (
                    <div key={sec} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-xl font-semibold text-gray-700">{SECTION_LABELS[sec] || sec}</p>
                        <span className="text-xl text-gray-400">{r.total} record{r.total !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="px-6 py-4 flex flex-col gap-3">
                        <div className="flex flex-wrap gap-4 text-xl">
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle size={15} /> {r.matched} matched</span>
                          {r.missing.length > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle size={15} /> {r.missing.length} missing</span>}
                          {r.inconsistent.length > 0 && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={15} /> {r.inconsistent.length} inconsistent</span>}
                        </div>

                        {r.missing.length > 0 && (
                          <div>
                            <p className="text-lg font-medium text-red-500 mb-1">Missing from Firestore:</p>
                            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                              {r.missing.map((rec, i) => {
                                const id     = rec.transaction_number || rec.material_id || rec.ingredient_id || rec.document_id || rec.firestore_id || `row ${i + 1}`;
                                const detail = rec.name || rec.document_type || rec.action || '';
                                return (
                                  <div key={i} className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-1.5 text-xl">
                                    <span className="text-red-700 font-medium">{id}</span>
                                    {detail && <span className="text-red-400 text-lg">{detail}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {r.inconsistent.length > 0 && (
                          <div>
                            <p className="text-lg font-medium text-amber-500 mb-1">Data mismatch (manual review recommended):</p>
                            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                              {r.inconsistent.map((entry, i) => {
                                const id = entry.backup.transaction_number || entry.backup.material_id || entry.backup.ingredient_id;
                                return (
                                  <div key={i} className="bg-amber-50 rounded-lg px-3 py-1.5 text-xl">
                                    <span className="text-amber-700 font-medium">{id}</span>
                                    {entry.backup.total_amount != null && (
                                      <span className="text-amber-500 ml-3 text-lg">
                                        Backup: PHP {entry.backup.total_amount} · Firestore: PHP {Number(entry.firestore.totalAmount || 0).toFixed(2)}
                                      </span>
                                    )}
                                    {entry.backup.name != null && (
                                      <span className="text-amber-500 ml-3 text-lg">
                                        Backup: {entry.backup.name} · Firestore: {entry.firestore.name || '—'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {totalMissing > 0 && (
                  <button
                    onClick={handleRestore}
                    disabled={restoring}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full text-xl transition-colors disabled:opacity-50 self-start shrink-0"
                  >
                    {restoring
                      ? <><RefreshCw size={16} className="animate-spin" /> Restoring...</>
                      : <><FileText size={16} /> Restore {totalMissing} Missing Record{totalMissing !== 1 ? 's' : ''}</>
                    }
                  </button>
                )}
              </>
            )}

            {!parsedBackup && !restoreComplete && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xl text-gray-300">Upload a backup file above to get started.</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[620px] p-8 flex flex-col gap-5">
            <h3 className="text-2xl font-semibold text-gray-800">Reset Interface?</h3>
            <p className="text-xl text-gray-500 leading-relaxed">
              You have a file loaded (<span className="font-medium text-gray-700">{fileName}</span>). Resetting will clear the uploaded file, all check results, and restore all settings to their defaults.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doReset}
                className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
