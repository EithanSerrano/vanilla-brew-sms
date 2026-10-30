import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, setDoc, addDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '../firebase';
import { auth, db } from '../firebase';
import { Search, Plus, RefreshCw, X, AlignJustify } from 'lucide-react';
import { ID_PREFIX, nextId } from '../utils/idFormats';
import AdminSidebar from '../layouts/AdminSidebar';
import emailjs from '@emailjs/browser';


function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}


function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return '—';
 
  // Shows Date AND exact Time perfectly
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}


function DiscardDialog({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] px-8 py-6 flex flex-col gap-4">
        <h3 className="text-2xl font-semibold text-gray-800">Discard Progress?</h3>
        <p className="text-xl text-gray-500">If confirmed, the progress cannot be recovered.</p>
        <div className="flex gap-3 justify-end mt-1">
          <button onClick={onCancel} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors">Discard</button>
        </div>
      </div>
    </div>
  );
}


export default function AdminRegistration() {
  const [accounts, setAccounts] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  // ── New Account ──
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [pendingAccount, setPendingAccount] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);


  // ── Arrange / Sort ──
  const [sortField, setSortField] = useState('empId');
  const [sortDir, setSortDir]     = useState('asc');
  const [showArrange, setShowArrange] = useState(false);


  // ── Deactivate confirmation ──
  const [deactivateTarget,    setDeactivateTarget]    = useState(null);
  const [showDeactivateConf,  setShowDeactivateConf]  = useState(false);


  // ── Edit ──
  const [editRow, setEditRow] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showEditOk, setShowEditOk] = useState(false);
  const [showEditDiscard, setShowEditDiscard] = useState(false);


  // ── Load ──
  const loadData = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('empId', 'asc')));
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('Load accounts error:', e); }
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const close = () => setShowArrange(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);


  const logAudit = async (action, itemId, itemName, details = {}) => {
    try {
      const session = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      const performedBy = session.name || session.email || 'Unknown';
      await addDoc(collection(db, 'auditlog'), {
        action, itemType: 'account', itemId, itemName, details, performedBy, timestamp: new Date(),
      });
    } catch (e) { console.error('Audit log error:', e); }
  };


  const generateNextEmpId = async () => {
    const snap = await getDocs(collection(db, 'users'));
    return nextId(ID_PREFIX.employee, snap.docs.map(d => d.data().empId));
  };


  // ── New account flow ──
  const formHasData = () => fullName.trim() !== '' || displayName.trim() !== '' || email.trim() !== '';
  const resetForm = () => { setFullName(''); setDisplayName(''); setEmail(''); setNewRole('staff'); setPendingAccount(null); setGeneratedPassword(''); };


  const closeForm = () => {
    if (formHasData()) setShowDiscard(true);
    else { setShowForm(false); resetForm(); }
  };


  const handleSaveAccount = async () => {
    if (!fullName.trim() || !displayName.trim() || !email.trim()) return;
    const empId = await generateNextEmpId();
    setPendingAccount({ fullName: fullName.trim(), displayName: displayName.trim(), email: email.trim(), role: newRole, empId });
    setShowConfirm(true);
  };


  const handleConfirmAccount = async () => {
    if (!pendingAccount || submitting) return;
    setSubmitting(true);
    const password = generatePassword();
    setGeneratedPassword(password);
    try {
      // Use a secondary app so creating the new user doesn't sign out the admin
      const secondaryApp = getApps().find(a => a.name === 'secondary')
        || initializeApp(firebaseConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, pendingAccount.email, password);
      await secondaryAuth.signOut();
      await setDoc(doc(db, 'users', cred.user.uid), {
        empId: pendingAccount.empId,
        fullName: pendingAccount.fullName,
        name: pendingAccount.displayName,
        email: pendingAccount.email,
        role: pendingAccount.role || 'staff',
        status: 'Active',
        isOnline: false,
        createdAt: new Date(),
        mustChangePassword: true,
      });
     
      await logAudit('CREATE_ACCOUNT', pendingAccount.empId, pendingAccount.displayName, {
        fullName: pendingAccount.fullName,
        email: pendingAccount.email,
        role: pendingAccount.role || 'staff',
      });


      // --- SEND WELCOME EMAIL WITH EMAILJS ---
      try {
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_WELCOME,     // Your EmailJS Service ID
          import.meta.env.VITE_EMAILJS_TEMPLATE_WELCOME,    // Your EmailJS Template ID
          {
            fullName: pendingAccount.fullName, 
            email: pendingAccount.email,       
            empId: pendingAccount.empId,       
            password: password,                 
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY_WELCOME   // Your EmailJS Public Key
        );
        console.log("Welcome email sent successfully via EmailJS!");
      } catch (emailErr) {
        console.error("Failed to send welcome email via EmailJS:", emailErr);
      }
      // -------------------------------------------


      await loadData();
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (e) {
      console.error('Create account error:', e);
    } finally {
      setSubmitting(false);
    }
  };


  // ── Deactivate / Reactivate ──
  const handleDeactivateClick = acc => { setDeactivateTarget(acc); setShowDeactivateConf(true); };
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    await updateDoc(doc(db, 'users', deactivateTarget.id), { status: 'Inactive' });
    await logAudit('DEACTIVATE_ACCOUNT', deactivateTarget.empId, deactivateTarget.name || deactivateTarget.fullName, {
      fullName: deactivateTarget.fullName || deactivateTarget.name,
      email: deactivateTarget.email,
    });
    await loadData();
    setShowDeactivateConf(false);
    setDeactivateTarget(null);
  };
  const [reactivateTarget,   setReactivateTarget]   = useState(null);
  const [showReactivateConf, setShowReactivateConf] = useState(false);
  const handleReactivateClick = acc => { setReactivateTarget(acc); setShowReactivateConf(true); };
  const handleConfirmReactivate = async () => {
    if (!reactivateTarget) return;
    await updateDoc(doc(db, 'users', reactivateTarget.id), { status: 'Active' });
    await logAudit('REACTIVATE_ACCOUNT', reactivateTarget.empId, reactivateTarget.name || reactivateTarget.fullName, {
      fullName: reactivateTarget.fullName || reactivateTarget.name,
      email: reactivateTarget.email,
    });
    await loadData();
    setShowReactivateConf(false);
    setReactivateTarget(null);
  };


  // ── Edit flow ──
  const handleEditClick = acc => {
    setEditRow(acc);
    setEditFullName(acc.fullName || acc.name || '');
    setEditDisplayName(acc.name || '');
    setEditRole(acc.role || 'staff');
    setShowEditForm(true);
  };
  const editHasChanges = () => {
    if (!editRow) return false;
    return editFullName !== (editRow.fullName || editRow.name || '') || editDisplayName !== (editRow.name || '')
      || editRole !== (editRow.role || 'staff');
  };
  const closeEditForm = () => {
    if (editHasChanges()) setShowEditDiscard(true);
    else { setShowEditForm(false); setEditRow(null); }
  };
  const handleConfirmEdit = async () => {
    if (!editRow) return;
    await updateDoc(doc(db, 'users', editRow.id), {
      fullName: editFullName.trim(),
      name: editDisplayName.trim(),
      ...(editRow.role !== 'admin' && { role: editRole }),
    });
    await logAudit('EDIT_ACCOUNT', editRow.empId, editDisplayName.trim(), {
      previousFullName: editRow.fullName || editRow.name,
      newFullName: editFullName.trim(),
      previousDisplayName: editRow.name,
      newDisplayName: editDisplayName.trim(),
      previousRole: editRow.role || 'staff',
      newRole: editRow.role === 'admin' ? 'admin' : editRole,
    });
    await loadData();
    setShowEditConfirm(false);
    setShowEditOk(true);
  };


  // ── Filtered + sorted list ──
  const toDate = ts => ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date(0);
  const displayed = accounts
    .filter(a => showInactive ? a.status !== 'Active' : a.status === 'Active')
    .filter(a => !searchQuery ||
      (a.empId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let av, bv;
      if (sortField === 'name') {
        av = (a.name || a.fullName || '').toLowerCase();
        bv = (b.name || b.fullName || '').toLowerCase();
      } else if (sortField === 'lastLogin') {
        av = toDate(a.lastLogin);
        bv = toDate(b.lastLogin);
      } else {
        av = a.empId || '';
        bv = b.empId || '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });


  return (
    <div className="flex w-full h-full">
      <AdminSidebar />


      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">


        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Manage Accounts</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInactive(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${showInactive ? 'bg-red-400' : 'bg-green-400'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${showInactive ? 'left-6' : 'left-1'}`} />
              </button>
              <span className="text-xl text-gray-600 shrink-0">{showInactive ? 'Showing Inactive Accounts' : 'Showing Active Accounts'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowArrange(v => !v); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl transition-colors shrink-0 ${
                    showArrange ? 'bg-[#3ca4c7] text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <AlignJustify size={16} /> Arrange
                </button>
                {showArrange && (
                  <div
                    className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-56 py-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="px-4 pt-1 pb-2 text-lg font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">Sort by</p>
                    {[
                      { field: 'empId',     labelAsc: 'ID (A → Z)',            labelDesc: 'ID (Z → A)' },
                      { field: 'name',      labelAsc: 'Name (A → Z)',           labelDesc: 'Name (Z → A)' },
                      { field: 'lastLogin', labelAsc: 'Last Login (Oldest)',    labelDesc: 'Last Login (Newest)' },
                    ].map(({ field, labelAsc, labelDesc }) => (
                      <div key={field}>
                        {[{ dir: 'asc', label: labelAsc }, { dir: 'desc', label: labelDesc }].map(({ dir, label }) => (
                          <button
                            key={dir}
                            onClick={() => { setSortField(field); setSortDir(dir); setShowArrange(false); }}
                            className={`w-full px-4 py-2.5 text-left text-xl transition-colors ${
                              sortField === field && sortDir === dir
                                ? 'text-[#3ca4c7] font-semibold bg-blue-50'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {!showInactive && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-4 py-2 rounded-full text-xl transition-colors shrink-0"
                >
                  <Plus size={16} /> New Account
                </button>
              )}
              <button onClick={loadData} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>


        {/* Search */}
        <div className="flex items-center gap-2 border-b border-gray-300 pb-1 mb-5 shrink-0">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search here"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>


        {/* Table */}
        <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0 shadow-md">
          <div className="flex items-center px-8 py-3 bg-white border-b border-gray-200 shrink-0">
            <span className="w-[15%] text-xl font-semibold text-gray-800 text-center">ID</span>
            <span className="w-[30%] text-xl font-semibold text-gray-800 text-center">Name</span>
            <span className="w-[25%] text-xl font-semibold text-gray-800 text-center">Last Log In</span>
            <span className="flex-1 text-xl font-semibold text-gray-800 text-center">Actions</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2" style={{ scrollbarGutter: 'stable' }}>
            {displayed.length === 0 && (
              <p className="py-12 text-gray-400 text-xl text-center">No accounts found.</p>
            )}
            {displayed.map(acc => (
              <div key={acc.id} className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5">
                <span className="w-[15%] text-xl text-gray-700 text-center">{acc.empId || '—'}</span>
                <span className="w-[30%] text-xl text-gray-700 text-center">{acc.name || acc.fullName || '—'}</span>
                <span className="w-[25%] text-xl text-gray-500 text-center">{fmtDate(acc.lastLogin)}</span>
                <div className="flex-1 flex items-center justify-center gap-2">
                  {showInactive ? (
                    <button
                      onClick={() => handleReactivateClick(acc)}
                      className="bg-green-400 hover:bg-green-500 text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                    >
                      Reactivate Account
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeactivateClick(acc)}
                      className="bg-red-300 hover:bg-red-400 text-white px-4 py-1.5 rounded-full text-xl transition-colors"
                    >
                      Deactivate Account
                    </button>
                  )}
                  <button
                    onClick={() => handleEditClick(acc)}
                    className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-5 py-1.5 rounded-full text-xl transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>


      {/* ══════════════════════════════════════════
          NEW ACCOUNT FORM
      ══════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[730px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Employee Account</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-6">
              <p className="text-xl font-semibold text-gray-700">Employee Information</p>
              <div className="flex items-center gap-5">
                <label className="text-xl text-gray-600 w-44 shrink-0">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-5">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-gray-700">Reminder</p>
                  <p className="text-xl text-gray-500">The Display Name will be the name used for<br />Sales and Audit Logs.</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <label className="text-xl text-gray-600 w-44 shrink-0">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                />
              </div>
              <div className="flex items-center gap-5">
                <label className="text-xl text-gray-600 w-44 shrink-0">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7] bg-white"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <button
                onClick={handleSaveAccount}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-full text-xl font-semibold transition-colors mt-2"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════
          CONFIRM NEW ACCOUNT
      ══════════════════════════════════════════ */}
      {showConfirm && pendingAccount && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[730px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Employee Account</h3>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-10 flex flex-col gap-4 items-center text-center">
              <p className="text-2xl font-semibold text-gray-800">Register new Employee?</p>
              <p className="text-xl text-gray-600">
                {pendingAccount.fullName} will be saved as <span className="font-bold">{pendingAccount.empId}</span>.
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <p className="text-xl font-semibold text-gray-700">Reminder</p>
                <p className="text-xl text-gray-500">
                  After confirming, an email with the login credentials<br />
                  will be sent to the employee.
                </p>
              </div>
              <button
                onClick={handleConfirmAccount}
                disabled={submitting}
                className="mt-4 px-16 py-3 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════
          SUCCESS
      ══════════════════════════════════════════ */}
      {showSuccess && pendingAccount && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[730px]">
            <div className="px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">New Employee Account</h3>
            </div>
            <div className="px-10 py-10 flex flex-col gap-5 items-center text-center">
              <p className="text-2xl font-semibold text-gray-800">Success!</p>
              <p className="text-xl text-gray-600">
                {pendingAccount.fullName} has been saved as <span className="font-bold">{pendingAccount.empId}</span>.
              </p>
              <p className="text-xl text-green-600 mt-2 font-medium">
                The account credentials have been emailed to the employee!
              </p>
              <div className="border-2 border-green-200 bg-green-50 rounded-xl px-8 py-3 mt-3 text-xl text-green-700">
                A temporary password has been sent to <span className="font-semibold">{pendingAccount.email}</span>.
              </div>
              <button
                onClick={() => { setShowSuccess(false); setShowForm(false); resetForm(); }}
                className="mt-4 px-10 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════
          DISCARD
      ══════════════════════════════════════════ */}
      {showDiscard && (
        <DiscardDialog
          onCancel={() => setShowDiscard(false)}
          onConfirm={() => { setShowDiscard(false); setShowForm(false); resetForm(); }}
        />
      )}


      {/* ══════════════════════════════════════════
          EDIT ACCOUNT MODAL
      ══════════════════════════════════════════ */}
      {showEditForm && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[730px]">
            <div className="flex items-center justify-between px-10 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">Edit Account — {editRow.empId}</h3>
              <button onClick={closeEditForm} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
            </div>
            <div className="px-10 py-8 flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <label className="text-xl text-gray-600 w-44 shrink-0">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                />
              </div>
              <div className="flex items-center gap-5">
                <label className="text-xl text-gray-600 w-44 shrink-0">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7]"
                />
              </div>
              {editRow.role !== 'admin' && (
                <div className="flex items-center gap-5">
                  <label className="text-xl text-gray-600 w-44 shrink-0">Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7] bg-white"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              )}
              <button
                onClick={() => setShowEditConfirm(true)}
                className="w-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white py-3.5 rounded-full text-xl font-semibold transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}


      {showEditConfirm && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Save Changes?</h3>
            <p className="text-xl text-gray-600">Update details for <span className="font-semibold">{editRow.empId}</span>?</p>
            <div className="flex gap-3 justify-end mt-1">
              <button onClick={() => setShowEditConfirm(false)} className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleConfirmEdit} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}


      {showEditOk && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Changes Saved!</h3>
            <p className="text-xl text-gray-600"><span className="font-semibold">{editDisplayName}</span> has been updated.</p>
            <div className="flex justify-end mt-1">
              <button onClick={() => { setShowEditOk(false); setShowEditForm(false); setEditRow(null); }} className="px-6 py-2 rounded-full bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white text-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}


      {showEditDiscard && (
        <DiscardDialog
          onCancel={() => setShowEditDiscard(false)}
          onConfirm={() => { setShowEditDiscard(false); setShowEditForm(false); setEditRow(null); }}
        />
      )}


      {/* ══════════════════════════════════════════
          REACTIVATE CONFIRMATION
      ══════════════════════════════════════════ */}
      {showReactivateConf && reactivateTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Reactivate Account?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{reactivateTarget.name || reactivateTarget.fullName}</span>
              {' '}({reactivateTarget.empId}) will be moved back to the active list.
            </p>
            <p className="text-xl text-gray-400 italic">The employee will be able to log in again.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => { setShowReactivateConf(false); setReactivateTarget(null); }}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReactivate}
                className="px-6 py-2 rounded-full bg-green-400 hover:bg-green-500 text-white text-xl transition-colors"
              >
                Reactivate
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════
          DEACTIVATE CONFIRMATION
      ══════════════════════════════════════════ */}
      {showDeactivateConf && deactivateTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] px-8 py-6 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Deactivate Account?</h3>
            <p className="text-xl text-gray-600">
              <span className="font-semibold">{deactivateTarget.name || deactivateTarget.fullName}</span>
              {' '}({deactivateTarget.empId}) will be moved to the inactive list.
            </p>
            <p className="text-xl text-gray-400 italic">The employee will no longer be able to log in.</p>
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => { setShowDeactivateConf(false); setDeactivateTarget(null); }}
                className="px-6 py-2 rounded-full border border-gray-300 text-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivate}
                className="px-6 py-2 rounded-full bg-red-400 hover:bg-red-500 text-white text-xl transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



