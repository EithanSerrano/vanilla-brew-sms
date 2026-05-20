import AdminSidebar from '../../layouts/AdminSidebar';
import {
  WrenchIcon,
  CornerUpLeft,
  RotateCcw,
  Info,
} from 'lucide-react';

export default function MaintenanceRetrieve({
  currentView,
  handleBack,
  archivedMenuItems,
  archivedItems,
  archivedIngredients,
  selectedRetrieveMenu,
  setSelectedRetrieveMenu,
  showRetrieveMenuConfirm,
  setShowRetrieveMenuConfirm,
  showRetrieveMenuSuccess,
  setShowRetrieveMenuSuccess,
  selectedRetrieveItem,
  setSelectedRetrieveItem,
  showRetrieveItemConfirm,
  setShowRetrieveItemConfirm,
  showRetrieveItemSuccess,
  setShowRetrieveItemSuccess,
  selectedRetrieveIng,
  setSelectedRetrieveIng,
  showRetrieveIngConfirm,
  setShowRetrieveIngConfirm,
  showRetrieveIngSuccess,
  setShowRetrieveIngSuccess,
  setArchivedMenuItems,
  setArchivedItems,
  setArchivedIngredients,
  setActiveMenuItems,
  setActiveItems,
  setActiveIngredients,
  onRecordTransaction,
}) {
  if (currentView === 'retrieve-menu-item') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={20} /></button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span>Maintenance &gt; Retrieve &gt; Menu Item</span>
            </div>
          </div>
          <h1 className="text-4xl font-semibold mb-8">Retrieve Menu Item</h1>

          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555] text-center">
              <span>No.</span><span>Menu Item Name</span><span></span>
            </div>
            {archivedMenuItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{item.id}</span>
                <span className="text-center text-xl font-medium">{item.name}</span>
                <button onClick={() => { setSelectedRetrieveMenu(item); setShowRetrieveMenuConfirm(true); }} className="flex justify-center text-gray-300 hover:text-green-400"><RotateCcw size={28} /></button>
              </div>
            ))}
          </div>

          {showRetrieveMenuConfirm && selectedRetrieveMenu && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowRetrieveMenuConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowRetrieveMenuConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={24} /></button>
                <h2 className="text-5xl font-medium mb-12">Retrieve Menu Item?</h2>
                <div className="w-full mb-12">
                  <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center"><span>No.</span><span>Name</span></div>
                  <div className="grid grid-cols-2 text-3xl font-bold text-center"><span>{selectedRetrieveMenu.id}</span><span>{selectedRetrieveMenu.name}</span></div>
                </div>
                <div className="flex flex-col items-center gap-4 mb-12 text-center">
                  <div className="flex items-center gap-3 text-3xl font-bold"><Info size={32} /><span>Reminder</span></div>
                  <p className="text-2xl text-gray-300">Are you sure you want to <span className="text-white font-bold">Retrieve</span> {selectedRetrieveMenu.id}? It will be available for <span className="text-white font-bold">POS Module.</span></p>
                </div>
                <button 
                  onClick={() => {
                    setArchivedMenuItems(prev => prev.filter(i => i.id !== selectedRetrieveMenu.id));
                    setActiveMenuItems(prev => [...prev, { ...selectedRetrieveMenu, archived: false }]);
                    onRecordTransaction?.({
                      action: 'Retrieved',
                      entityType: 'Menu Item',
                      entityId: selectedRetrieveMenu.id,
                      entityName: selectedRetrieveMenu.name,
                      summary: `Retrieved Menu Item ${selectedRetrieveMenu.name} (${selectedRetrieveMenu.id})`,
                    });
                    setShowRetrieveMenuConfirm(false);
                    setShowRetrieveMenuSuccess(true);
                  }}
                  className="bg-[#166534] text-white text-3xl font-bold py-5 px-24 rounded-2xl"
                >Confirm</button>
              </div>
            </div>
          )}

          {showRetrieveMenuSuccess && selectedRetrieveMenu && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-center">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-2xl flex flex-col items-center relative border border-[#444] z-10">
                <h2 className="text-5xl font-bold mb-10 text-white">Menu Item Retrieved</h2>
                <p className="text-2xl text-gray-300 mb-12"><span className="font-bold text-white text-4xl block mb-4">{selectedRetrieveMenu.id}</span> has been successfully <span className="text-white font-semibold">Retrieved.</span></p>
                <button onClick={() => { setShowRetrieveMenuSuccess(false); setSelectedRetrieveMenu(null); }} className="bg-[#5a5a5a] text-white text-2xl font-bold py-5 px-24 rounded-xl">Return</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (currentView === 'retrieve-item') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={20} /></button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span>Maintenance &gt; Retrieve &gt; Item</span>
            </div>
          </div>
          <h1 className="text-4xl font-semibold mb-8">Retrieve Item</h1>

          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555] text-center">
              <span>No.</span><span>Item Name</span><span></span>
            </div>
            {archivedItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{item.id}</span>
                <span className="text-center text-xl font-medium">{item.name}</span>
                <button onClick={() => { setSelectedRetrieveItem(item); setShowRetrieveItemConfirm(true); }} className="flex justify-center text-gray-300 hover:text-green-400"><RotateCcw size={28} /></button>
              </div>
            ))}
          </div>

          {showRetrieveItemConfirm && selectedRetrieveItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowRetrieveItemConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowRetrieveItemConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={24} /></button>
                <h2 className="text-5xl font-medium mb-12">Retrieve Item?</h2>
                <div className="w-full mb-12">
                  <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center"><span>No.</span><span>Name</span></div>
                  <div className="grid grid-cols-2 text-3xl font-bold text-center"><span>{selectedRetrieveItem.id}</span><span>{selectedRetrieveItem.name}</span></div>
                </div>
                <div className="flex flex-col items-center gap-4 mb-12 text-center">
                  <div className="flex items-center gap-3 text-3xl font-bold"><Info size={32} /><span>Reminder</span></div>
                  <p className="text-2xl text-gray-300">Are you sure you want to <span className="text-white font-bold">Retrieve</span> {selectedRetrieveItem.id}? It will be available on the <span className="text-white font-bold">Inventory Module.</span></p>
                </div>
                <button 
                  onClick={() => {
                    setArchivedItems(prev => prev.filter(i => i.id !== selectedRetrieveItem.id));
                    setActiveItems(prev => [...prev, { ...selectedRetrieveItem, archived: false }]);
                    onRecordTransaction?.({
                      action: 'Retrieved',
                      entityType: 'Item',
                      entityId: selectedRetrieveItem.id,
                      entityName: selectedRetrieveItem.name,
                      summary: `Retrieved Item ${selectedRetrieveItem.name} (${selectedRetrieveItem.id})`,
                    });
                    setShowRetrieveItemConfirm(false);
                    setShowRetrieveItemSuccess(true);
                  }}
                  className="bg-[#166534] text-white text-3xl font-bold py-5 px-24 rounded-2xl"
                >Confirm</button>
              </div>
            </div>
          )}

          {showRetrieveItemSuccess && selectedRetrieveItem && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-center">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-2xl flex flex-col items-center relative border border-[#444] z-10">
                <h2 className="text-5xl font-bold mb-10 text-white">Item Retrieved</h2>
                <p className="text-2xl text-gray-300 mb-12"><span className="font-bold text-white text-4xl block mb-4">{selectedRetrieveItem.id}</span> has been successfully <span className="text-white font-semibold">Retrieved.</span></p>
                <button onClick={() => { setShowRetrieveItemSuccess(false); setSelectedRetrieveItem(null); }} className="bg-[#5a5a5a] text-2xl font-bold py-5 px-24 rounded-xl">Return</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (currentView === 'retrieve-ingredient') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={20} /></button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span>Maintenance &gt; Retrieve &gt; Ingredient</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">Retrieve Ingredient</h1>

          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555] text-center">
              <span>No.</span><span>Ingredient Name</span><span></span>
            </div>
            {archivedIngredients.map((ing) => (
              <div key={ing.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{ing.id}</span>
                <span className="text-center text-xl font-medium">{ing.name}</span>
                <button 
                  onClick={() => { setSelectedRetrieveIng(ing); setShowRetrieveIngConfirm(true); }}
                  className="flex justify-center text-gray-303 hover:text-green-400"
                >
                  <RotateCcw size={28} />
                </button>
              </div>
            ))}
          </div>

          {showRetrieveIngConfirm && selectedRetrieveIng && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowRetrieveIngConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowRetrieveIngConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={24} /></button>
                <h2 className="text-5xl font-medium mb-12">Retrieve Ingredient?</h2>
                <div className="w-full mb-12">
                  <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center"><span>No.</span><span>Name</span></div>
                  <div className="grid grid-cols-2 text-3xl font-bold text-center"><span>{selectedRetrieveIng.id}</span><span>{selectedRetrieveIng.name}</span></div>
                </div>
                <div className="flex flex-col items-center gap-4 mb-12 text-center">
                  <div className="flex items-center gap-3 text-3xl font-bold"><Info size={32} /><span>Reminder</span></div>
                  <p className="text-2xl text-gray-300">Are you sure you want to <span className="text-white font-bold">Retrieve</span> {selectedRetrieveIng.id}? It will be available for <span className="text-white font-bold">Menu Item creation.</span></p>
                </div>
                <button 
                  onClick={() => {
                    setArchivedIngredients(prev => prev.filter(i => i.id !== selectedRetrieveIng.id));
                    setActiveIngredients(prev => [...prev, { ...selectedRetrieveIng, archived: false }]);
                    onRecordTransaction?.({
                      action: 'Retrieved',
                      entityType: 'Ingredient',
                      entityId: selectedRetrieveIng.id,
                      entityName: selectedRetrieveIng.name,
                      summary: `Retrieved Ingredient ${selectedRetrieveIng.name} (${selectedRetrieveIng.id})`,
                    });
                    setShowRetrieveIngConfirm(false);
                    setShowRetrieveIngSuccess(true);
                  }}
                  className="bg-[#166534] text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >Confirm</button>
              </div>
            </div>
          )}

          {showRetrieveIngSuccess && selectedRetrieveIng && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-2xl flex flex-col items-center relative border border-[#444] z-10 text-center">
                <h2 className="text-5xl font-bold mb-10">Ingredient Retrieved</h2>
                <p className="text-2xl text-gray-300 mb-12"><span className="font-bold text-white text-4xl block mb-4">{selectedRetrieveIng.id}</span> has been successfully <span className="text-white font-semibold">Retrieved.</span></p>
                <button onClick={() => { setShowRetrieveIngSuccess(false); setSelectedRetrieveIng(null); }} className="bg-[#5a5a5a] text-2xl font-bold py-5 px-24 rounded-xl">Return</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
