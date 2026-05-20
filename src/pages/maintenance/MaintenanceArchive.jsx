import AdminSidebar from '../../layouts/AdminSidebar';
import { 
  WrenchIcon,
  CornerUpLeft,
  Archive,
  Info,
} from 'lucide-react';

export default function MaintenanceArchive({
  currentView,
  handleBack,
  activeMenuItems,
  activeItems,
  activeIngredients,
  selectedArchiveMenuItem,
  setSelectedArchiveMenuItem,
  showMenuConfirm,
  setShowMenuConfirm,
  showMenuSuccess,
  setShowMenuSuccess,
  selectedArchiveItem,
  setSelectedArchiveItem,
  showItemConfirm,
  setShowItemConfirm,
  showItemSuccess,
  setShowItemSuccess,
  selectedArchiveIngredient,
  setSelectedArchiveIngredient,
  showIngConfirm,
  setShowIngConfirm,
  showIngSuccess,
  setShowIngSuccess,
  setActiveMenuItems,
  setActiveItems,
  setActiveIngredients,
  setArchivedMenuItems,
  setArchivedItems,
  setArchivedIngredients,
  onRecordTransaction,
}) {
  if (currentView === 'archive-menu-item') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={20} /></button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide"><WrenchIcon size={20} /><span>Maintenance &gt; Archive &gt; Menu Item</span></div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">Archive Menu Item</h1>

          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555] text-center">
              <span>No.</span><span>Menu Item Name</span><span></span>
            </div>
            {activeMenuItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{item.id}</span>
                <span className="text-center text-xl font-medium">{item.name}</span>
                <button onClick={() => { setSelectedArchiveMenuItem(item); setShowMenuConfirm(true); }} className="flex justify-center text-gray-300 hover:text-red-400"><Archive size={28} /></button>
              </div>
            ))}
          </div>

          {showMenuConfirm && selectedArchiveMenuItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowMenuConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowMenuConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg"><CornerUpLeft size={24} /></button>
                <h2 className="text-5xl font-medium mb-12">Archive Menu Item?</h2>
                <div className="w-full mb-12">
                   <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center"><span>No.</span><span>Name</span></div>
                   <div className="grid grid-cols-2 text-3xl font-bold text-center"><span>{selectedArchiveMenuItem.id}</span><span>{selectedArchiveMenuItem.name}</span></div>
                </div>
                <div className="flex flex-col items-center gap-4 mb-12 text-center">
                  <div className="flex items-center gap-3 text-3xl font-bold"><Info size={32} /><span>Reminder</span></div>
                  <p className="text-2xl text-gray-300">Are you sure you want to Archive <span className="text-white font-bold">{selectedArchiveMenuItem.id}</span>? It will be unavailable on the <span className="text-white font-bold">POS Module</span>.</p>
                </div>
                <button 
                  onClick={() => { 
                    setActiveMenuItems(prev => prev.filter(i => i.id !== selectedArchiveMenuItem.id));
                    setArchivedMenuItems(prev => ([
                      ...prev,
                      { ...selectedArchiveMenuItem, archived: true }
                    ]));
                    onRecordTransaction?.({
                      action: 'Archived',
                      entityType: 'Menu Item',
                      entityId: selectedArchiveMenuItem.id,
                      entityName: selectedArchiveMenuItem.name,
                      summary: `Archived Menu Item ${selectedArchiveMenuItem.name} (${selectedArchiveMenuItem.id})`,
                    });
                    setShowMenuConfirm(false); 
                    setShowMenuSuccess(true); 
                  }} 
                  className="bg-[#3ca4c7] text-white text-3xl font-bold py-5 px-24 rounded-2xl"
                >Confirm</button>
              </div>
            </div>
          )}

          {showMenuSuccess && selectedArchiveMenuItem && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-2xl flex flex-col items-center relative border border-[#444] z-10">
                <h2 className="text-5xl font-bold mb-10 text-center">Menu Item Archived</h2>
                <p className="text-2xl text-gray-300 text-center mb-12"><span className="font-bold text-white text-4xl block mb-4">{selectedArchiveMenuItem.id}</span>has been Archived.</p>
                <button onClick={() => { setShowMenuSuccess(false); setSelectedArchiveMenuItem(null); }} className="bg-[#5a5a5a] text-white text-2xl font-bold py-5 px-24 rounded-xl">Return</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (currentView === 'archive-item') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={20} /></button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide"><WrenchIcon size={20} /><span>Maintenance &gt; Archive &gt; Item</span></div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">Archive Item</h1>

          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555] text-center"><span className="text-center">No.</span><span className="text-center">Item Name</span><span></span></div>
            {activeItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{item.id}</span>
                <span className="text-center text-xl font-medium">{item.name}</span>
                <button onClick={() => { setSelectedArchiveItem(item); setShowItemConfirm(true); }} className="flex justify-center text-gray-300 hover:text-red-400"><Archive size={28} /></button>
              </div>
            ))}
          </div>

          {showItemConfirm && selectedArchiveItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowItemConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowItemConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg"><CornerUpLeft size={24} /></button>
                <h2 className="text-5xl font-medium mb-12">Archive Item?</h2>
                <div className="w-full mb-12">
                  <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center"><span>No.</span><span>Name</span></div>
                  <div className="grid grid-cols-2 text-3xl font-bold text-center"><span>{selectedArchiveItem.id}</span><span>{selectedArchiveItem.name}</span></div>
                </div>
                <div className="flex flex-col items-center gap-4 mb-12 text-center">
                  <div className="flex items-center gap-3 text-3xl font-bold"><Info size={32} /><span>Reminder</span></div>
                  <p className="text-2xl text-gray-300">Are you sure you want to Archive <span className="text-white font-bold">{selectedArchiveItem.id}</span>? It will be unavailable on the <span className="text-white font-bold">Inventory Module</span>.</p>
                </div>
                <button 
                  onClick={() => { 
                    setActiveItems(prev => prev.filter(i => i.id !== selectedArchiveItem.id));
                    setArchivedItems(prev => ([
                      ...prev,
                      { ...selectedArchiveItem, archived: true }
                    ]));
                    onRecordTransaction?.({
                      action: 'Archived',
                      entityType: 'Item',
                      entityId: selectedArchiveItem.id,
                      entityName: selectedArchiveItem.name,
                      summary: `Archived Item ${selectedArchiveItem.name} (${selectedArchiveItem.id})`,
                    });
                    setShowItemConfirm(false); 
                    setShowItemSuccess(true); 
                  }} 
                  className="bg-[#3ca4c7] text-white text-3xl font-bold py-5 px-24 rounded-2xl"
                >Confirm</button>
              </div>
            </div>
          )}

          {showItemSuccess && selectedArchiveItem && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-2xl flex flex-col items-center relative border border-[#444] z-10">
                <h2 className="text-5xl font-bold mb-10 text-center">Item Archived</h2>
                <p className="text-2xl text-gray-300 text-center mb-12"><span className="font-bold text-white text-4xl block mb-4">{selectedArchiveItem.id}</span>has been Archived.</p>
                <button onClick={() => { setShowItemSuccess(false); setSelectedArchiveItem(null); }} className="bg-[#5a5a5a] text-white text-2xl font-bold py-5 px-24 rounded-xl">Return</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (currentView === 'archive-ingredient') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={20} /></button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span>Maintenance &gt; Archive &gt; Ingredient</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">Archive Ingredient</h1>

          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555] text-center">
              <span>No.</span>
              <span>Ingredient Name</span>
              <span></span>
            </div>
            {activeIngredients.map((ing) => (
              <div key={ing.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{ing.id}</span>
                <span className="text-center text-xl font-medium">{ing.name}</span>
                <button 
                  onClick={() => { setSelectedArchiveIngredient(ing); setShowIngConfirm(true); }}
                  className="flex justify-center text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Archive size={28} />
                </button>
              </div>
            ))}
          </div>

          {showIngConfirm && selectedArchiveIngredient && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowIngConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowIngConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]"><CornerUpLeft size={24} /></button>
                <h2 className="text-5xl font-medium mb-12">Archive Ingredient?</h2>
                <div className="w-full mb-12">
                  <div className="grid grid-cols-2 bg-[#4a4a4a] rounded-xl py-2 text-xl mb-4 text-center font-medium">
                    <span>No.</span>
                    <span>Name</span>
                  </div>
                  <div className="grid grid-cols-2 text-3xl font-bold text-center">
                    <span>{selectedArchiveIngredient.id}</span>
                    <span>{selectedArchiveIngredient.name}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4 mb-12 text-center">
                  <div className="flex items-center gap-3 text-3xl font-bold"><Info size={32} /><span>Reminder</span></div>
                  <p className="text-2xl text-gray-300">
                    Are you sure you want to <span className="text-white font-bold">Archive</span> the <span className="text-white font-bold">{selectedArchiveIngredient.id}</span>? 
                    It will be unavailable for <span className="text-white font-bold">Menu Item creation.</span>
                  </p>
                </div>
                <button 
                  onClick={() => { 
                    setActiveIngredients(prev => prev.filter(i => i.id !== selectedArchiveIngredient.id));
                    setArchivedIngredients(prev => ([
                      ...prev,
                      { ...selectedArchiveIngredient, archived: true }
                    ]));
                    onRecordTransaction?.({
                      action: 'Archived',
                      entityType: 'Ingredient',
                      entityId: selectedArchiveIngredient.id,
                      entityName: selectedArchiveIngredient.name,
                      summary: `Archived Ingredient ${selectedArchiveIngredient.name} (${selectedArchiveIngredient.id})`,
                    });
                    setShowIngConfirm(false); 
                    setShowIngSuccess(true); 
                  }} 
                  className="bg-[#3ca4c7] text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >Confirm</button>
              </div>
            </div>
          )}

          {showIngSuccess && selectedArchiveIngredient && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-2xl flex flex-col items-center relative border border-[#444] z-10">
                <h2 className="text-5xl font-bold mb-10 text-center">Ingredient Archived</h2>
                <p className="text-2xl text-gray-300 text-center mb-12">
                  <span className="font-bold text-white text-4xl block mb-4">{selectedArchiveIngredient.id}</span>
                  has been successfully Archived.
                </p>
                <button 
                  onClick={() => { setShowIngSuccess(false); setSelectedArchiveIngredient(null); }} 
                  className="bg-[#5a5a5a] text-white text-2xl font-bold py-5 px-24 rounded-xl hover:bg-[#6a6a6a]"
                >Return</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
