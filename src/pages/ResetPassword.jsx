import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
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

    if (passwords.newPassword.length < 8 || passwords.newPassword.length > 64) {
      setError('Password must be between 8 and 64 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, passwords.newPassword);
      setIsSuccess(true);
    } catch (err) {
      console.error('Password Confirmation Error: ', err);
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
          <h2 className="text-white text-2xl font-bold mb-4 tracking-wide">Invalid Link</h2>
          <p className="text-gray-300 text-xl mb-8 text-center leading-relaxed">
            No secure reset code was found. Please request a new password reset link from the login screen.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-[#b87050] hover:bg-[#9e5e3e] text-white font-medium text-xl py-3 w-full rounded-full transition-colors tracking-wide"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full flex items-center justify-center font-sans"
      style={{ background: 'linear-gradient(135deg, #d4a07a 0%, #7a3018 100%)' }}
    >
      <div className="bg-white p-10 rounded-2xl shadow-2xl flex flex-col items-center w-[480px]">

        <img src="/VNLBrewIcon.png" alt="Vanilla Brew Shop Management System" className="w-full max-w-[380px] object-contain mb-6" />

        {isSuccess ? (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300 px-4">
            <h2 className="text-gray-800 text-3xl font-bold mb-4 tracking-wide text-center">
              Password Reset<br />Complete!
            </h2>
            <p className="text-gray-500 text-xl mb-8 text-center leading-relaxed">
              Your password has been successfully updated. You can now log in using your new credentials.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-[#b87050] hover:bg-[#9e5e3e] text-white font-medium text-xl py-3 w-full rounded-full transition-colors tracking-wide"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <p className="text-gray-500 text-xl mb-6 tracking-wide text-center">
              Secure link verified. Please enter your new password below.
            </p>

            {error && (
              <div className="w-full bg-red-100 border border-red-400 text-red-600 text-xl font-medium text-center py-3 px-4 rounded-lg mb-4 tracking-wide">
                {error}
              </div>
            )}

            <form onSubmit={handleFinalReset} className="w-full flex flex-col gap-5 px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xl font-medium tracking-wide">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handleChange}
                    className={`w-full h-12 px-4 pr-12 rounded-lg text-xl font-medium text-black focus:outline-none focus:ring-2 focus:ring-[#b87050]/40 border transition-colors ${
                      error ? 'bg-red-100 border-red-400' : 'bg-white border-gray-300'
                    }`}
                    required
                    disabled={isSubmitting}
                    maxLength={64}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xl font-medium tracking-wide">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handleChange}
                    className={`w-full h-12 px-4 pr-12 rounded-lg text-xl font-medium text-black focus:outline-none focus:ring-2 focus:ring-[#b87050]/40 border transition-colors ${
                      error ? 'bg-red-100 border-red-400' : 'bg-white border-gray-300'
                    }`}
                    required
                    disabled={isSubmitting}
                    maxLength={64}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center mt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#b87050] hover:bg-[#9e5e3e] text-white font-medium text-xl py-3 px-10 rounded-full transition-colors tracking-wide disabled:opacity-70 flex items-center justify-center min-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white shrink-0 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}