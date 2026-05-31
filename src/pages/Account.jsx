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
import { Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';

function PwField({ label, value, onChange, show, onToggle, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xl font-medium text-gray-600">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-xl text-gray-700 outline-none focus:border-[#3ca4c7] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          tabIndex={-1}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-40"
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}

export default function Account({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;

  const [userEmail, setUserEmail] = useState('');
  const [userName,  setUserName]  = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // OTP modal
  const [showOtpModal,  setShowOtpModal]  = useState(false);
  const [otpInput,      setOtpInput]      = useState('');
  const [otpCode,       setOtpCode]       = useState('');
  const [otpExpiry,     setOtpExpiry]     = useState(0);
  const [otpSending,    setOtpSending]    = useState(false);
  const [otpMsg,        setOtpMsg]        = useState('');
  const [otpError,      setOtpError]      = useState('');
  const [isOtpFocused,  setIsOtpFocused]  = useState(false);

  // Change email
  const [newEmail,    setNewEmail]    = useState('');
  const [emailMsg,    setEmailMsg]    = useState({ text: '', ok: false });
  const [emailSaving, setEmailSaving] = useState(false);

  // Change password
  const [currentPw,     setCurrentPw]     = useState('');
  const [newPw,         setNewPw]         = useState('');
  const [confirmPw,     setConfirmPw]     = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw,     setShowNewPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMsg,         setPwMsg]         = useState({ text: '', ok: false });
  const [pwSaving,      setPwSaving]      = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    setUserEmail(user.email || '');
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setUserName(snap.data().name || '');
    });
  }, []);

  const logAudit = async (action, details) => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.uid));
    const userData = snap.exists() ? snap.data() : {};
    await addDoc(collection(db, 'auditlog'), {
      action, performedBy: user.email, userId: user.uid,
      userName: userData.name || '', role: role || '',
      details, timestamp: serverTimestamp(),
    });
  };

  // ── OTP ──
  const openOtpModal = () => {
    setOtpInput(''); setOtpCode(''); setOtpExpiry(0);
    setOtpMsg(''); setOtpError(''); setShowOtpModal(true);
  };
  const closeOtpModal = () => {
    setShowOtpModal(false);
    setOtpInput(''); setOtpCode(''); setOtpMsg(''); setOtpError('');
  };

  const handleRequestOtp = async () => {
    setOtpSending(true); setOtpMsg(''); setOtpError(''); setOtpInput('');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_jl3bsze',
          template_id: 'template_lb1szcb',
          user_id: 'ir051N-QwmFGXmsYY',
          template_params: {
            admin_email: 'qcjenueva@tip.edu.ph',
            otp: code,
            time: new Date().toLocaleString(),
          },
        }),
      });
      setOtpCode(code);
      setOtpExpiry(Date.now() + 5 * 60 * 1000);
      setOtpMsg('OTP sent to your email. Valid for 5 minutes.');
    } catch {
      setOtpMsg('Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = () => {
    setOtpError('');
    if (!otpCode) { setOtpError('Request an OTP first.'); return; }
    if (Date.now() > otpExpiry) {
      setOtpError('OTP has expired. Request a new one.');
      setOtpCode(''); setOtpInput(''); setOtpMsg(''); return;
    }
    if (otpInput === otpCode) {
      setOtpVerified(true);
      closeOtpModal();
    } else {
      setOtpError('Invalid OTP.');
    }
  };

  // ── Change Email ──
  const handleUpdateEmail = async () => {
    setEmailMsg({ text: '', ok: false });
    if (!newEmail.trim()) return setEmailMsg({ text: 'Enter a new email address.', ok: false });
    setEmailSaving(true);
    try {
      const user = auth.currentUser;
      await updateEmail(user, newEmail.trim());
      await updateDoc(doc(db, 'users', user.uid), { email: newEmail.trim() });
      await logAudit('Update Email', `Email changed to ${newEmail.trim()}.`);
      setUserEmail(newEmail.trim()); setNewEmail('');
      setEmailMsg({ text: 'Email updated successfully.', ok: true });
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'Email already in use.' :
        err.code === 'auth/invalid-email'         ? 'Invalid email format.' :
        err.code === 'auth/requires-recent-login' ? 'Session expired. Please log in again.' :
        'Failed to update email.';
      setEmailMsg({ text: msg, ok: false });
    } finally {
      setEmailSaving(false);
    }
  };

  // ── Change Password ──
  const handleUpdatePassword = async () => {
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

  const locked = !otpVerified;

  return (
    <div className="flex w-full h-full">
      <Sidebar />

      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">

        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Account</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userName && <span className="text-xl text-gray-600">{userName}</span>}
              <span className="text-xl text-gray-400">·</span>
              <span className="text-xl text-gray-600">{userEmail}</span>
              {otpVerified && (
                <span className="flex items-center gap-1.5 text-xl text-green-600 font-medium">
                  <ShieldCheck size={18} /> Verified
                </span>
              )}
            </div>
            {!otpVerified && (
              <button
                onClick={openOtpModal}
                className="flex items-center gap-2 bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-5 py-2 rounded-full text-xl font-semibold transition-colors"
              >
                <Lock size={16} /> Change Credentials
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-6" style={{ scrollbarGutter: 'stable' }}>

          {/* ── Change Email ── */}
          <div className={`border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-opacity ${locked ? 'opacity-50' : ''}`}>
            <div className="px-8 py-5 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">Change Email</h2>
              <p className="text-xl text-gray-500 mt-0.5">
                Current: <span className="font-medium text-gray-700">{userEmail}</span>
              </p>
            </div>
            <div className="px-8 py-7 flex flex-col gap-5 max-w-lg">
              <div className="flex flex-col gap-2">
                <label className="text-xl font-medium text-gray-600">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                  disabled={locked}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#3ca4c7] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
              {emailMsg.text && (
                <p className={`text-xl font-medium ${emailMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {emailMsg.text}
                </p>
              )}
              <button
                onClick={handleUpdateEmail}
                disabled={locked || emailSaving}
                className={`self-start px-8 py-2.5 rounded-full text-xl font-semibold transition-colors ${
                  locked || emailSaving
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'
                }`}
              >
                {emailSaving ? 'Saving…' : 'Update Email'}
              </button>
            </div>
          </div>

          {/* ── Change Password ── */}
          <div className={`border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-opacity ${locked ? 'opacity-50' : ''}`}>
            <div className="px-8 py-5 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">Change Password</h2>
            </div>
            <div className="px-8 py-7 flex flex-col gap-5 max-w-lg">
              <PwField label="Current Password"      value={currentPw} onChange={setCurrentPw} show={showCurrentPw} onToggle={() => setShowCurrentPw(v => !v)} disabled={locked} />
              <PwField label="New Password"          value={newPw}     onChange={setNewPw}     show={showNewPw}     onToggle={() => setShowNewPw(v => !v)}     disabled={locked} />
              <PwField label="Confirm New Password"  value={confirmPw} onChange={setConfirmPw} show={showConfirmPw} onToggle={() => setShowConfirmPw(v => !v)} disabled={locked} />
              {pwMsg.text && (
                <p className={`text-xl font-medium ${pwMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {pwMsg.text}
                </p>
              )}
              <button
                onClick={handleUpdatePassword}
                disabled={locked || pwSaving}
                className={`self-start px-8 py-2.5 rounded-full text-xl font-semibold transition-colors ${
                  locked || pwSaving
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white'
                }`}
              >
                {pwSaving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ══════════════════════════════════════════
          OTP VERIFICATION MODAL
      ══════════════════════════════════════════ */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] flex flex-col items-center px-0 py-10 gap-0">

            {/* Header */}
            <ShieldCheck size={40} className="text-[#3ca4c7] mb-3" />
            <p className="text-gray-800 text-xl mb-1 tracking-wide font-semibold">Identity Verification</p>
            <p className="text-gray-500 text-xl mb-6 text-center leading-relaxed px-10">
              {otpMsg
                ? otpMsg
                : `A one-time passkey will be sent to your email to authorize changes.`}
            </p>

            {/* Passkey form (Login style) */}
            <form onSubmit={e => { e.preventDefault(); otpCode ? handleVerifyOtp() : handleRequestOtp(); }} className="w-full flex flex-col gap-5 px-10">
              <div className="flex flex-col gap-2 w-full items-center">
                <label className="text-gray-800 text-xl font-medium tracking-wide self-start">
                  {otpError
                    ? <span className="text-red-500">{otpError}</span>
                    : 'Account Passkey'}
                </label>

                <div className="relative flex justify-center gap-2.5 w-full my-2">
                  {[...Array(6)].map((_, index) => {
                    const char = otpInput[index] || '';
                    const isCurrent = index === otpInput.length;
                    const isLastAndFull = index === 5 && otpInput.length === 6;
                    const isActive = isOtpFocused && (isCurrent || isLastAndFull);
                    return (
                      <div
                        key={index}
                        className={`w-12 h-14 bg-white rounded-xl flex items-center justify-center text-2xl font-bold text-black border-2 transition-all ${
                          otpError
                            ? 'border-red-400 bg-red-50'
                            : isActive
                            ? 'border-[#3ca4c7] ring-2 ring-[#3ca4c7]/20'
                            : 'border-gray-300'
                        }`}
                      >
                        {char}
                      </div>
                    );
                  })}
                  <input
                    type="text"
                    pattern="\d*"
                    inputMode="numeric"
                    value={otpInput}
                    onChange={e => {
                      setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                      if (otpError) setOtpError('');
                    }}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    maxLength={6}
                    disabled={!otpCode}
                    autoComplete="one-time-code"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center mt-2">
                {!otpCode ? (
                  <button
                    key="btn-req"
                    type="submit"
                    disabled={otpSending}
                    className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-xl py-3 px-12 rounded-full transition-colors tracking-wide disabled:opacity-70"
                  >
                    {otpSending ? 'Sending…' : 'Request'}
                  </button>
                ) : (
                  <button
                    key="btn-verify"
                    type="submit"
                    className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-xl py-3 px-12 rounded-full transition-colors tracking-wide"
                  >
                    Verify
                  </button>
                )}
              </div>
            </form>

            <button
              onClick={closeOtpModal}
              className="text-xl text-gray-500 hover:text-gray-800 mt-6 transition-colors tracking-wide"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
