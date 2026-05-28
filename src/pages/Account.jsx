import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential
} from 'firebase/auth';
import {
  doc, getDoc, updateDoc, collection, addDoc, serverTimestamp
} from 'firebase/firestore';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';
import { Eye, EyeOff } from 'lucide-react';

function PwField({ label, value, onChange, show, onToggleShow, id }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-600">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function Account({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;

  const [userEmail, setUserEmail] = useState('');

  // Change email
  const [newEmail, setNewEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [emailMsg, setEmailMsg] = useState({ text: '', ok: false });
  const [emailSaving, setEmailSaving] = useState(false);

  // Change password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: '', ok: false });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setUserEmail(user.email || '');
  }, []);

  const logAudit = async (action, details) => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.uid));
    const userData = snap.exists() ? snap.data() : {};
    await addDoc(collection(db, 'auditlog'), {
      action,
      performedBy: user.email,
      userId: user.uid,
      userName: userData.name || '',
      role: role || '',
      details,
      timestamp: serverTimestamp(),
    });
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailMsg({ text: '', ok: false });
    if (!newEmail.trim()) return setEmailMsg({ text: 'Enter a new email.', ok: false });
    if (!emailPw) return setEmailMsg({ text: 'Enter your current password.', ok: false });
    setEmailSaving(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, emailPw);
      await reauthenticateWithCredential(user, cred);
      await updateEmail(user, newEmail.trim());
      await updateDoc(doc(db, 'users', user.uid), { email: newEmail.trim() });
      await logAudit('Update Email', `Email changed to ${newEmail.trim()}.`);
      setUserEmail(newEmail.trim());
      setNewEmail('');
      setEmailPw('');
      setEmailMsg({ text: 'Email updated successfully.', ok: true });
    } catch (err) {
      const msg =
        err.code === 'auth/wrong-password'      ? 'Incorrect password.' :
        err.code === 'auth/invalid-credential'   ? 'Incorrect password.' :
        err.code === 'auth/email-already-in-use' ? 'Email already in use.' :
        err.code === 'auth/invalid-email'        ? 'Invalid email format.' :
        'Failed to update email.';
      setEmailMsg({ text: msg, ok: false });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ text: '', ok: false });
    if (!currentPw) return setPwMsg({ text: 'Enter your current password.', ok: false });
    if (newPw.length < 8) return setPwMsg({ text: 'New password must be at least 8 characters.', ok: false });
    if (newPw !== confirmPw) return setPwMsg({ text: 'Passwords do not match.', ok: false });
    setPwSaving(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      await logAudit('Update Password', 'Account password changed.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg({ text: 'Password updated successfully.', ok: true });
    } catch (err) {
      const msg =
        err.code === 'auth/wrong-password'    ? 'Incorrect current password.' :
        err.code === 'auth/invalid-credential' ? 'Incorrect current password.' :
        'Failed to update password.';
      setPwMsg({ text: msg, ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="flex w-full h-full">
      <Sidebar activePage="account" />

      <main className="flex-1 bg-white overflow-y-auto flex flex-col p-8 gap-5">
        <h1 className="text-3xl font-bold text-gray-900 shrink-0">Account</h1>

        <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Account Credentials</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Signed in as <span className="font-medium text-gray-700">{userEmail}</span>
            </p>
          </div>

          <div className="p-6 grid grid-cols-2 gap-8">
            {/* Change Email */}
            <form onSubmit={handleUpdateEmail} className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">
                Change Email
              </h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                  className="h-10 px-3 rounded-lg border border-gray-300 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                />
              </div>
              <PwField
                label="Current Password (to verify)"
                value={emailPw}
                onChange={setEmailPw}
                show={showEmailPw}
                onToggleShow={() => setShowEmailPw(v => !v)}
                id="email-pw"
              />
              {emailMsg.text && (
                <p className={`text-sm font-medium ${emailMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {emailMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={emailSaving}
                className="self-start px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {emailSaving ? 'Saving...' : 'Update Email'}
              </button>
            </form>

            {/* Change Password */}
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">
                Change Password
              </h3>
              <PwField
                label="Current Password"
                value={currentPw}
                onChange={setCurrentPw}
                show={showCurrentPw}
                onToggleShow={() => setShowCurrentPw(v => !v)}
                id="cur-pw"
              />
              <PwField
                label="New Password"
                value={newPw}
                onChange={setNewPw}
                show={showNewPw}
                onToggleShow={() => setShowNewPw(v => !v)}
                id="new-pw"
              />
              <PwField
                label="Confirm New Password"
                value={confirmPw}
                onChange={setConfirmPw}
                show={showConfirmPw}
                onToggleShow={() => setShowConfirmPw(v => !v)}
                id="conf-pw"
              />
              {pwMsg.text && (
                <p className={`text-sm font-medium ${pwMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {pwMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={pwSaving}
                className="self-start px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {pwSaving ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
