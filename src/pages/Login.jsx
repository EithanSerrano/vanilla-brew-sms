import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut, updatePassword } from 'firebase/auth';
import { collection, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('login');

  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [resetError, setResetError] = useState(false);
 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Global Session Lockout State
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [loginBannerMsg, setLoginBannerMsg] = useState('');
  const [credFailed, setCredFailed] = useState(false);

  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  // Passkey 2FA State
  const [passkeyInput, setPasskeyInput] = useState('');
  const [adminOTP, setAdminOTP] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [isOtpFocused, setIsOtpFocused] = useState(false); // Track focus for OTP grid boxes

  const [resetEmail, setResetEmail] = useState('');

  // Force password change on first login
  const [showForcePw,    setShowForcePw]    = useState(false);
  const [forcePwNew,     setForcePwNew]     = useState('');
  const [forcePwConfirm, setForcePwConfirm] = useState('');
  const [forcePwErr,     setForcePwErr]     = useState('');
  const [forcePwSaving,  setForcePwSaving]  = useState(false);
  const [forcePwUser,    setForcePwUser]    = useState(null);
  const [forcePwDest,    setForcePwDest]    = useState('');
  const [forcePwDocRef,  setForcePwDocRef]  = useState(null);
  const [showForcePwNew, setShowForcePwNew] = useState(false);
  const [showForcePwCfm, setShowForcePwCfm] = useState(false);

  // Handle Lockout Countdown
  useEffect(() => {
    let interval;
    if (lockoutUntil > Date.now()) {
      interval = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutUntil(0);
          setAttempts(0);
          setCountdown(0);
          setLoginBannerMsg('');
          setCredFailed(false);
          clearInterval(interval);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleLoginChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    if (e.target.name === 'username' && usernameError) setUsernameError('');
    if (e.target.name === 'password' && passwordError) setPasswordError('');
    if (loginBannerMsg) setLoginBannerMsg('');
    if (credFailed) setCredFailed(false);
  };

  const handlePasskeyChange = (e) => {
    const cleanText = e.target.value.replace(/[^0-9]/g, ''); // Ensure numbers only
    setPasskeyInput(cleanText.slice(0, 6));
    if (passkeyError) setPasskeyError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutUntil > Date.now()) return;

    setUsernameError('');
    setPasswordError('');

    const trimmedUsername = credentials.username.trim();

    setIsLoggingIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedUsername, credentials.password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
       
        if (userData?.status?.toLowerCase() === 'inactive') {
          await signOut(auth);
          setUsernameError("_hide");
          setPasswordError("Account deactivated. Contact your administrator.");
          return;
        }

        await updateDoc(userDocRef, { isOnline: true });
        setAttempts(0);

        await addDoc(collection(db, 'auditlog'), {
          action: 'Login',
          performedBy: user.email,
          userId: user.uid,
          userName: userData.name || '',
          role: userData.role || '',
          details: `${userData.name || user.email} logged in successfully.`,
          timestamp: serverTimestamp(),
        });

        const destination = userData.role === 'admin' ? '/admin' : userData.role === 'staff' ? '/staff' : null;
        if (!destination) {
          setUsernameError("Unauthorized role");
          setIsLoggingIn(false);
          return;
        }

        if (userData.mustChangePassword) {
          setForcePwUser(user);
          setForcePwDest(destination);
          setForcePwDocRef(userDocRef);
          setShowForcePw(true);
          setIsLoggingIn(false);
          return;
        }

        setLoginSuccess(true);
        setTimeout(() => navigate(destination), 1500);
      } else {
        throw new Error("Document not found");
      }
    } catch (error) {
      setIsLoggingIn(false);
      console.error("Login error:", error);

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      setCredFailed(true);

      if (newAttempts >= 3) {
        setLockoutUntil(Date.now() + 300000);

        try {
          await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: 'service_jl3bsze',
              template_id: 'template_fqiqd8q',
              user_id: 'ir051N-QwmFGXmsYY',
              template_params: {
                user_email: trimmedUsername,
                time: new Date().toLocaleString(),
              }
            }),
          });
        } catch (err) {
          console.error("Could not send EmailJS alert:", err);
        }
      } else {
        setLoginBannerMsg(`Invalid Credentials! (${newAttempts}/3 Attempts remaining)`);
      }
    }
  };

  const handleRequestPasskey = async (e) => {
    if (e) e.preventDefault(); // Safety to prevent accidental form submission
    setIsSendingOTP(true);
    setOtpSentMessage('');
    setPasskeyError('');
   
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const generatedCode = String(100000 + (buf[0] % 900000));

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
            otp: generatedCode,
            time: new Date().toLocaleString(),
          }
        }),
      });

      // ONLY set state AFTER the email sends.
      // This stops the button from swapping too fast while your mouse click is still registering.
      setAdminOTP(generatedCode);
      setOtpExpiry(Date.now() + 5 * 60 * 1000);
      setOtpSentMessage('Passkey sent to Admin (Valid for 5 mins)');
    } catch (err) {
      console.error("Could not send OTP:", err);
      setOtpSentMessage('Failed to send Passkey.');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handlePasskeySubmit = (e) => {
    e.preventDefault();
    setPasskeyError('');

    if (!adminOTP || adminOTP === '') {
      setPasskeyError('Please request a passkey first.');
      return;
    }

    if (Date.now() > otpExpiry) {
      setPasskeyError('Passkey Expired. Request a new one.');
      setAdminOTP('');
      setOtpSentMessage('');
      setPasskeyInput('');
      return;
    }

    if (passkeyInput === adminOTP) {
      setCurrentView('forgot');
      setPasskeyInput('');
      setPasskeyError('');
      setAdminOTP('');
      setOtpExpiry(0);
    } else {
      setPasskeyError('Invalid Passkey.');
    }
  };

  const handleResetPassword = async (e) => {
  e.preventDefault();

  if (resetEmail.trim() === '') {
    setResetError(true);
    return;
  }

  setIsSubmitting(true);
  setResetError(false);

  try {
    const actionCodeSettings = {
      url: 'https://vnlbrew.shop/reset-password',
      handleCodeInApp: false,
    };

    await sendPasswordResetEmail(
      auth,
      resetEmail.trim(),
      actionCodeSettings
    );

    setSuccessMessage(true);

  } catch (error) {
    console.error("Firebase Reset Error:", error);

    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-email'
    ) {
      setResetError(true);
    } else {
      alert(error.message);
    }
  } finally {
    setIsSubmitting(false);
  }
};

  const handleForcePwSubmit = async (e) => {
    e.preventDefault();
    setForcePwErr('');
    if (forcePwNew.length < 8)              return setForcePwErr('Password must be at least 8 characters.');
    if (forcePwNew !== forcePwConfirm)       return setForcePwErr('Passwords do not match.');
    setForcePwSaving(true);
    try {
      await updatePassword(forcePwUser, forcePwNew);
      await updateDoc(forcePwDocRef, { mustChangePassword: false });
      navigate(forcePwDest);
    } catch (err) {
      console.error('Force password change error:', err);
      setForcePwErr('Failed to update password. Please try again.');
      setForcePwSaving(false);
    }
  };

  const isLockedOut = lockoutUntil > Date.now();
  const bannerMessage = isLockedOut
    ? 'Attempts used, please try again later (5 minutes)'
    : loginBannerMsg;

  return (
    <div
      className="h-full w-full flex items-center justify-center font-sans"
      style={{ background: 'linear-gradient(135deg, #d4a07a 0%, #7a3018 100%)' }}
    >
      <div className="bg-white p-10 rounded-2xl shadow-2xl flex flex-col items-center w-[480px] z-10">

        <img src="/VNLBrewIcon.png" alt="Vanilla Brew Shop Management System" className="w-full max-w-[380px] object-contain mb-6" />

        {currentView === 'login' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            {loginSuccess ? (
              <p className="text-green-600 text-xl font-semibold mb-4 text-center tracking-wide">Login successful! Redirecting...</p>
            ) : bannerMessage ? (
              <p className="text-red-500 text-xl font-medium mb-4 text-center tracking-wide">{bannerMessage}</p>
            ) : (
              <p className="text-gray-500 text-xl mb-6 tracking-wide">Please enter your credentials</p>
            )}
            <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 px-8" style={{ pointerEvents: loginSuccess ? 'none' : 'auto', opacity: loginSuccess ? 0.6 : 1 }}>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xl font-medium tracking-wide">Email</label>
                <input
                  type="text" name="username" value={credentials.username} onChange={handleLoginChange}
                  className={`w-full h-12 px-4 rounded-lg text-xl font-medium text-black focus:outline-none focus:ring-2 focus:ring-[#b87050]/40 border transition-colors ${
                    (usernameError && usernameError !== '_hide') || credFailed || isLockedOut
                      ? 'bg-red-100 border-red-400'
                      : 'bg-white border-gray-300'
                  }`}
                  required
                  maxLength={254}
                  disabled={isLockedOut}
                />
                {(usernameError && usernameError !== '_hide') && <span className="text-red-500 text-xl font-medium tracking-wide">{usernameError}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xl font-medium tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} name="password" value={credentials.password} onChange={handleLoginChange}
                    className={`w-full h-12 px-4 pr-12 rounded-lg text-xl font-medium text-black focus:outline-none focus:ring-2 focus:ring-[#b87050]/40 border transition-colors ${
                      passwordError || credFailed || isLockedOut
                        ? 'bg-red-100 border-red-400'
                        : 'bg-white border-gray-300'
                    }`}
                    required
                    maxLength={64}
                    disabled={isLockedOut}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordError && <span className="text-red-500 text-xl font-medium tracking-wide">{passwordError}</span>}
              </div>
              <div className="flex flex-col items-center mt-4">
                <button
                  type="submit"
                  disabled={isLockedOut || isLoggingIn}
                  className={`text-white font-medium text-xl py-3 px-16 rounded-full transition-colors tracking-wide flex items-center gap-2 ${isLockedOut ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-[#b87050] hover:bg-[#9e5e3e]'}`}
                >
                  {isLoggingIn && (
                    <svg className="animate-spin h-5 w-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isLoggingIn ? 'Logging in...' : 'Log In'}
                </button>
              </div>
            </form>
            <button onClick={() => setCurrentView('passkey')} disabled={isLockedOut} className="text-xl text-gray-500 hover:text-gray-800 mt-6 transition-colors tracking-wide disabled:opacity-50">
              Forgot Password?
            </button>
          </div>
        )}

        {currentView === 'passkey' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-gray-800 text-xl mb-1 tracking-wide font-semibold">Admin Authorization Required</p>
            <p className="text-gray-500 text-xl mb-6 text-center leading-relaxed">
              {otpSentMessage ? otpSentMessage : "Please request a one-time Passkey\nto authorize a password reset."}
            </p>
            <form onSubmit={handlePasskeySubmit} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-2 w-full items-center">
                <label className="text-gray-800 text-xl font-medium tracking-wide self-start">
                  {passkeyError ? <span className="text-red-500">{passkeyError}</span> : 'Admin Passkey'}
                </label>

                <div className="relative flex justify-center gap-2.5 w-full my-2">
                  {[...Array(6)].map((_, index) => {
                    const char = passkeyInput[index] || '';
                    const isCurrent = index === passkeyInput.length;
                    const isLastAndFull = index === 5 && passkeyInput.length === 6;
                    const isActive = isOtpFocused && (isCurrent || isLastAndFull);

                    return (
                      <div
                        key={index}
                        className={`w-12 h-14 bg-white rounded-xl flex items-center justify-center text-2xl font-bold text-black border-2 transition-all ${
                          passkeyError
                            ? 'border-red-400 bg-red-50'
                            : isActive
                              ? 'border-[#b87050] ring-2 ring-[#b87050]/20'
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
                    value={passkeyInput}
                    onChange={handlePasskeyChange}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    maxLength={6}
                    disabled={!adminOTP}
                    autoComplete="one-time-code"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center mt-4">
                {!adminOTP ? (
                  <button
                    key="btn-req"
                    type="button"
                    onClick={handleRequestPasskey}
                    disabled={isSendingOTP}
                    className="bg-[#b87050] hover:bg-[#9e5e3e] text-white font-medium text-xl py-3 px-12 rounded-full transition-colors tracking-wide disabled:opacity-70"
                  >
                    {isSendingOTP ? 'Sending...' : 'Request'}
                  </button>
                ) : (
                  <button
                    key="btn-verify"
                    type="submit"
                    className="bg-[#b87050] hover:bg-[#9e5e3e] text-white font-medium text-xl py-3 px-12 rounded-full transition-colors tracking-wide"
                  >
                    Verify
                  </button>
                )}
              </div>
            </form>
            <button onClick={() => { setCurrentView('login'); setPasskeyError(''); setPasskeyInput(''); setOtpSentMessage(''); setAdminOTP(''); setOtpExpiry(0); }} className="text-xl text-gray-500 hover:text-gray-800 mt-6 transition-colors tracking-wide">
              Go Back
            </button>
          </div>
        )}

        {currentView === 'forgot' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            {successMessage ? (
              <div className="flex flex-col items-center w-full px-8">
                <h2 className="text-gray-800 text-3xl font-bold mb-4 tracking-wide">Link Sent!</h2>
                <p className="text-gray-500 text-xl mb-8 text-center leading-relaxed">
                  A secure password reset link has been<br/>sent to the requested email.
                </p>
                <button onClick={() => { setCurrentView('login'); setSuccessMessage(false); setResetError(false); setResetEmail(''); }} className="bg-[#b87050] hover:bg-[#9e5e3e] text-white font-medium text-xl py-3 w-full rounded-full transition-colors tracking-wide">
                  Return to Login
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-xl mb-6 text-center leading-relaxed tracking-wide">
                  Authorization successful. Enter the account<br/>email to send a secure reset link.
                </p>
                <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-5 px-8">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xl font-medium tracking-wide">
                      {resetError ? <span className="text-red-500">Email Not Found</span> : 'Email Address'}
                    </label>
                    <input
                      type="email" value={resetEmail} onChange={(e) => { setResetEmail(e.target.value); setResetError(false); }}
                      className={`w-full h-12 px-4 rounded-lg text-xl font-medium text-black focus:outline-none focus:ring-2 focus:ring-[#b87050]/40 border transition-colors ${resetError ? 'bg-red-50 border-red-400' : 'bg-white border-gray-300'}`}
                      required disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex flex-col items-center mt-4">
                    <button type="submit" disabled={isSubmitting} className="bg-[#b87050] hover:bg-[#9e5e3e] text-white font-medium text-xl py-3 px-10 rounded-full transition-colors tracking-wide disabled:opacity-70 flex items-center justify-center min-w-[200px]">
                      {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
                <button onClick={() => { setCurrentView('login'); setResetError(false); setResetEmail(''); }} disabled={isSubmitting} className="text-xl text-gray-500 hover:text-gray-800 mt-6 transition-colors tracking-wide disabled:opacity-50">
                  Go Back
                </button>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Force Password Change Modal ── */}
      {showForcePw && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] flex flex-col overflow-hidden">
            <div className="bg-[#b87050] px-8 py-5 flex items-center gap-3">
              <Lock size={22} className="text-white shrink-0" />
              <h3 className="text-xl font-semibold text-white">Password Change Required</h3>
            </div>
            <div className="px-8 py-6 flex flex-col gap-5">
              <p className="text-xl text-gray-600 leading-snug">
                This is your <span className="font-semibold text-gray-800">first time logging in</span>. For security, you must set a new password before continuing.
              </p>
              <form onSubmit={handleForcePwSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xl text-gray-600">New Password</label>
                  <div className="relative">
                    <input
                      type={showForcePwNew ? 'text' : 'password'}
                      value={forcePwNew}
                      onChange={e => { setForcePwNew(e.target.value); setForcePwErr(''); }}
                      placeholder="At least 8 characters"
                      disabled={forcePwSaving}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#b87050] pr-12 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForcePwNew(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showForcePwNew ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xl text-gray-600">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showForcePwCfm ? 'text' : 'password'}
                      value={forcePwConfirm}
                      onChange={e => { setForcePwConfirm(e.target.value); setForcePwErr(''); }}
                      placeholder="Re-enter new password"
                      disabled={forcePwSaving}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xl text-gray-700 outline-none focus:border-[#b87050] pr-12 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForcePwCfm(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showForcePwCfm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                {forcePwErr && (
                  <p className="text-red-500 text-xl">{forcePwErr}</p>
                )}
                <button
                  type="submit"
                  disabled={forcePwSaving}
                  className="mt-1 w-full bg-[#b87050] hover:bg-[#9e5e3e] text-white text-xl font-medium py-3 rounded-full transition-colors disabled:opacity-60"
                >
                  {forcePwSaving ? 'Saving...' : 'Set Password & Continue'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}