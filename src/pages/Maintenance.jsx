import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  WrenchIcon, 
  CornerUpLeft, 
  ChevronDown, 
  ChevronUp, 
  Box, 
  Edit3, 
  Archive, 
  FilePlus, 
  Users,
  Lock,    
  Unlock,  
  Plus,
  MinusCircle,
  Check,
  Info,
  RotateCcw,
  RotateCw,
  UserRoundPlus,
  UserRoundMinus,
  } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

export default function Maintenance({ role }) {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('main'); 
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState('general');
  
  // --- STATE FOR FORMS & FLOWS ---
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showItemSavedSuccess, setShowItemSavedSuccess] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  //MOCK VALUES
  const [menuItemName, setMenuItemName] = useState('');
  const [sizes, setSizes] = useState({
    Small: { locked: false, price: '' },
    Medium: { locked: false, price: '' },
    Large: { locked: true, price: '' },
  });
  const [addOns, setAddOns] = useState([{ id: 1, name: '', price: '' }]);
  const [connections, setConnections] = useState([
    { id: 1, type: '', code: '', units: '' },
    { id: 2, type: '', code: '', units: '' },
    { id: 3, type: '', code: '', units: '' },
  ]);

  const [itemSizes, setItemSizes] = useState({
  Small: { enabled: true, qty: '50' },
  Medium: { enabled: true, qty: '50' },
  Large: { enabled: true, qty: '50' },
  });

  const toggleItemSize = (size) => {
  setItemSizes(prev => ({
    ...prev,
    [size]: { ...prev[size], enabled: !prev[size].enabled }
  }));
  };

  const [selectedEditItem, setSelectedEditItem] = useState(null);

  const mockMenuItems = [
  { id: 'MNTM001', name: 'Classic Mango Shake' },
  { id: 'MNTM002', name: 'Mango Cheesecake' },
  { id: 'MNTM003', name: 'Mango Oreo Shake' },
  { id: 'MNTM004', name: 'Mango Overload Pop' },
  { id: 'MNTM005', name: 'Mango Graham Shake' },
  ];

  const mockIngredientsList = [
    { id: 'INGR001', name: 'Egg', type: 'Dry' },
    { id: 'INGR002', name: 'Meat', type: 'Frozen' },
    { id: 'INGR003', name: 'Graham', type: 'Dry' },
  ];

  const mockItemsList = [
    { id: 'ITEM001', name: 'Plastic Utensil Set' },
    { id: 'ITEM002', name: 'Paper Box' },
    { id: 'ITEM003', name: 'Plastic Cup' },
  ];

  // --- ACTIVE & ARCHIVED DATA STATES --- 

  const [activeIngredients, setActiveIngredients] = useState([
    { id: 'INGR001', name: 'Egg', type: 'Dry' },
    { id: 'INGR002', name: 'Meat', type: 'Frozen' },
  ]);

  const [activeMenuItems, setActiveMenuItems] = useState([
    { id: 'MNTM001', name: 'Classic Mango Shake' },
    { id: 'MNTM002', name: 'Mango Cheesecake' },
  ]);

  const [activeItems, setActiveItems] = useState([
    { id: 'ITEM001', name: 'Plastic Utensil Set' },
    { id: 'ITEM002', name: 'Paper Box' },
    { id: 'ITEM003', name: 'Plastic Cup' },
  ]);

  const [selectedArchiveIngredient, setSelectedArchiveIngredient] = useState(null);
  const [showIngConfirm, setShowIngConfirm] = useState(false);
  const [showIngSuccess, setShowIngSuccess] = useState(false);

  const [selectedArchiveMenuItem, setSelectedArchiveMenuItem] = useState(null);
  const [showMenuConfirm, setShowMenuConfirm] = useState(false);
  const [showMenuSuccess, setShowMenuSuccess] = useState(false);

  const [selectedArchiveItem, setSelectedArchiveItem] = useState(null);
  const [showItemConfirm, setShowItemConfirm] = useState(false);
  const [showItemSuccess, setShowItemSuccess] = useState(false);

  const [archivedIngredients, setArchivedIngredients] = useState([
    { id: 'INGR003', name: 'Graham', type: 'Dry' },
  ]);
  const [archivedMenuItems, setArchivedMenuItems] = useState([
    { id: 'MNTM003', name: 'Mango Graham' },
  ]);
  const [archivedItems, setArchivedItems] = useState([
    { id: 'ITEM004', name: 'Straws' },
  ]);

  const [selectedRetrieveIng, setSelectedRetrieveIng] = useState(null);
  const [showRetrieveIngConfirm, setShowRetrieveIngConfirm] = useState(false);
  const [showRetrieveIngSuccess, setShowRetrieveIngSuccess] = useState(false);

  const [selectedRetrieveMenu, setSelectedRetrieveMenu] = useState(null);
  const [showRetrieveMenuConfirm, setShowRetrieveMenuConfirm] = useState(false);
  const [showRetrieveMenuSuccess, setShowRetrieveMenuSuccess] = useState(false);

  const [selectedRetrieveItem, setSelectedRetrieveItem] = useState(null);
  const [showRetrieveItemConfirm, setShowRetrieveItemConfirm] = useState(false);
  const [showRetrieveItemSuccess, setShowRetrieveItemSuccess] = useState(false);

  // --- ACCOUNT MANAGEMENT STATES ---
  const [accounts, setAccounts] = useState([
    { id: 'EMP001', name: 'Carl Nueva', status: 'Active' },
    { id: 'EMP002', name: 'Joaquin Sarmiento', status: 'Inactive' },
    { id: 'EMP003', name: 'Renz Alcanzo', status: 'Active' },
  ]);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showStatusSuccess, setShowStatusSuccess] = useState(false);

  const toggleSizeLock = (size) => {
    setSizes(prev => ({
      ...prev,
      [size]: { ...prev[size], locked: !prev[size].locked }
    }));
  };

  const handleArchiveConfirm = () => {
  if (!selectedArchiveItem) return;

  // Logic to remove from current active state
  if (currentView === 'archive-ingredient') {
    setActiveIngredients(prev => prev.filter(i => i.id !== selectedArchiveItem.id));
  } else if (currentView === 'archive-menu-item') {
    setActiveMenuItems(prev => prev.filter(i => i.id !== selectedArchiveItem.id));
  } else if (currentView === 'archive-item') {
    setActiveItems(prev => prev.filter(i => i.id !== selectedArchiveItem.id));
  }

  // Clear state and close modal
  setShowArchiveConfirm(false);
  setSelectedArchiveItem(null);
  };

  // --- DUMMY FORM DATA ---
  const [ingredientName, setIngredientName] = useState('');
  
  // --- HELPERS ---
  const isFormFilled = () => {
    return ingredientName.trim().length > 0;
  };

  const closeAllModals = () => {
    setShowSavePrompt(false);
    setShowItemSavedSuccess(false);
    setShowDiscardPrompt(false);
  };

  const handleBack = () => {
      if (showSavePrompt || showItemSavedSuccess || showDiscardPrompt) {
        setShowSavePrompt(false);
        setShowItemSavedSuccess(false);
        setShowDiscardPrompt(false);
        return;
      }
      if (currentView !== 'main') {
        setCurrentView('main');
      } else {
        navigate(-1);
      }
    };

  const finalizeSaveFlow = () => {
    setShowSavePrompt(false);
    setShowItemSavedSuccess(true);
  };

  const finalizeDiscardFlow = () => {
    setIngredientName('');
    closeAllModals();
    setCurrentView('main');
  };

  const menuItems = [
    { id: 'create', label: 'Create', icon: <Box size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
    { id: 'edit', label: 'Edit', icon: <Edit3 size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
    { id: 'archive', label: 'Archive', icon: <Archive size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
    { id: 'retrieve', label: 'Retrieve', icon: <FilePlus size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
  ];

  // --- SUB-VIEW: CREATE MENU ITEM ---
  if (currentView === 'create-menu-item') {
    return (
      <div className="flex w-full h-full gap-6 relative"> 
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-y-auto">
          
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]">
              <CornerUpLeft size={20} />
            </button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span>Maintenance &gt; Create &gt; Menu Item</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">Create Menu Item</h1>

          <div className="flex flex-col gap-4 w-full pb-24">
            {/* General Info Accordion */}
            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button 
                onClick={() => setActiveAccordion(activeAccordion === 'general' ? null : 'general')}
                className="w-full p-6 flex justify-between items-center hover:bg-[#444]"
              >
                <h3 className="text-2xl font-medium">General Information</h3>
                {activeAccordion === 'general' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
              {activeAccordion === 'general' && (
                <div className="p-10 border-t border-[#444] grid grid-cols-[1fr_2.5fr] items-center gap-y-8 gap-x-12">
                  <label className="text-2xl font-medium text-right">Menu Item Name</label>
                  <input 
                    type="text" value={menuItemName} onChange={(e) => setMenuItemName(e.target.value)}
                    className="bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none" 
                  />
                  <label className="text-2xl font-medium text-right">Category</label>
                  <div className="relative">
                    <select className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none cursor-pointer">
                      <option>Beverage</option>
                      <option>Food</option>
                    </select>
                    <ChevronDown size={24} className="absolute right-4 top-3 text-black pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Sizes & Pricing Accordion */}
            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button onClick={() => setActiveAccordion(activeAccordion === 'sizes' ? null : 'sizes')} className="w-full p-6 flex justify-between items-center hover:bg-[#444]">
                <h3 className="text-2xl font-medium">Sizes and Pricing</h3>
                {activeAccordion === 'sizes' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
              {activeAccordion === 'sizes' && (
                <div className="p-10 border-t border-[#444] space-y-8">
                  {Object.entries(sizes).map(([size, data]) => (
                    <div key={size} className="grid grid-cols-[0.5fr_1fr_0.5fr_1fr] items-center gap-x-8">
                      <button onClick={() => toggleSizeLock(size)} className="justify-self-end text-white hover:text-[#56a2d1]">
                        {data.locked ? <Lock size={32} /> : <Unlock size={32} />}
                      </button>
                      <span className="text-2xl font-medium">{size}</span>
                      <span className="text-2xl font-medium text-right">Php</span>
                      <div className="relative">
                        <input 
                          disabled={data.locked} value={data.locked ? '' : data.price}
                          className={`w-full rounded-lg h-12 px-4 text-center text-xl font-semibold ${data.locked ? 'bg-transparent border-2 border-gray-500 opacity-50' : 'bg-white text-black'}`}
                        />
                        {data.locked && <Lock size={20} className="absolute right-4 top-3 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add-Ons Accordion */}
            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button onClick={() => setActiveAccordion(activeAccordion === 'addons' ? null : 'addons')} className="w-full p-6 flex justify-between items-center hover:bg-[#444]">
                <h3 className="text-2xl font-medium">Add-Ons</h3>
                {activeAccordion === 'addons' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
              {activeAccordion === 'addons' && (
                <div className="p-10 border-t border-[#444] space-y-6">
                  {addOns.map((addon, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_2fr_0.5fr_1fr] items-center gap-x-8">
                      <span className="text-2xl font-medium text-right">No. {idx + 1}</span>
                      <div className="relative">
                        <select className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none">
                          <option>{addon.name}</option>
                        </select>
                        <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                      </div>
                      <span className="text-2xl font-medium text-right">Php</span>
                      <input type="text" value={addon.price} className="bg-white text-black rounded-lg h-12 text-center text-xl font-semibold" />
                    </div>
                  ))}
                  <div className="flex justify-center pt-4">
                    <button className="border-2 border-white rounded-xl px-12 py-3 flex items-center gap-3 text-xl font-medium hover:bg-white hover:text-black transition-colors">
                      <Plus size={24} /> Add another Add-On
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Connections Accordion */}
            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button onClick={() => setActiveAccordion(activeAccordion === 'connections' ? null : 'connections')} className="w-full p-6 flex justify-between items-center hover:bg-[#444]">
                <h3 className="text-2xl font-medium">Assign Connections</h3>
                {activeAccordion === 'connections' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
              {activeAccordion === 'connections' && (
                <div className="p-10 border-t border-[#444] space-y-6">
                  {connections.map((conn, idx) => (
                    <div key={idx} className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr] items-center gap-x-8">
                      <span className="text-2xl font-medium text-right">
                        {conn.type === 'ingredient' ? 'Ingredient' : 'Item'} No. {idx + 1}
                      </span>
                      <div className="relative">
                        <select className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none">
                          <option>{conn.code}</option>
                        </select>
                        <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                      </div>
                      <span className="text-2xl font-medium text-right">Units</span>
                      <input type="text" value={conn.units} className="bg-white text-black rounded-lg h-12 text-center text-xl font-semibold" />
                    </div>
                  ))}
                  <div className="flex justify-center gap-8 pt-4">
                    <button className="border-2 border-white rounded-xl px-8 py-3 flex items-center gap-2 text-xl font-medium hover:bg-white hover:text-black transition-colors">
                      <Plus size={24} /> Assign Ingredient
                    </button>
                    <button className="border-2 border-white rounded-xl px-8 py-3 flex items-center gap-2 text-xl font-medium hover:bg-white hover:text-black transition-colors">
                      <Plus size={24} /> Assign Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto flex justify-center pb-4">
            <button onClick={() => setShowSavePrompt(true)} className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-32 rounded-xl shadow-lg transition-transform active:scale-95">
              Save
            </button>
          </div>

          {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
            <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center animate-in fade-in duration-300">
              {showSavePrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center relative border border-[#444]">
                  <button onClick={() => setShowSavePrompt(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-3 rounded-xl hover:bg-[#6a6a6a]"><CornerUpLeft size={22} /></button>
                  <h2 className="text-5xl font-semibold mb-12 text-white mt-4 text-center">Save Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => { setShowSavePrompt(false); setShowDiscardPrompt(true); }} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Discard</button>
                    <button onClick={() => { setShowSavePrompt(false); setShowItemSavedSuccess(true); }} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                  </div>
                </div>
              )}
              {showItemSavedSuccess && (
                <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                  <h2 className="text-5xl font-semibold mb-8 text-white"> Menu Item Saved!</h2>
                  <p className="text-2xl text-gray-300 mb-10">{menuItemName || "Graham"} has been saved and assigned as ____</p>
                  <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                </div>
              )}
              {showDiscardPrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                  <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                    <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- SUB-VIEW: CREATE ITEM ---
  if (currentView === 'create-item') {
    return (
      <div className="flex w-full h-full gap-6 relative">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-y-auto custom-scrollbar-gutter">
          
          {/* Breadcrumb Header */}
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]">
              <CornerUpLeft size={20} />
            </button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span>Maintenance &gt; Create &gt; Item</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">Create Item</h1>

          <div className="flex flex-col gap-4 w-full pb-24">
            
            {/* General Info Accordion */}
            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button 
                onClick={() => setActiveAccordion(activeAccordion === 'general' ? null : 'general')}
                className="w-full p-6 flex justify-between items-center hover:bg-[#444]"
              >
                <h3 className="text-2xl font-medium">General Information</h3>
                {activeAccordion === 'general' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
              {activeAccordion === 'general' && (
                <div className="p-10 border-t border-[#444] grid grid-cols-[1fr_2.5fr] items-center gap-y-8 gap-x-12">
                  <label className="text-2xl font-medium text-right">Item Name</label>
                  <input 
                    type="text" 
                    className="bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none" 
                  />
                </div>
              )}
            </div>

            {/* Sizes Accordion */}
            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button 
                onClick={() => setActiveAccordion(activeAccordion === 'sizes' ? null : 'sizes')}
                className="w-full p-6 flex justify-between items-center hover:bg-[#444]"
              >
                <h3 className="text-2xl font-medium">Sizes</h3>
                {activeAccordion === 'sizes' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
              {activeAccordion === 'sizes' && (
                <div className="p-10 border-t border-[#444]">
                  {/* Header for the grid columns */}
                  <div className="grid grid-cols-[1.2fr_1fr_0.8fr_1.2fr] mb-6 px-4 text-center text-lg text-gray-300">
                    <span></span>
                    <span>Sizes</span>
                    <span></span>
                    <span>Starting Qty.</span>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(itemSizes).map(([size, data]) => (
                      <div key={size} className="grid grid-cols-[1.2fr_1fr_0.8fr_1.2fr] items-center gap-x-8">
                        <span className={`text-2xl font-medium text-right ${!data.enabled ? 'opacity-40' : ''}`}>
                          {size}
                        </span>
                        
                        {/* Checkbox Button */}
                        <div className="flex justify-center">
                          <button 
                            onClick={() => toggleItemSize(size)}
                            className="bg-white text-black w-16 h-11 rounded-lg flex items-center justify-center transition-all active:scale-90"
                          >
                            {data.enabled && <Check size={28} strokeWidth={4} className="text-black" />}
                          </button>
                        </div>

                        <span className={`text-2xl font-medium text-right ${!data.enabled ? 'opacity-40' : ''}`}>
                          Units
                        </span>
                        
                        <input 
                          type="text" 
                          disabled={!data.enabled}
                          value={data.enabled ? data.qty : ''}
                          onChange={(e) => setItemSizes(prev => ({
                            ...prev,
                            [size]: { ...prev[size], qty: e.target.value }
                          }))}
                          className={`rounded-lg h-11 w-full text-center text-xl font-semibold focus:outline-none transition-colors ${
                            data.enabled 
                              ? 'bg-white text-black' 
                              : 'bg-transparent border-2 border-gray-500 opacity-50 cursor-not-allowed'
                          }`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Save Button */}
        <div className="mt-auto flex justify-center pb-4">
          <button 
            onClick={() => setShowSavePrompt(true)} 
            className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-32 rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Save
          </button>
        </div>

        {/* Backdrop for all Modals */}
        {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
          <div className="fixed inset-0 bg-black/65 z-50 animate-in fade-in duration-300" />)}

        {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
            <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center animate-in fade-in duration-300">
              {showSavePrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center relative border border-[#444]">
                  <button onClick={() => setShowSavePrompt(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-3 rounded-xl hover:bg-[#6a6a6a]"><CornerUpLeft size={22} /></button>
                  <h2 className="text-5xl font-semibold mb-12 text-white mt-4 text-center">Save Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => { setShowSavePrompt(false); setShowDiscardPrompt(true); }} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Discard</button>
                    <button onClick={() => { setShowSavePrompt(false); setShowItemSavedSuccess(true); }} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                  </div>
                </div>
              )}
              {showItemSavedSuccess && (
                <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                  <h2 className="text-5xl font-semibold mb-8 text-white"> Item Saved!</h2>
                  <p className="text-2xl text-gray-300 mb-10">_____ has been saved and assigned as ____</p>
                  <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                </div>
              )}
              {showDiscardPrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                  <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                    <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- SUB-VIEW: CREATE INGREDIENT ---
  if (currentView === 'create-ingredient') {
    return (
      <div className="flex w-full h-full gap-6 relative"> 
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          
          {/* Breadcrumb Header */}
          <div className="flex gap-4 mb-10">
            <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]">
              <CornerUpLeft size={20} />
            </button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span>Maintenance &gt; Create &gt; Ingredient</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">Create Ingredient</h1>

          {/* Form Card */}
          <div className="bg-[#3d3d3d] rounded-2xl p-10 w-full shadow-inner border border-[#444]">
            <h3 className="text-2xl font-medium mb-10 text-gray-200">General Information</h3>
            
            {/* Grid Container */}
            <div className="grid grid-cols-[1.2fr_2fr] items-center gap-y-8 gap-x-12 w-full max-w-5xl px-4">
              <label className="text-2xl font-medium text-right">Ingredient Name</label>
              <input 
                type="text" 
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
                className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none" 
              />
              
              <label className="text-2xl font-medium text-right">Ingredient Type</label>
              <div className="relative group">
                <select className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none appearance-none cursor-pointer pr-14">
                  <option>Dry</option>
                  <option>Liquid</option>
                  <option>Frozen</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black"><ChevronDown size={28} strokeWidth={3} /></div>
              </div>

              <label className="text-2xl font-medium text-right">Starting Qty.</label>
              <div className="flex items-center gap-4">
                <input type="text" className="flex-1 bg-white text-black rounded-lg h-12 px-4 text-center text-xl font-semibold focus:outline-none" />
                <span className="text-2xl font-medium w-10">kg</span>
              </div>
            </div>
          </div>

          {/* Save Button Container */}
          <div className="mt-auto flex justify-center pb-4">
            <button onClick={() => setShowSavePrompt(true)} className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-32 rounded-xl shadow-lg transition-transform active:scale-95">
              Save
            </button>
          </div>
        </main>

        {/* Backdrop for all Modals */}
        {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
          <div className="fixed inset-0 bg-black/65 z-50 animate-in fade-in duration-300" />)}

        {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
            <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center animate-in fade-in duration-300">
              {showSavePrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center relative border border-[#444]">
                  <button onClick={() => setShowSavePrompt(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-3 rounded-xl hover:bg-[#6a6a6a]"><CornerUpLeft size={22} /></button>
                  <h2 className="text-5xl font-semibold mb-12 text-white mt-4 text-center">Save Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => { setShowSavePrompt(false); setShowDiscardPrompt(true); }} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Discard</button>
                    <button onClick={() => { setShowSavePrompt(false); setShowItemSavedSuccess(true); }} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                  </div>
                </div>
              )}
              {showItemSavedSuccess && (
                <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                  <h2 className="text-5xl font-semibold mb-8 text-white"> Menu Item Saved!</h2>
                  <p className="text-2xl text-gray-300 mb-10">_____ has been saved and assigned as ____</p>
                  <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                </div>
              )}
              {showDiscardPrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                  <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                    <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    );
  }

  // --- SUB-VIEW: EDIT MENU ITEM  ---
  if (currentView === 'edit-menu-item') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1e1e1e]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-y-auto">
          
          {/* Breadcrumb Header */}
          <div className="flex gap-4 mb-10">
          <button 
            onClick={() => selectedEditItem ? setSelectedEditItem(null) : handleBack()} 
            className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"
          >
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
            <WrenchIcon size={20} />
            <span> 
              Maintenance &gt; Edit &gt; Menu Item 
              {selectedEditItem && (
                <span className="text-base font-medium tracking-wide"> &gt; {selectedEditItem.id}</span>
              )}
            </span>
          </div>
        </div>

          <h1 className="text-4xl font-semibold mb-8">
            Edit Menu Item {selectedEditItem ? `(${selectedEditItem.id})` : ''}
          </h1>

          {!selectedEditItem ? (
            <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
              <div className="grid grid-cols-[1.5fr_3fr_1fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555]">
                <span className="text-center">No.</span>
                <span className="text-center">Name</span>
                <span className="text-center">Action</span>
                <span></span>
              </div>
              {mockMenuItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[1.5fr_3fr_1fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d] transition-colors">
                  <span className="text-center text-xl">{item.id}</span>
                  <span className="text-center text-xl font-medium">{item.name}</span>
                  <button 
                    onClick={() => { setSelectedEditItem(item); setMenuItemName(item.name); }}
                    className="flex justify-center text-gray-300 hover:text-white"
                  >
                    <Edit3 size={28} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full pb-24">
              {/* General Information */}
              <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
                <button onClick={() => setActiveAccordion(activeAccordion === 'general' ? null : 'general')} className="w-full p-6 flex justify-between items-center hover:bg-[#444]">
                  <h3 className="text-2xl font-medium">General Information</h3>
                  {activeAccordion === 'general' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                </button>
                {activeAccordion === 'general' && (
                  <div className="p-10 border-t border-[#444] grid grid-cols-[1fr_2.5fr] items-center gap-y-8 gap-x-12 animate-in slide-in-from-top-2">
                    <label className="text-2xl font-medium text-right">Menu Item Name</label>
                    <input type="text" value={menuItemName} onChange={(e) => setMenuItemName(e.target.value)} className="bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold" />
                    <label className="text-2xl font-medium text-right">Category</label>
                    <div className="relative">
                      <select className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none cursor-pointer"><option>Beverage</option><option>Food</option></select>
                      <ChevronDown size={24} className="absolute right-4 top-3 text-black pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
                <button onClick={() => setActiveAccordion(activeAccordion === 'sizes' ? null : 'sizes')} className="w-full p-6 flex justify-between items-center hover:bg-[#444]">
                  <h3 className="text-2xl font-medium">Sizes and Pricing</h3>
                  {activeAccordion === 'sizes' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                </button>
                {activeAccordion === 'sizes' && (
                  <div className="p-10 border-t border-[#444] space-y-8 animate-in slide-in-from-top-2">
                    {Object.entries(sizes).map(([size, data]) => (
                      <div key={size} className="grid grid-cols-[0.5fr_1fr_0.5fr_1.5fr] items-center gap-x-8">
                        <button onClick={() => toggleSizeLock(size)} className="justify-self-end text-white hover:text-[#56a2d1]">{data.locked ? <Lock size={32} /> : <Unlock size={32} />}</button>
                        <span className="text-2xl font-medium">{size}</span>
                        <span className="text-2xl font-medium text-right">Php</span>
                        <div className="relative">
                          <input disabled={data.locked} value={data.locked ? '' : data.price} className={`w-full rounded-lg h-12 px-4 text-center text-xl font-semibold ${data.locked ? 'bg-transparent border-2 border-gray-500 opacity-50' : 'bg-white text-black'}`} />
                          {data.locked && <Lock size={20} className="absolute right-4 top-3 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
                <button onClick={() => setActiveAccordion(activeAccordion === 'addons' ? null : 'addons')} className="w-full p-6 flex justify-between items-center hover:bg-[#444]">
                  <h3 className="text-2xl font-medium">Add-Ons</h3>
                  {activeAccordion === 'addons' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                </button>
                {activeAccordion === 'addons' && (
                  <div className="p-10 border-t border-[#444] space-y-6 animate-in slide-in-from-top-2">
                    {addOns.map((addon, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_2fr_0.5fr_1fr] items-center gap-x-8">
                        <span className="text-2xl font-medium text-right">No. {idx + 1}</span>
                        <div className="relative">
                          <select className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none"><option>{addon.name}</option></select>
                          <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                        </div>
                        <span className="text-2xl font-medium text-right">Php</span>
                        <input type="text" value={addon.price} className="bg-white text-black rounded-lg h-12 text-center text-xl font-semibold" />
                      </div>
                    ))}
                    <div className="flex justify-center pt-4">
                      <button className="border-2 border-white rounded-xl px-12 py-3 flex items-center gap-3 text-xl font-medium hover:bg-white hover:text-black transition-colors"><Plus size={24} /> Add another Add-On</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button onClick={() => setActiveAccordion(activeAccordion === 'connections' ? null : 'connections')} className="w-full p-6 flex justify-between items-center hover:bg-[#444]">
                <h3 className="text-2xl font-medium">Assign Connections</h3>
                {activeAccordion === 'connections' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
              {activeAccordion === 'connections' && (
                <div className="p-10 border-t border-[#444] space-y-6">
                  {connections.map((conn, idx) => (
                    <div key={idx} className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr] items-center gap-x-8">
                      <span className="text-2xl font-medium text-right">
                        {conn.type === 'ingredient' ? 'Ingredient' : 'Item'} No. {idx + 1}
                      </span>
                      <div className="relative">
                        <select className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none">
                          <option>{conn.code}</option>
                        </select>
                        <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                      </div>
                      <span className="text-2xl font-medium text-right">Units</span>
                      <input type="text" value={conn.units} className="bg-white text-black rounded-lg h-12 text-center text-xl font-semibold" />
                    </div>
                  ))}
                  <div className="flex justify-center gap-8 pt-4">
                    <button className="border-2 border-white rounded-xl px-8 py-3 flex items-center gap-2 text-xl font-medium hover:bg-white hover:text-black transition-colors">
                      <Plus size={24} /> Assign Ingredient
                    </button>
                    <button className="border-2 border-white rounded-xl px-8 py-3 flex items-center gap-2 text-xl font-medium hover:bg-white hover:text-black transition-colors">
                      <Plus size={24} /> Assign Item
                    </button>
                  </div>
                </div>
              )}
            </div>

              <div className="mt-8 flex justify-center">
                <button onClick={() => setShowSavePrompt(true)} className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-24 rounded-xl shadow-lg transition-transform active:scale-95">
                  Save Changes
                </button>
              </div>

              {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
              <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center animate-in fade-in duration-300">
                {showSavePrompt && (
                  <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center relative border border-[#444]">
                    <button onClick={() => setShowSavePrompt(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-3 rounded-xl hover:bg-[#6a6a6a]"><CornerUpLeft size={22} /></button>
                    <h2 className="text-5xl font-semibold mb-12 text-white mt-4 text-center">Save Creation?</h2>
                    <div className="flex flex-col gap-5 w-full max-w-md">
                      <button onClick={() => { setShowSavePrompt(false); setShowDiscardPrompt(true); }} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Discard</button>
                      <button onClick={() => { setShowSavePrompt(false); setShowItemSavedSuccess(true); }} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                    </div>
                  </div>
                )}
                {showItemSavedSuccess && (
                  <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                    <h2 className="text-5xl font-semibold mb-8 text-white"> Menu Item Saved!</h2>
                    <p className="text-2xl text-gray-300 mb-10">{menuItemName || "Graham"} has been saved and assigned as ____</p>
                    <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                  </div>
                )}
                {showDiscardPrompt && (
                  <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                    <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                    <div className="flex flex-col gap-5 w-full max-w-md">
                      <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                      <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- SUB-VIEW: EDIT ITEM  ---
  if (currentView === 'edit-item') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1e1e1e]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-y-auto custom-scrollbar-gutter">
          
          {/* Breadcrumb Header */}
          <div className="flex gap-4 mb-10">
            <button 
              onClick={() => selectedEditItem ? setSelectedEditItem(null) : handleBack()} 
              className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"
            >
              <CornerUpLeft size={20} />
            </button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span> Maintenance &gt; Edit &gt; Item {selectedEditItem && (<span className="text-base font-medium tracking-wide"> &gt; {selectedEditItem.id}</span>)}</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold mb-8">
            Edit Item {selectedEditItem ? `(${selectedEditItem.id})` : ''}
          </h1>

          {!selectedEditItem ? (
            <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
              <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555]">
                <span className="text-center">No.</span>
                <span className="text-center">Name</span>
                <span className="text-center">Action</span>
                <span></span>
              </div>
              {mockItemsList.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d] transition-colors">
                  <span className="text-center text-xl">{item.id}</span>
                  <span className="text-center text-xl font-medium">{item.name}</span>
                  <button 
                    onClick={() => { setSelectedEditItem(item); setIngredientName(item.name); }}
                    className="flex justify-center text-gray-300 hover:text-white transition-transform active:scale-90"
                  >
                    <Edit3 size={28} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full pb-24">
              
              {/* General Information Accordion */}
              <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
                <button 
                  onClick={() => setActiveAccordion(activeAccordion === 'general' ? null : 'general')}
                  className="w-full p-6 flex justify-between items-center hover:bg-[#444]"
                >
                  <h3 className="text-2xl font-medium">General Information</h3>
                  {activeAccordion === 'general' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                </button>
                {activeAccordion === 'general' && (
                  <div className="p-10 border-t border-[#444] grid grid-cols-[1fr_2fr] items-center gap-x-12 animate-in slide-in-from-top-2">
                    <label className="text-2xl font-medium text-right">Item Name</label>
                    <input 
                      type="text" 
                      value={ingredientName} 
                      onChange={(e) => setIngredientName(e.target.value)}
                      className="bg-white text-black rounded-lg h-14 px-6 text-2xl font-semibold focus:outline-none text-center" 
                    />
                  </div>
                )}
              </div>

              {/* Sizes Accordion */}
              <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
                <button 
                  onClick={() => setActiveAccordion(activeAccordion === 'sizes' ? null : 'sizes')}
                  className="w-full p-6 flex justify-between items-center hover:bg-[#444]"
                >
                  <h3 className="text-2xl font-medium">Sizes</h3>
                  {activeAccordion === 'sizes' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                </button>
                {activeAccordion === 'sizes' && (
                  <div className="p-10 border-t border-[#444] space-y-8 animate-in slide-in-from-top-2">
                    {/* Column Headers */}
                    <div className="grid grid-cols-[1.5fr_1fr_0.5fr_1fr] px-4 text-gray-300 text-lg">
                      <span></span>
                      <span className="text-center font-medium">Sizes</span>
                      <span></span>
                      <span className="text-center font-medium">Starting Qty.</span>
                    </div>

                    {Object.entries(itemSizes).map(([size, data]) => (
                      <div key={size} className="grid grid-cols-[1.5fr_1fr_0.5fr_1fr] items-center gap-x-8">
                        <span className={`text-2xl font-medium text-right ${!data.enabled ? 'opacity-40' : ''}`}>
                          {size}
                        </span>
                        
                        {/* Checkbox Button */}
                        <div className="flex justify-center">
                          <button 
                            onClick={() => toggleItemSize(size)}
                            className="bg-white text-black w-16 h-11 rounded-lg flex items-center justify-center transition-all active:scale-90"
                          >
                            {data.enabled && <Plus size={28} strokeWidth={4} className="text-black" />}
                          </button>
                        </div>

                        <span className={`text-2xl font-medium text-right ${!data.enabled ? 'opacity-40' : ''}`}>
                          Units
                        </span>
                        
                        <input 
                          type="text" 
                          disabled={!data.enabled}
                          value={data.enabled ? data.qty : ''}
                          onChange={(e) => setItemSizes(prev => ({
                            ...prev,
                            [size]: { ...prev[size], qty: e.target.value }
                          }))}
                          className={`rounded-lg h-11 w-full text-center text-xl font-semibold focus:outline-none transition-all ${
                            data.enabled 
                              ? 'bg-white text-black' 
                              : 'bg-transparent border-2 border-gray-500 opacity-50 cursor-not-allowed'
                          }`} 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Changes Button */}
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => setShowSavePrompt(true)} 
                  className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-24 rounded-xl shadow-lg transition-transform active:scale-95">
                  Save Changes
                </button>
              </div>

              {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
                <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center animate-in fade-in duration-300">
                  {showSavePrompt && (
                    <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center relative border border-[#444]">
                      <button onClick={() => setShowSavePrompt(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-3 rounded-xl hover:bg-[#6a6a6a]"><CornerUpLeft size={22} /></button>
                      <h2 className="text-5xl font-semibold mb-12 text-white mt-4 text-center">Save Creation?</h2>
                      <div className="flex flex-col gap-5 w-full max-w-md">
                        <button onClick={() => { setShowSavePrompt(false); setShowDiscardPrompt(true); }} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Discard</button>
                        <button onClick={() => { setShowSavePrompt(false); setShowItemSavedSuccess(true); }} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                      </div>
                    </div>
                  )}
                  {showItemSavedSuccess && (
                    <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                      <h2 className="text-5xl font-semibold mb-8 text-white"> Menu Item Saved!</h2>
                      <p className="text-2xl text-gray-300 mb-10">{menuItemName || "Graham"} has been saved and assigned as ____</p>
                      <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                    </div>
                  )}
                  {showDiscardPrompt && (
                    <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                      <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                      <div className="flex flex-col gap-5 w-full max-w-md">
                        <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                        <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); setMenuItemName(''); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- SUB-VIEW: EDIT INGREDIENT ---
  if (currentView === 'edit-ingredient') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1e1e1e]">
        <AdminSidebar activePage="maintenance" />
        {/* Removed items-center to allow full width list */}
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-hidden">
          
          {/* Breadcrumb Header */}
          <div className="flex gap-4 mb-10 w-full">
            <button 
              onClick={() => selectedEditItem ? setSelectedEditItem(null) : handleBack()} 
              className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"
            >
              <CornerUpLeft size={20} />
            </button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
              <WrenchIcon size={20} />
              <span> Maintenance &gt; Edit &gt; Ingredient {selectedEditItem && (<span className="text-base font-medium tracking-wide"> &gt; {selectedEditItem.id}</span>)}</span>
            </div>
          </div>

          <h1 className="text-4xl font-semibold mb-8 px-2">
            Edit Ingredient {selectedEditItem ? `(${selectedEditItem.id})` : ''}
          </h1>

          {!selectedEditItem ? (
            /* STRETCHED LIST VIEW */
            <div className="flex-1 w-full bg-[#333] rounded-xl overflow-hidden border border-[#444] flex flex-col mb-4">
              {/* Fixed Table Header */}
              <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-5 text-xl font-medium px-12 border-b border-[#555]">
                <span className="text-center">No.</span>
                <span className="text-center">Name</span>
                <span className="text-center">Action</span>
              </div>
              
              {/* Scrollable Table Body */}
              <div className="flex-1 overflow-y-auto">
                {activeIngredients.map((ing) => (
                  <div key={ing.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d] transition-colors">
                    <span className="text-center text-xl">{ing.id}</span>
                    <span className="text-center text-xl font-medium">{ing.name}</span>
                    <button 
                      onClick={() => { 
                        setSelectedEditItem(ing); 
                        setIngredientName(ing.name); 
                      }}
                      className="flex justify-center text-gray-300 hover:text-white transition-transform active:scale-90"
                    >
                      <Edit3 size={28} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* CENTERED EDIT FORM */
            <div className="flex-1 flex flex-col gap-8 w-full items-center overflow-y-auto pt-4">
              <div className="bg-[#3d3d3d] rounded-2xl p-12 w-full max-w-5xl shadow-inner border border-[#444]">
                <h3 className="text-2xl font-medium mb-12 text-gray-200">General Information</h3>
                
                <div className="grid grid-cols-[1.2fr_2fr] items-center gap-y-10 gap-x-12 px-4">
                  <label className="text-2xl font-medium text-right">Ingredient Name</label>
                  <input 
                    type="text" 
                    value={ingredientName}
                    onChange={(e) => setIngredientName(e.target.value)}
                    className="w-full bg-white text-black rounded-lg h-14 px-6 text-2xl font-semibold focus:outline-none text-center" 
                  />
                  
                  <label className="text-2xl font-medium text-right">Ingredient Type</label>
                  <div className="relative">
                    <select className="w-full bg-white text-black rounded-lg h-14 px-6 text-2xl font-semibold focus:outline-none appearance-none cursor-pointer text-center">
                      <option>Dry</option>
                      <option>Liquid</option>
                      <option>Frozen</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                      <ChevronDown size={32} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Changes Button */}
              <div className="mt-4 mb-10">
                <button 
                  onClick={() => setShowSavePrompt(true)} 
                  className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-24 rounded-xl shadow-lg transition-transform active:scale-95">
                  Save Changes
                </button>
              </div>

              {/* Modals remain the same but wrapped in this logic */}
              {(showSavePrompt || showItemSavedSuccess || showDiscardPrompt) && (
                <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center">
                  {showSavePrompt && (
                    <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center relative border border-[#444]">
                      <button onClick={() => setShowSavePrompt(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-3 rounded-xl hover:bg-[#6a6a6a]"><CornerUpLeft size={22} /></button>
                      <h2 className="text-5xl font-semibold mb-12 text-white mt-4 text-center uppercase tracking-tight">Save Changes?</h2>
                      <div className="flex flex-col gap-5 w-full max-w-md">
                        <button onClick={() => { setShowSavePrompt(false); setShowDiscardPrompt(true); }} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold">Discard</button>
                        <button onClick={() => { setShowSavePrompt(false); setShowItemSavedSuccess(true); }} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white">Save</button>
                      </div>
                    </div>
                  )}
                  {/* ... rest of your success/discard modals ... */}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }
  
  // --- SUB-VIEW: ARCHIVE MENU ITEM  ---
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

          {/* TABLE */}
          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444] mb-4">
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555] text-center"><span>No.</span><span>Menu Item Name</span><span></span></div>
            {activeMenuItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{item.id}</span>
                <span className="text-center text-xl font-medium">{item.name}</span>
                <button onClick={() => { setSelectedArchiveMenuItem(item); setShowMenuConfirm(true); }} className="flex justify-center text-gray-300 hover:text-red-400"><Archive size={28} /></button>
              </div>
            ))}
          </div>

          {/* MENU ITEM CONFIRM MODAL */}
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
                    setShowMenuConfirm(false); 
                    setShowMenuSuccess(true); 
                  }} 
                  className="bg-[#a83232] text-white text-3xl font-bold py-5 px-24 rounded-2xl"
                >Confirm</button>
              </div>
            </div>
          )}

          {/* MENU ITEM SUCCESS MODAL */}
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

  // --- SUB-VIEW: ARCHIVE ITEM  ---
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
            <div className="grid grid-cols-[1fr_2fr_0.5fr] bg-[#4a4a4a] p-4 text-xl font-medium px-12 border-b border-[#555]"><span className="text-center">No.</span><span className="text-center">Item Name</span><span></span></div>
            {activeItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_2fr_0.5fr] p-6 border-b border-[#444] items-center px-12 hover:bg-[#3d3d3d]">
                <span className="text-center text-xl">{item.id}</span>
                <span className="text-center text-xl font-medium">{item.name}</span>
                <button onClick={() => { setSelectedArchiveItem(item); setShowItemConfirm(true); }} className="flex justify-center text-gray-300 hover:text-red-400"><Archive size={28} /></button>
              </div>
            ))}
          </div>

          {/* ITEM CONFIRM MODAL */}
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
                    setShowItemConfirm(false); 
                    setShowItemSuccess(true); 
                  }} 
                  className="bg-[#a83232] text-white text-3xl font-bold py-5 px-24 rounded-2xl"
                >Confirm</button>
              </div>
            </div>
          )}

          {/* ITEM SUCCESS MODAL */}
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

  // --- SUB-VIEW: ARCHIVE INGREDIENT ---
  if (currentView === 'archive-ingredient') {
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

          {/* INGREDIENT CONFIRM MODAL */}
          {showIngConfirm && selectedArchiveIngredient && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowIngConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowIngConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]">
                  <CornerUpLeft size={24} />
                </button>
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
                    setShowIngConfirm(false); 
                    setShowIngSuccess(true); 
                  }} 
                  className="bg-[#a83232] text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >Confirm</button>
              </div>
            </div>
          )}

          {/* INGREDIENT SUCCESS MODAL */}
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

  // --- SUB-VIEW: RETRIEVE MENU ITEM  ---
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

          {/* CONFIRM MODAL */}
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
                    setActiveMenuItems(prev => [...prev, selectedRetrieveMenu]);
                    setShowRetrieveMenuConfirm(false);
                    setShowRetrieveMenuSuccess(true);
                  }}
                  className="bg-[#166534] text-white text-3xl font-bold py-5 px-24 rounded-2xl"
                >Confirm</button>
              </div>
            </div>
          )}

          {/* SUCCESS MODAL */}
          {showRetrieveMenuSuccess && selectedRetrieveMenu && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-center">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-16 shadow-2xl w-full max-w-2xl flex flex-col items-center relative border border-[#444] z-10">
                <h2 className="text-5xl font-bold mb-10 text-white">Menu Item Retrieved</h2>
                <p className="text-2xl text-gray-300 mb-12"><span className="font-bold text-white text-4xl block mb-4">{selectedRetrieveMenu.id}</span> has been successfully <span className="text-white font-semibold">Retrieved.</span></p>
                <button onClick={() => { setShowRetrieveMenuSuccess(false); setSelectedRetrieveMenu(null); }} className="bg-[#5a5a5a] text-2xl font-bold py-5 px-24 rounded-xl">Return</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- SUB-VIEW: RETRIEVE ITEM  ---
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

          {/* CONFIRM MODAL */}
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
                    setActiveItems(prev => [...prev, selectedRetrieveItem]);
                    setShowRetrieveItemConfirm(false);
                    setShowRetrieveItemSuccess(true);
                  }}
                  className="bg-[#166534] text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg"
                >Confirm</button>
              </div>
            </div>
          )}

          {/* SUCCESS MODAL */}
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

  // --- SUB-VIEW: RETRIEVE INGREDIENT  ---
  if (currentView === 'retrieve-ingredient') {
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
                  className="flex justify-center text-gray-300 hover:text-green-400"
                >
                  <RotateCcw size={28} />
                </button>
              </div>
            ))}
          </div>

          {/* CONFIRM MODAL */}
          {showRetrieveIngConfirm && selectedRetrieveIng && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowRetrieveIngConfirm(false)} />
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                <button onClick={() => setShowRetrieveIngConfirm(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]">
                  <CornerUpLeft size={24} />
                </button>
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
                    setActiveIngredients(prev => [...prev, selectedRetrieveIng]);
                    setShowRetrieveIngConfirm(false);
                    setShowRetrieveIngSuccess(true);
                  }}
                  className="bg-[#166534] text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >Confirm</button>
              </div>
            </div>
          )}

          {/* SUCCESS MODAL */}
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

  // --- SUB-VIEW: MANAGE ACCOUNTS ---
  if (currentView === 'manage-accounts') {
    return (
      <div className="flex w-full h-full gap-6 relative bg-[#1a1a1a]">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
          
          {/* Header Section */}
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

          {/* Table - Re-check that your mapping variable is 'accounts' */}
          <div className="flex-1 w-full bg-[#333] rounded-xl overflow-y-auto border border-[#444]">
            <div className="grid grid-cols-[1fr_3fr_1.5fr_1fr] bg-[#4a4a4a] p-4 text-xl font-medium border-b border-[#555]">
              <span className="text-center">No.</span>
              <span className="text-center">Name</span>
              <span className="text-center">Status</span>
              <span className="text-center">Action</span>
              <span></span>
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

          {/* STATUS CHANGE CONFIRM MODAL */}
          {showStatusConfirm && selectedAccount && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/75 backdrop-blur-sm" 
                onClick={() => setShowStatusConfirm(false)} 
              />
              
              <div className="bg-[#2d2d2d] rounded-[2rem] p-12 shadow-2xl w-full max-w-4xl flex flex-col items-center relative border border-[#444] z-10">
                {/* Back Button */}
                <button 
                  onClick={() => setShowStatusConfirm(false)} 
                  className="absolute top-8 left-8 bg-[#5a5a5a] p-2 rounded-lg hover:bg-[#6a6a6a]"
                >
                  <CornerUpLeft size={24} />
                </button>

                {/* Dynamic Title based on current status */}
                <h2 className="text-5xl font-medium mb-12">
                  {selectedAccount.status === 'Active' ? 'Deactivate Account?' : 'Activate Account?'}
                </h2>

                {/* Center Data Grid */}
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

                {/* Reminder Section */}
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

                {/* Action Button - Red for Deactivate, Blue for Activate */}
                <button 
                  onClick={() => {
                    setShowStatusConfirm(false);
                    setShowStatusSuccess(true);
                  }}
                  className={`${
                    selectedAccount.status === 'Active' ? 'bg-[#ca4646]' : 'bg-[#56a2d1]'
                  } text-white text-3xl font-bold py-5 px-24 rounded-2xl shadow-lg transition-transform active:scale-95`}
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
  // --- SAVE/DISCARD PROMPTS (OVERLAY) ---
  {showSavePrompt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center relative border border-[#444]">
          
          {/* Back to form */}
          <button onClick={() => setShowSavePrompt(false)} className="absolute top-8 left-8 bg-[#5a5a5a] p-3 rounded-xl hover:bg-[#6a6a6a]">
            <CornerUpLeft size={22} className="text-white" />
          </button>
          
          <h2 className="text-5xl font-semibold mb-12 tracking-tight text-white mt-4">Save Creation?</h2>
          
          <div className="flex flex-col gap-5 w-full max-w-md">
            <button 
              onClick={() => { setShowSavePrompt(false); setShowDiscardPrompt(true); }}
              className="w-full bg-[#4a4a4a] hover:bg-[#5a5a5a] py-5 rounded-2xl text-2xl font-semibold text-whitetransition-colors">
              Discard
            </button>
            
            <button onClick={finalizeSaveFlow} className="w-full bg-[#56a2d1] hover:bg-[#66b2e1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>
  )}

  {showItemSavedSuccess && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
        <h2 className="text-5xl font-semibold mb-8 tracking-tight text-white">Item Saved!</h2>
        
        <p className="text-2xl text-gray-300 mb-10 tracking-wide font-medium leading-relaxed">
          Graham has been saved<br />and assigned as INGR003.
        </p>
        
        <button 
          onClick={finalizeDiscardFlow}
          className="w-full max-w-xs bg-[#4a4a4a] hover:bg-[#5a5a5a] py-4 rounded-2xl text-2xl font-semibold transition-colors"
        >
          Return
        </button>
      </div>
    </div>
  )}

  {showDiscardPrompt && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
        
        <h2 className="text-5xl font-semibold mb-12 tracking-tight text-white">Discard Creation?</h2>
        
        <div className="flex flex-col gap-5 w-full max-w-md">
          {/* Return to form */}
          <button 
            onClick={() => setShowDiscardPrompt(false)}
            className="w-full bg-[#4a4a4a] hover:bg-[#5a5a5a] py-5 rounded-2xl text-2xl font-semibold transition-colors"
          >
            Return
          </button>
          
          {/* Finalize the discard */}
          <button onClick={finalizeDiscardFlow} className="w-full bg-[#ca4646] hover:bg-[#da5656] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">
            Discard
          </button>
        </div>
      </div>
    </div>
  )}

  // --- MAIN VIEW (ACCORDIONS) ---
  return (
    <div className="flex w-full h-full gap-6">
      <AdminSidebar activePage="maintenance" />
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white">
        <div className="flex gap-4 mb-10">
          <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg"><CornerUpLeft size={20} /></button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 font-medium tracking-wide">
            <WrenchIcon size={20} />
            <span>Maintenance</span>
          </div>
        </div>

        <div className="flex flex-col flex-1 animate-in fade-in duration-300">
          <h1 className="text-4xl font-semibold mb-8">Maintenance</h1>
          <h2 className="text-2xl font-medium mb-6">Select Action</h2>

          <div className="flex flex-col gap-4 w-full"> 
            {menuItems.map((item) => (
              <div key={item.id} className="w-full bg-[#4a4a4a] rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                  className="w-full flex items-center justify-center px-8 py-5 text-xl font-medium transition-colors relative min-h-[70px] hover:bg-[#5a5a5a]"
                >
                  <div className="flex items-center gap-4">{item.icon}<span>{item.label}</span></div>
                  <div className="absolute right-8 text-gray-300">
                    {activeDropdown === item.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>

                {activeDropdown === item.id && (
                  <div className="pb-6 px-8 flex justify-center gap-6 animate-in slide-in-from-top-2">
                    {item.subOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setCurrentView(`${item.id}-${opt.toLowerCase().replace(' ', '-')}`)}
                        className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white px-10 py-3 rounded-lg transition-colors text-lg font-medium min-w-[160px]"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setCurrentView('manage-accounts')}
              className="w-full flex items-center justify-center bg-[#4a4a4a] hover:bg-[#5a5a5a] px-8 py-5 rounded-xl text-xl font-medium min-h-[70px]"
            >
              <div className="flex items-center gap-4"><Users size={24} /><span>Manage Accounts</span></div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
