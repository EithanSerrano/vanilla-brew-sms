import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Login() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('login');

  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passkeyError, setPasskeyError] = useState(false);
  const [resetError, setResetError] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  // Global Session Lockout State
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const [passkeyInput, setPasskeyInput] = useState('');
  const [resetEmail, setResetEmail] = useState('');

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
  };

  const handlePasskeyChange = (e) => {
    setPasskeyInput(e.target.value);
    if (passkeyError) setPasskeyError(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutUntil > Date.now()) return;
    
    setUsernameError('');
    setPasswordError('');
    
    const trimmedUsername = credentials.username.trim();
    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validation Check
    if (trimmedUsername.length < 6 || trimmedUsername.length > 254 || !emailRegex.test(trimmedUsername)) {
      setUsernameError("Invalid email (6-254 chars)");
      isValid = false;
    }
    if (credentials.password.length < 8 || credentials.password.length > 64) {
      setPasswordError("Password must be 8-64 chars");
      isValid = false;
    }

    // If validation fails, increment attempts and trigger error UI
    if (!isValid) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        setLockoutUntil(Date.now() + 30000);
        alert("Locked Out: Too many invalid attempts. Please wait 30 seconds.");
        
        /* // EMAILJS LOGIC KEPT AS COMMENT
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
        */
      }
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedUsername, credentials.password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        await updateDoc(userDocRef, { status: 'Active' });
        setAttempts(0); // Reset attempts on success

        if (userData.role === 'admin') {
          navigate('/admin');
        } else if (userData.role === 'staff') {
          navigate('/staff');
        } else {
          setUsernameError("Unauthorized role");
        }
      } else {
        throw new Error("Document not found");
      }
    } catch (error) {
      console.error("Login error:", error);
      
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        setLockoutUntil(Date.now() + 30000);
        alert("Locked Out: Too many failed attempts. Please wait 30 seconds.");
        
        /* // EMAILJS LOGIC KEPT AS COMMENT
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
        */
      } else {
        alert(`Login Failed: Incorrect credentials. (${newAttempts}/3 attempts)`);
      }
    }
  };

  const handlePasskeySubmit = (e) => {
    e.preventDefault();
    if (passkeyInput === 'VNLADMIN001') {
      setCurrentView('forgot');
      setPasskeyInput('');
      setPasskeyError(false);
    } else {
      setPasskeyError(true);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetEmail.trim() === '') {
      setResetError(true);
      return;
    }
    setIsSubmitting(true);
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", resetEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Account Not Found: There is no registered staff member with this email address.");
        setResetError(true);
        setIsSubmitting(false);
        return; 
      }

      const currentDomain = window.location.origin; 
      const actionCodeSettings = {
        url: `${currentDomain}/reset-password`, 
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, resetEmail.trim(), actionCodeSettings);
      setSuccessMessage(true);

    } catch (error) {
      console.error("Firebase Reset Error:", error);
      if (error.code === 'auth/user-not-found') {
        alert("This email is not registered in the authentication system.");
      } else if (error.code === 'auth/invalid-email') {
        alert("The email address is improperly formatted.");
      } else {
        alert("An error occurred: " + error.message);
      }
      setResetError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLockedOut = lockoutUntil > Date.now();

  return (
    <div className="h-full w-full flex items-center justify-center font-sans">
      <div className="bg-[#333333] p-10 rounded-2xl shadow-2xl flex flex-col items-center w-[480px] z-10">
        
        <div className="flex items-center justify-center gap-8 mb-8 w-full">
          <img src="/logo.png" alt="Vanilla Brew Logo" className="w-[180px] object-contain" />
          <div className="flex flex-col items-center">
            <h1 className="text-white text-xl font-bold text-center leading-tight tracking-wider mb-3">
              SHOP<br />MANAGEMENT<br />SYSTEM
            </h1>
            <div className="flex gap-4">
              <img src="/coffee.png" alt="Coffee" className="w-5 h-5 object-contain" />
              <img src="/clipboard.png" alt="Clipboard" className="w-5 h-5 object-contain" />
              <img src="/monitor.png" alt="Monitor" className="w-5 h-5 object-contain" />
            </div>
          </div>
        </div>

        {currentView === 'login' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-gray-200 text-sm mb-6 tracking-wide">Please enter your credentials</p>
            <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">Username</label>
                <input 
                  type="text" name="username" value={credentials.username} onChange={handleLoginChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors ${usernameError ? 'bg-[#ffadad] border-2 border-[#e63946]' : 'bg-[#f0f0f0]'}`}
                  required
                  maxLength={254}
                  disabled={isLockedOut}
                />
                {usernameError && <span className="text-[#ffadad] text-xs font-medium tracking-wide">{usernameError}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">Password</label>
                <input 
                  type="password" name="password" value={credentials.password} onChange={handleLoginChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors ${passwordError ? 'bg-[#ffadad] border-2 border-[#e63946]' : 'bg-[#f0f0f0]'}`}
                  required
                  maxLength={64}
                  disabled={isLockedOut}
                />
                {passwordError && <span className="text-[#ffadad] text-xs font-medium tracking-wide">{passwordError}</span>}
              </div>
              <div className="flex flex-col items-center mt-4">
                <button 
                  type="submit" 
                  disabled={isLockedOut}
                  className={`bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-lg py-2.5 px-12 rounded-full transition-colors tracking-wide ${isLockedOut ? 'opacity-50 cursor-not-allowed bg-[#621b1b] hover:bg-[#621b1b]' : ''}`}
                >
                  {isLockedOut ? `Locked (${countdown}s)` : 'Log In'}
                </button>
              </div>
            </form>
            <button onClick={() => setCurrentView('passkey')} disabled={isLockedOut} className="text-xs text-gray-300 hover:text-white mt-6 transition-colors tracking-wide disabled:opacity-50">
              Forgot Password?
            </button>
          </div>
        )}

        {currentView === 'passkey' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-white text-sm mb-1 tracking-wide font-medium">Enter a valid Admin Passkey</p>
            <p className="text-gray-300 text-[13px] mb-6 text-center leading-relaxed">
              Please ask for your administrator to<br/>enter their Passkey for authorization<br/>to reset your password.
            </p>
            <form onSubmit={handlePasskeySubmit} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">
                  {passkeyError ? 'Admin Passkey (Invalid)' : 'Admin Passkey'}
                </label>
                <input 
                  type="password" value={passkeyInput} onChange={handlePasskeyChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors text-center ${passkeyError ? 'bg-[#ffadad]' : 'bg-[#f0f0f0]'}`}
                  required
                />
              </div>
              <div className="flex flex-col items-center mt-4">
                <button type="submit" className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-lg py-2.5 px-12 rounded-full transition-colors tracking-wide">
                  Enter
                </button>
              </div>
            </form>
            <button onClick={() => { setCurrentView('login'); setPasskeyError(false); setPasskeyInput(''); }} className="text-xs text-gray-300 hover:text-white mt-6 transition-colors tracking-wide">
              Go Back
            </button>
          </div>
        )}

        {currentView === 'forgot' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            {successMessage ? (
              <div className="flex flex-col items-center w-full px-8">
                <h2 className="text-white text-3xl font-bold mb-4 tracking-wide">Link Sent!</h2>
                <p className="text-gray-300 text-[15px] mb-8 text-center leading-relaxed">
                  A secure password reset link has been<br/>sent to the requested email.
                </p>
                <button onClick={() => { setCurrentView('login'); setSuccessMessage(false); setResetError(false); setResetEmail(''); }} className="bg-[#505050] hover:bg-[#666666] text-white font-medium text-lg py-3 w-full rounded-xl transition-colors tracking-wide">
                  Return to Login
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-200 text-[14px] mb-6 text-center leading-relaxed tracking-wide">
                  Authorization successful. Enter the account<br/>email to send a secure reset link.
                </p>
                <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-5 px-8">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white text-sm font-medium tracking-wide">
                      {resetError ? 'Email Address (Not Found)' : 'Email Address'}
                    </label>
                    <input 
                      type="email" value={resetEmail} onChange={(e) => { setResetEmail(e.target.value); setResetError(false); }}
                      className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors ${resetError ? 'bg-[#ffadad]' : 'bg-[#f0f0f0]'}`}
                      required disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex flex-col items-center mt-4">
                    <button type="submit" disabled={isSubmitting} className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-lg py-2.5 px-10 rounded-full transition-colors tracking-wide disabled:opacity-70 flex items-center justify-center min-w-[200px]">
                      {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
                <button onClick={() => { setCurrentView('login'); setResetError(false); setResetEmail(''); }} disabled={isSubmitting} className="text-xs text-gray-300 hover:text-white mt-6 transition-colors tracking-wide disabled:opacity-50">
                  Go Back
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
