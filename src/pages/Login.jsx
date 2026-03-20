import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  
  // Track which view to show: 'login', 'passkey', or 'forgot'
  const [currentView, setCurrentView] = useState('login');

  // Track if there are errors
  const [loginError, setLoginError] = useState(false);
  const [passkeyError, setPasskeyError] = useState(false);
  const [resetError, setResetError] = useState(false);

  // State for Login View
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  // State for Admin Passkey View
  const [passkeyInput, setPasskeyInput] = useState('');

  // State for Forgot Password View
  const [forgotData, setForgotData] = useState({
    newPassword: '',
    retypePassword: ''
  });

  // --- HANDLERS ---
  const handleLoginChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    if (loginError) setLoginError(false);
  };

  const handlePasskeyChange = (e) => {
    setPasskeyInput(e.target.value);
    if (passkeyError) setPasskeyError(false);
  };

  const handleForgotChange = (e) => {
    setForgotData({ ...forgotData, [e.target.name]: e.target.value });
    if (resetError) setResetError(false);
  };

  // 1. Submit Login
  const handleLogin = (e) => {
    e.preventDefault();
    
    // Hardcoded Official Accounts
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      navigate('/admin');
    } else if (credentials.username === 'staff' && credentials.password === 'staff123') {
      navigate('/staff');
    } else {
      setLoginError(true);
    }
  };

  // 2. Submit Admin Passkey
  const handlePasskeySubmit = (e) => {
    e.preventDefault();
    
    // Hardcoded Admin Passkey for the mockup
    if (passkeyInput === '123456') {
      setCurrentView('forgot');
      setPasskeyInput('');
      setPasskeyError(false);
    } else {
      setPasskeyError(true);
    }
  };

  // 3. Submit New Password
  const handleResetPassword = (e) => {
    e.preventDefault();
    
    if (forgotData.newPassword !== forgotData.retypePassword) {
      setResetError(true);
      return;
    }
    
    if (forgotData.newPassword.length === 0) {
      alert("Please enter a new password.");
      return;
    }

    // Mockup success behavior
    alert("Password successfully reset! You can now log in.");
    setForgotData({ newPassword: '', retypePassword: '' });
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen w-full bg-[#1e1e1e] flex items-center justify-center font-sans">
      
      {/* Main Card Modal */}
      <div className="bg-[#333333] p-10 rounded-2xl shadow-2xl flex flex-col items-center w-[480px]">
        
        {/* Top Section: Logo & Titles (Shared across all views) */}
        <div className="flex items-center justify-center gap-8 mb-8 w-full">
          <img 
            src="/logo.png" 
            alt="Vanilla Brew Logo" 
            className="w-[180px] object-contain" 
          />
          <div className="flex flex-col items-center">
            <h1 className="text-white text-xl font-bold text-center leading-tight tracking-wider mb-3">
              SHOP<br />
              MANAGEMENT<br />
              SYSTEM
            </h1>
            <div className="flex gap-4">
              <img src="/coffee.png" alt="Coffee" className="w-5 h-5 object-contain" />
              <img src="/clipboard.png" alt="Clipboard" className="w-5 h-5 object-contain" />
              <img src="/monitor.png" alt="Monitor" className="w-5 h-5 object-contain" />
            </div>
          </div>
        </div>

        {/* --- DYNAMIC VIEW RENDERING --- */}
        
        {/* VIEW 1: LOGIN */}
        {currentView === 'login' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-gray-200 text-sm mb-6 tracking-wide">
              Please enter your credentials
            </p>

            <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">
                  {loginError ? 'Username (No Match)' : 'Username'}
                </label>
                <input 
                  type="text" 
                  name="username"
                  value={credentials.username}
                  onChange={handleLoginChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors ${
                    loginError ? 'bg-[#ffadad]' : 'bg-[#f0f0f0]'
                  }`}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={credentials.password}
                  onChange={handleLoginChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors ${
                    loginError ? 'bg-[#ffadad]' : 'bg-[#f0f0f0]'
                  }`}
                  required
                />
              </div>
              
              <div className="flex flex-col items-center mt-4">
                <button 
                  type="submit" 
                  className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-lg py-2.5 px-12 rounded-full transition-colors tracking-wide"
                >
                  Log In
                </button>
              </div>
            </form>

            <button 
              onClick={() => setCurrentView('passkey')}
              className="text-xs text-gray-300 hover:text-white mt-6 transition-colors tracking-wide"
            >
              Forgot Password?
            </button>
          </div>
        )}

        {/* VIEW 2: ADMIN PASSKEY */}
        {currentView === 'passkey' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-white text-sm mb-1 tracking-wide font-medium">
              Enter a valid Admin Passkey
            </p>
            <p className="text-gray-300 text-[13px] mb-6 text-center leading-relaxed">
              Please ask for your administrator to<br/>
              enter their Passkey for authorization<br/>
              to reset your password.
            </p>

            <form onSubmit={handlePasskeySubmit} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">
                  {passkeyError ? 'Admin Passkey (Invalid)' : 'Admin Passkey'}
                </label>
                <input 
                  type="password" 
                  value={passkeyInput}
                  onChange={handlePasskeyChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors text-center ${
                    passkeyError ? 'bg-[#ffadad]' : 'bg-[#f0f0f0]'
                  }`}
                  required
                />
              </div>
              
              <div className="flex flex-col items-center mt-4">
                <button 
                  type="submit" 
                  className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-lg py-2.5 px-12 rounded-full transition-colors tracking-wide"
                >
                  Enter
                </button>
              </div>
            </form>

            <button 
              onClick={() => {
                setCurrentView('login');
                setPasskeyError(false);
                setPasskeyInput('');
              }}
              className="text-xs text-gray-300 hover:text-white mt-6 transition-colors tracking-wide"
            >
              Go Back
            </button>
          </div>
        )}

        {/* VIEW 3: FORGOT PASSWORD RESET */}
        {currentView === 'forgot' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-gray-200 text-sm mb-6 tracking-wide">
              Enter new Password
            </p>

            <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">
                  {resetError ? 'New Password (Not Matched)' : 'New Password'}
                </label>
                <input 
                  type="password" 
                  name="newPassword"
                  value={forgotData.newPassword}
                  onChange={handleForgotChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors ${
                    resetError ? 'bg-[#ffadad]' : 'bg-[#f0f0f0]'
                  }`}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium tracking-wide">Re-Type Password</label>
                <input 
                  type="password" 
                  name="retypePassword"
                  value={forgotData.retypePassword}
                  onChange={handleForgotChange}
                  className={`w-full h-12 px-4 rounded-lg text-lg font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors ${
                    resetError ? 'bg-[#ffadad]' : 'bg-[#f0f0f0]'
                  }`}
                  required
                />
              </div>
              
              <div className="flex flex-col items-center mt-4">
                <button 
                  type="submit" 
                  className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-lg py-2.5 px-12 rounded-full transition-colors tracking-wide"
                >
                  Enter
                </button>
              </div>
            </form>

            <button 
              onClick={() => {
                setCurrentView('login');
                setResetError(false);
                setForgotData({ newPassword: '', retypePassword: '' });
              }}
              className="text-xs text-gray-300 hover:text-white mt-6 transition-colors tracking-wide"
            >
              Go Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}