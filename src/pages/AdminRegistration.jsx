import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CornerUpLeft } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

export default function AdminRegistration() {
  const navigate = useNavigate();

  // State to manage the active view ('list' or 'create')
  const [currentView, setCurrentView] = useState('list');
  
  // Initialize accounts from localStorage if they exist, otherwise start empty
  const [accounts, setAccounts] = useState(() => {
    const savedAccounts = localStorage.getItem('vnl_brew_accounts');
    if (savedAccounts) {
      return JSON.parse(savedAccounts);
    }
    return [];
  });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    retypePassword: ''
  });
  
  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleCreateAccount = (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.email || !formData.password) {
      alert("Please fill out all fields.");
      return;
    }
    if (formData.password !== formData.retypePassword) {
      alert("Passwords do not match!");
      return;
    }

    // Show success modal first
    setShowSuccessModal(true);
  };

  // Handle closing the modal and saving the data
  const handleModalDone = () => {
    // Generate new ID (e.g., E001, E002) based on total accounts ever made
    const newIdNumber = accounts.length + 1;
    const newId = `E${String(newIdNumber).padStart(3, '0')}`;

    // Add to accounts array
    const newAccount = {
      id: newId,
      name: formData.name,
      status: 'Active'
    };
    
    const updatedAccounts = [...accounts, newAccount];
    
    // Save to React State AND Browser Local Storage
    setAccounts(updatedAccounts);
    localStorage.setItem('vnl_brew_accounts', JSON.stringify(updatedAccounts));

    // Reset form and go back to list
    setFormData({ name: '', email: '', password: '', retypePassword: '' });
    setShowSuccessModal(false);
    setCurrentView('list');
  };

  return (
    <div className="flex w-full h-full gap-6">
      <AdminSidebar />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-hidden">
        
        {/* VIEW 1: ACCOUNTS LIST */}
        {currentView === 'list' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Top Header Row */}
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => navigate('/admin')}
                className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-3 rounded-lg transition-colors"
              >
                <CornerUpLeft size={20} />
              </button>
              <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 font-medium tracking-wide">
                <UserPlus size={20} />
                Registration
              </div>
            </div>

            {/* Create New Account Button */}
            <button 
              onClick={() => setCurrentView('create')}
              className="w-full bg-[#5a5a5a] hover:bg-[#6a6a6a] text-2xl font-medium py-6 rounded-xl mb-8 transition-colors tracking-wide"
            >
              Create new Account
            </button>

            {/* Accounts List Container */}
            <div className="flex-1 overflow-auto flex flex-col gap-4 pr-2">
              {accounts.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-lg italic">
                  No accounts registered yet. Click above to create one.
                </div>
              ) : (
                accounts.map((account) => (
                  <div 
                    key={account.id} 
                    className="w-full bg-[#4a4a4a] rounded-xl p-6 flex items-center justify-between"
                  >
                    <div className="flex gap-8 items-center">
                      <span className="text-2xl font-bold tracking-wider">{account.id}</span>
                      <span className="text-2xl font-medium">{account.name}</span>
                    </div>
                    <span className="text-lg text-gray-200 tracking-wide">{account.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: CREATE ACCOUNT FORM */}
        {currentView === 'create' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Top Header Row (Breadcrumbs) */}
            <div className="flex gap-4 mb-10">
              <button 
                onClick={() => setCurrentView('list')}
                className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-3 rounded-lg transition-colors"
              >
                <CornerUpLeft size={20} />
              </button>
              <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 font-medium tracking-wide">
                <UserPlus size={20} />
                Registration &gt; Create Account
              </div>
            </div>

            <h2 className="text-4xl font-semibold mb-10 tracking-wide">New Account</h2>

            <form onSubmit={handleCreateAccount} className="w-full max-w-[1000px] flex flex-col gap-8">
              
              <div className="flex items-center gap-6">
                <label className="w-32 text-xl font-medium tracking-wide">Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50"
                  required
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="w-32 text-xl font-medium tracking-wide">Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50"
                  required
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="w-32 text-xl font-medium tracking-wide">Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50"
                  required
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="w-32 text-xl font-medium leading-tight tracking-wide">Re-Type<br/>Password</label>
                <input 
                  type="password" 
                  name="retypePassword"
                  value={formData.retypePassword}
                  onChange={handleChange}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50"
                  required
                />
              </div>

              <div className="flex justify-center mt-6">
                <button 
                  type="submit"
                  className="bg-[#5a5a5a] hover:bg-[#6a6a6a] px-16 py-3 rounded-xl text-xl font-medium transition-colors tracking-wide"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* OVERLAY MODAL: SUCCESS */}
        {showSuccessModal && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-[#333333] p-10 rounded-2xl w-[500px] shadow-2xl flex flex-col items-center text-center">
              
              <h3 className="text-3xl font-semibold tracking-wide mb-8">Account Created</h3>
              
              <p className="text-lg text-gray-200 mb-6 leading-relaxed">
                The Account for <span className="font-bold text-white">{formData.name}</span> has been created and saved into the Database.
              </p>
              
              <p className="text-lg text-gray-200 mb-10 leading-relaxed">
                The LogIn Credentials for {formData.name} has been sent to their personal email address.
              </p>

              <button 
                onClick={handleModalDone}
                className="bg-[#5a5a5a] hover:bg-[#6a6a6a] px-10 py-3 rounded-xl text-xl font-medium transition-colors tracking-wide"
              >
                Done
              </button>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}