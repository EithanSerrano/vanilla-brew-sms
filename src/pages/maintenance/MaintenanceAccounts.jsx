import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminSidebar from '../../layouts/AdminSidebar';
import {
  WrenchIcon,
  CornerUpLeft,
  Info,
  UserRoundMinus,
  UserRoundPlus,
} from 'lucide-react';


export default function MaintenanceAccounts({ currentView, handleBack }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showStatusSuccess, setShowStatusSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  // Track the new status applied so modals always show the correct (post-toggle) value
  const [appliedStatus, setAppliedStatus] = useState(null);


  useEffect(() => {
    if (currentView === 'manage-accounts') {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        // Map the docs and filter out the Admin account so it cannot be modified
        const usersList = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(acc => acc.role !== 'admin' && acc.name !== 'ADMIN'); // Hides the owner account
       
        usersList.sort((a, b) => {
          const idA = a.empId || '';
          const idB = b.empId || '';
          return idA.localeCompare(idB);
        });
       
        setAccounts(usersList);
      }, (error) => {
        console.error("Error listening to accounts:", error);
      });


      return () => unsubscribe();
    }
  }, [currentView]);


  const handleStatusToggle = async () => {
    if (!selectedAccount) return;
    setIsUpdating(true);
   
    try {
      // Normalize: treat missing/undefined status as 'Active' (same as the list render does)
      const currentStatus = selectedAccount.status === 'Inactive' ? 'Inactive' : 'Active';
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const userRef = doc(db, 'users', selectedAccount.id);
     
      await updateDoc(userRef, { status: newStatus });


      // Update selectedAccount so the success modal reflects the real new state
      setSelectedAccount(prev => ({ ...prev, status: newStatus }));
      // appliedStatus drives the success modal message so it always shows what just happened
      setAppliedStatus(newStatus);
     
      setShowStatusConfirm(false);
      setShowStatusSuccess(true);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update user status.");
    } finally {
      setIsUpdating(false);
    }
  };


  if (currentView !== 'manage-accounts') {
    return null;
  }


  return (
    <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
      <AdminSidebar activePage="maintenance" />
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
        <div className="flex gap-4 mb-10">
          <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]">
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
            <WrenchIcon size={20} />
            <span>Maintenance &gt; Manage Accounts</span>
          </div>
        </div>


        <h1 className="text-4xl font-semibold mb-8 text-white">Manage Accounts</h1>


        <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444]">
          <div className="grid grid-cols-[1fr_3fr_1.5fr_1fr] bg-[#4a4a4a] p-4 text-xl font-medium border-b border-[#555]">
            <span className="text-center">No. / ID</span>
            <span className="text-center">Name</span>
            <span className="text-center">Status</span>
            <span className="text-center">Action</span>
          </div>
          {accounts.length > 0 ? (
            accounts.map((acc) => (
              <div key={acc.id} className="grid grid-cols-[1fr_3fr_1.5fr_1fr] p-6 border-b border-[#444] items-center hover:bg-[#3d3d3d] transition-colors">
               
                <span className="text-center text-xl font-bold tracking-wider text-[#3ca4c7]">
                  {acc.empId || 'N/A'}
                </span>
               
                <span className="text-center text-xl font-medium">{acc.name || acc.username || 'N/A'}</span>


                {/* --- ACCOUNT STATUS (ACTIVATED / DEACTIVATED) --- */}
                <span className="flex items-center justify-center">
                  <span className={`text-xl font-bold ${(acc.status || 'Active') === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                    {(acc.status || 'Active') === 'Active' ? 'Activated' : 'Deactivated'}
                  </span>
                </span>


                {/* --- ADMIN AUTHORIZATION ACTION --- */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => { setSelectedAccount({ ...acc, status: acc.status || 'Active' }); setShowStatusConfirm(true); }}
                    className="flex justify-center transition-transform active:scale-90"
                    title={(acc.status || 'Active') === 'Active' ? 'Account Activated — Click to Deactivate' : 'Account Deactivated — Click to Activate'}
                  >
                    {(acc.status || 'Active') === 'Active' ? (
                      <UserRoundPlus size={28} className="text-green-400 hover:text-green-300" />
                    ) : (
                      <UserRoundMinus size={28} className="text-red-400 hover:text-red-300" />
                    )}
                  </button>
                </div>


              </div>
            ))
          ) : (
             <div className="p-8 text-center text-gray-400 text-xl">Loading accounts from database...</div>
          )}
        </div>


        {/* --- CONFIRMATION MODAL --- */}
        {showStatusConfirm && selectedAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !isUpdating && setShowStatusConfirm(false)} />
            <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
              <button
                onClick={() => setShowStatusConfirm(false)}
                disabled={isUpdating}
                className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a] disabled:opacity-50"
              >
                <CornerUpLeft size={24} />
              </button>


              <h2 className="text-5xl font-medium mb-12">
                {(selectedAccount.status === 'Inactive') ? 'Activate Account?' : 'Deactivate Account?'}
              </h2>


              <div className="w-full mb-12">
                <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center">
                  <span>Employee ID</span>
                  <span>Name</span>
                </div>
                <div className="grid grid-cols-2 text-2xl font-bold text-center">
                  <span className="font-mono text-[#3ca4c7]">{selectedAccount.empId || 'N/A'}</span>
                  <span>{selectedAccount.name || selectedAccount.username || 'N/A'}</span>
                </div>
              </div>


              <div className="flex flex-col items-center gap-4 mb-12 text-center">
                <div className="flex items-center gap-3 text-3xl font-bold">
                  <Info size={32} />
                  <span>Reminder</span>
                </div>
                <p className="text-2xl text-gray-300">
                  Are you sure you want to
                  <span className="text-white font-bold"> {(selectedAccount.status === 'Inactive') ? 'Activate' : 'Deactivate'} </span>
                  this account?
                  <br />
                  This will instantly update their access permissions.
                </p>
              </div>


              <button
                onClick={handleStatusToggle}
                disabled={isUpdating}
                className={`${(selectedAccount.status === 'Inactive') ? 'bg-[#56a2d1] hover:bg-[#4383a8]' : 'bg-[#ca4646] hover:bg-[#a13838]'} text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100`}
              >
                {isUpdating ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}


        {/* --- SUCCESS MODAL --- */}
        {showStatusSuccess && selectedAccount && appliedStatus && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10 text-center">
              <h2 className="text-6xl font-bold mb-10 text-white leading-tight">
                {appliedStatus === 'Active' ? 'Account Activated!' : 'Account Deactivated!'}
              </h2>
              <p className="text-3xl text-gray-300 mb-14 leading-relaxed">
                Employee <span className="font-bold text-white">{selectedAccount.empId || 'N/A'}</span> has been successfully {appliedStatus === 'Active' ? 'activated' : 'deactivated'} in the database.
              </p>
              <button
                onClick={() => {
                  setShowStatusSuccess(false);
                  setSelectedAccount(null);
                  setAppliedStatus(null);
                }}
                className="bg-[#4a4a4a] text-white text-3xl font-bold py-5 px-24 rounded-2xl hover:bg-[#5a5a5a] transition-all"
              >
                Return
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

