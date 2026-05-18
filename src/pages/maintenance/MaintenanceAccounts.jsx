import AdminSidebar from '../../layouts/AdminSidebar';
import {
  WrenchIcon,
  CornerUpLeft,
  Info,
  UserRoundMinus,
  UserRoundPlus,
} from 'lucide-react';

export default function MaintenanceAccounts({
  currentView,
  handleBack,
  accounts,
  selectedAccount,
  setSelectedAccount,
  showStatusConfirm,
  setShowStatusConfirm,
  showStatusSuccess,
  setShowStatusSuccess,
  setAccounts,
}) {
  if (currentView !== 'manage-accounts') {
    return null;
  }

  return (
    <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
      <AdminSidebar activePage="maintenance" />
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
        <div className="flex gap-4 mb-10">
          <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={20} /></button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
            <WrenchIcon size={20} />
            <span>Maintenance &gt; Manage Accounts</span>
          </div>
        </div>

        <h1 className="text-4xl font-semibold mb-8 text-white">Manage Accounts</h1>

        <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444]">
          <div className="grid grid-cols-[1fr_3fr_1.5fr_1fr] bg-[#4a4a4a] p-4 text-xl font-medium border-b border-[#555]">
            <span className="text-center">No.</span>
            <span className="text-center">Name</span>
            <span className="text-center">Status</span>
            <span className="text-center">Action</span>
          </div>
          {accounts && accounts.map((acc) => (
            <div key={acc.id} className="grid grid-cols-[1fr_3fr_1.5fr_1fr] p-6 border-b border-[#444] items-center hover:bg-[#3d3d3d] transition-colors">
              <span className="text-center text-xl">{acc.id}</span>
              <span className="text-center text-xl font-medium">{acc.name}</span>
              <span className={`text-center text-xl font-bold ${acc.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                {acc.status}
              </span>
              <button 
                onClick={() => { setSelectedAccount(acc); setShowStatusConfirm(true); }}
                className="flex justify-center text-white-400 hover:text-white"
              >
                {acc.status === 'Active' ? <UserRoundMinus size={28} /> : <UserRoundPlus size={28} />}
              </button>
            </div>
          ))}
        </div>

        {showStatusConfirm && selectedAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowStatusConfirm(false)} />
            <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
              <button 
                onClick={() => setShowStatusConfirm(false)} 
                className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]"
              >
                <CornerUpLeft size={24} />
              </button>

              <h2 className="text-5xl font-medium mb-12">
                {selectedAccount.status === 'Active' ? 'Deactivate Account?' : 'Activate Account?'}
              </h2>

              <div className="w-full mb-12">
                <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center">
                  <span>Employee No.</span>
                  <span>Name</span>
                </div>
                <div className="grid grid-cols-2 text-3xl font-bold text-center">
                  <span>{selectedAccount.id}</span>
                  <span>{selectedAccount.name}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 mb-12 text-center">
                <div className="flex items-center gap-3 text-3xl font-bold">
                  <Info size={32} />
                  <span>Reminder</span>
                </div>
                <p className="text-2xl text-gray-300">
                  Are you sure you want to 
                  <span className="text-white font-bold"> {selectedAccount.status === 'Active' ? 'Deactivate' : 'Activate'} </span>
                  {selectedAccount.id}? 
                  <br />
                  This will update the employee's access permissions.
                </p>
              </div>

              <button 
                onClick={() => {
                  setShowStatusConfirm(false);
                  setShowStatusSuccess(true);
                }}
                className={`${selectedAccount.status === 'Active' ? 'bg-[#ca4646]' : 'bg-[#56a2d1]'} text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg transition-transform active:scale-95`}
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {showStatusSuccess && selectedAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10 text-center">
              <h2 className="text-6xl font-bold mb-10 text-white leading-tight">
                {selectedAccount.status === 'Active' ? 'Account Deactivated!' : 'Account Activated!'}
              </h2>
              <p className="text-3xl text-gray-300 mb-14 leading-relaxed">
                Employee {selectedAccount.id} has been {selectedAccount.status === 'Active' ? 'deactivated' : 'activated'}.
              </p>
              <button 
                onClick={() => {
                  setAccounts(accounts.map(a => 
                    a.id === selectedAccount.id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a
                  ));
                  setShowStatusSuccess(false);
                  setSelectedAccount(null);
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
