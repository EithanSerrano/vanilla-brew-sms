import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase'; 

export default function ResetPassword() {
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // New states for verifying the link upon load
  const [isVerifying, setIsVerifying] = useState(true);
  const [linkError, setLinkError] = useState(false);

  // Automatically verify the code when the component mounts
  useEffect(() => {
    if (oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then(() => {
          setIsVerifying(false);
          setLinkError(false);
        })
        .catch((err) => {
          console.error("Verification Error: ", err);
          setIsVerifying(false);
          setLinkError(true);
        });
    } else {
      setIsVerifying(false);
    }
  }, [oobCode]);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleFinalReset = async (e) => {
    e.preventDefault();
    
    if (passwords.newPassword.trim() === '' || passwords.confirmPassword.trim() === '') {
      setError('Please fill out both fields.');
      return;
    }
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    // Updated constraints: 8-64 characters
    if (passwords.newPassword.length < 8 || passwords.newPassword.length > 64) {
      setError('Password must be between 8 and 64 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, passwords.newPassword);
      setIsSuccess(true);
    } catch (err) {
      console.error("Password Confirmation Error: ", err);
      if (err.code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new one.');
      } else if (err.code === 'auth/invalid-action-code') {
        setError('This reset link is invalid or has already been used.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password you entered is too weak.');
      } else {
        setError('An unexpected error occurred: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Screen for System Status Visibility
  if (isVerifying) {
    return (
      <div className="h-full w-full flex items-center justify-center font-sans z-10">
        <div className="bg-[#333333] p-10 rounded-2xl shadow-2xl flex flex-col items-center w-[480px]">
          <h2 className="text-white text-2xl font-bold mb-4 tracking-wide">Verifying Link...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3ca4c7] mb-4"></div>
        </div>
      </div>
    );
  }

  // Error Prevention Screen for Missing or Invalid Links
  if (!oobCode || linkError) {
    return (
      <div className="h-full w-full flex items-center justify-center font-sans z-10">
        <div className="bg-[#333333] p-10 rounded-2xl shadow-2xl flex flex-col items-center w-[480px]">
          <h2 className="text-white text-2xl font-bold mb-4 tracking-wide">Invalid or Expired Link</h2>
          <p className="text-gray-300 text-xl mb-8 text-center leading-relaxed">
            {linkError 
              ? "This reset link has expired or has already been used. Please request a new password reset link from the login screen." 
              : "No secure reset code was found. Please request a new password reset link from the login screen."}
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-xl py-3 w-full rounded-xl transition-colors tracking-wide"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center font-sans z-10">
      <div className="bg-[#333333] p-10 rounded-2xl shadow-2xl flex flex-col items-center w-[480px]">
        
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

        {isSuccess ? (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300 px-4">
            <h2 className="text-white text-3xl font-bold mb-4 tracking-wide text-center">Password Reset<br/>Complete!</h2>
            <p className="text-gray-300 text-xl mb-8 text-center leading-relaxed">
              Your password has been successfully updated. You can now log into your account using your new credentials.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-xl py-3 w-full rounded-xl transition-colors tracking-wide"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-gray-200 text-xl mb-6 tracking-wide text-center">
              Secure link verified. Please enter your new password below.
            </p>

            {error && (
              <div className="w-full bg-[#ffadad] text-[#b91c1c] text-xl font-bold text-center py-3 px-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleFinalReset} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xl font-medium tracking-wide">New Password</label>
                <input 
                  type="password" name="newPassword" value={passwords.newPassword} onChange={handleChange}
                  className="w-full h-12 px-4 rounded-lg text-xl font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors bg-[#f0f0f0]"
                  required disabled={isSubmitting}
                  maxLength={64}
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xl font-medium tracking-wide">Confirm Password</label>
                <input 
                  type="password" name="confirmPassword" value={passwords.confirmPassword} onChange={handleChange}
                  className="w-full h-12 px-4 rounded-lg text-xl font-medium text-black focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 transition-colors bg-[#f0f0f0]"
                  required disabled={isSubmitting}
                  maxLength={64}
                />
              </div>
              
              <div className="flex flex-col items-center mt-4">
                <button 
                  type="submit" disabled={isSubmitting}
                  className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium text-xl py-2.5 px-10 rounded-full transition-colors tracking-wide disabled:opacity-70 flex items-center justify-center min-w-[200px]"
                >
                  {isSubmitting ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}