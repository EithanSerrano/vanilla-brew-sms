import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CornerUpLeft } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

// --- FIXED: Imported onSnapshot ---
import { collection, query, orderBy, limit, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase'; 

export default function AdminRegistration() {
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState('list');
  const [accounts, setAccounts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    retypePassword: ''
  });

  // --- UPDATED: Real-Time Listener for the Accounts List ---
  useEffect(() => {
    if (currentView === 'list') {
      const usersRef = collection(db, 'users');
      // Sort by empId so they display in order (EMP001, EMP002, etc.)
      const q = query(usersRef, orderBy('empId', 'asc'));
      
      // onSnapshot keeps a live connection open to your database
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAccounts(usersList);
      }, (error) => {
        console.error("Error listening to accounts:", error);
      });

      // Cleanup the listener when you leave the 'list' view or page
      return () => unsubscribe();
    }
  }, [currentView]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateNextEmpId = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('empId', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return 'EMP001';
      }

      const lastDoc = querySnapshot.docs[0];
      const lastEmpId = lastDoc.data().empId;

      if (!lastEmpId) {
        return 'EMP001';
      }

      const lastNumber = parseInt(lastEmpId.replace('EMP', ''), 10);
      const nextNumber = lastNumber + 1;
      return `EMP${String(nextNumber).padStart(3, '0')}`;

    } catch (error) {
      console.error("Error generating Employee ID:", error);
      return `EMP${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`; 
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      alert("Please fill out all fields.");
      return;
    }
    if (formData.password !== formData.retypePassword) {
      alert("Passwords do not match!");
      return;
    }

    setIsSubmitting(true);

    try {
      const newEmpId = await generateNextEmpId();

      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // Notice this correctly sets them as 'Inactive' until they log in!
      await setDoc(doc(db, 'users', user.uid), {
        empId: newEmpId,
        name: formData.name,
        email: formData.email,
        role: 'staff',
        status: 'Inactive', 
        createdAt: new Date().toISOString()
      });

      setShowSuccessModal(true);

    } catch (error) {
      console.error("Error creating account:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert("This email is already registered!");
      } else if (error.code === 'auth/weak-password') {
        alert("Password should be at least 6 characters.");
      } else {
        alert("Failed to create account: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalDone = () => {
    setFormData({ name: '', email: '', password: '', retypePassword: '' });
    setShowSuccessModal(false);
    setCurrentView('list');
  };

  return (
    <div className="flex w-full h-full gap-6">
      <AdminSidebar activePage="registration" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-hidden">
        
        {/* VIEW 1: ACCOUNTS LIST */}
        {currentView === 'list' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
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

            <button 
              onClick={() => setCurrentView('create')}
              className="w-full bg-[#5a5a5a] hover:bg-[#6a6a6a] text-2xl font-medium py-6 rounded-xl mb-8 transition-colors tracking-wide"
            >
              Create new Account
            </button>

            <div className="flex-1 overflow-auto flex flex-col gap-4 pr-2">
              {accounts.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-lg italic">
                  Loading accounts or database is empty. Click above to create one.
                </div>
              ) : (
                accounts.map((account) => (
                  <div 
                    key={account.id} 
                    className="w-full bg-[#4a4a4a] rounded-xl p-6 flex items-center justify-between"
                  >
                    <div className="flex gap-8 items-center">
                      <span className="text-2xl font-bold tracking-wider text-[#3ca4c7]">
                        {account.empId || 'N/A'}
                      </span>
                      <span className="text-2xl font-medium">{account.name}</span>
                    </div>
                    <span className={`text-lg tracking-wide font-bold ${account.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                      {account.status || 'Inactive'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: CREATE ACCOUNT FORM */}
        {currentView === 'create' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex gap-4 mb-10">
              <button 
                onClick={() => setCurrentView('list')}
                disabled={isSubmitting}
                className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-3 rounded-lg transition-colors disabled:opacity-50"
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
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 disabled:opacity-70"
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
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 disabled:opacity-70"
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
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 disabled:opacity-70"
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
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-[#f0f0f0] rounded-xl px-6 text-black text-xl font-medium focus:outline-none focus:ring-4 focus:ring-[#3ca4c7]/50 disabled:opacity-70"
                  required
                />
              </div>

              <div className="flex justify-center mt-6">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#5a5a5a] hover:bg-[#6a6a6a] px-16 py-3 rounded-xl text-xl font-medium transition-colors tracking-wide disabled:opacity-50 flex items-center gap-3"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* OVERLAY MODAL: SUCCESS */}
        {showSuccessModal && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-[#333333] p-10 rounded-2xl w-[500px] shadow-2xl flex flex-col items-center text-center">
              
              <h3 className="text-3xl font-semibold tracking-wide mb-8 text-[#3ca4c7]">Account Created!</h3>
              
              <p className="text-lg text-gray-200 mb-6 leading-relaxed">
                The Account for <span className="font-bold text-white">{formData.name}</span> has been created and saved into the Database.
              </p>
              
              <p className="text-lg text-gray-200 mb-10 leading-relaxed">
                They can now log in using the email and password you just provided.
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
