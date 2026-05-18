import AdminSidebar from '../../layouts/AdminSidebar';
import { 
  WrenchIcon,
  CornerUpLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';

export default function MaintenanceCreate({
  currentView,
  handleBack,
  activeAccordion,
  setActiveAccordion,
  menuItemName,
  setMenuItemName,
  itemCategory,
  setItemCategory,
  sizes,
  setSizes,
  selectedMenuItemSize,
  setSelectedMenuItemSize,
  itemSizes,
  setItemSizes,
  selectedItemSize,
  setSelectedItemSize,
  itemStartingQty,
  setItemStartingQty,
  addOns,
  setAddOns,
  handleAddRow,
  handleRemoveRow,
  connections,
  setConnections,
  addConnection,
  removeConnection,
  getSequenceNumber,
  showSavePrompt,
  setShowSavePrompt,
  showItemSavedSuccess,
  setShowItemSavedSuccess,
  showDiscardPrompt,
  setShowDiscardPrompt,
  finalizeSaveFlow,
  setCurrentView,
  resetCreateStates,
  activeItems,
  activeIngredients,
  itemName,
  setItemName,
  ingredientName,
  setIngredientName,
  ingredientType,
  setIngredientType,
  ingredientIsAddOn,
  setIngredientIsAddOn,
  startingQty,
  setStartingQty,
  lastSavedKey,
  lastSavedName,
}) {

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
                    <select 
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none cursor-pointer"
                    >
                      <option value="Coffee">Coffee</option>
                      <option value="Shawarma Meals">Shawarma Meals</option>
                      <option value="Milktea">Milktea</option>
                      <option value="Fruit Blends">Fruit Blends</option>
                    </select>
                    <ChevronDown size={24} className="absolute right-4 top-3 text-black pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

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
                  <div className="grid grid-cols-[1fr_2.5fr] gap-y-8 gap-x-12 text-lg text-gray-300">
                    <label className="text-2xl font-medium text-right">Size</label>
                    <div className="relative">
                      <select
                        value={selectedMenuItemSize}
                        onChange={(e) => setSelectedMenuItemSize(e.target.value)}
                        className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none cursor-pointer"
                      >
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                      </select>
                      <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                    </div>

                    <label className="text-2xl font-medium text-right">Price</label>
                    <input
                      type="text"
                      value={sizes[selectedMenuItemSize]?.price || ''}
                      onChange={(e) => setSizes(prev => ({
                        ...prev,
                        [selectedMenuItemSize]: { ...prev[selectedMenuItemSize], price: e.target.value }
                      }))}
                      className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="mt-8 px-4 text-xl text-gray-300">
                    <p>
                      Saved menu item name will become: <span className="text-white font-semibold">{menuItemName ? `${menuItemName} (${selectedMenuItemSize})` : `Your menu name (${selectedMenuItemSize})`}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button 
                onClick={() => setActiveAccordion(activeAccordion === 'addons' ? null : 'addons')} 
                className="w-full p-6 flex justify-between items-center hover:bg-[#444]"
              >
                <h3 className="text-2xl font-medium">Add-Ons</h3>
                {activeAccordion === 'addons' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>

              {activeAccordion === 'addons' && (
                <div className="p-10 border-t border-[#444] space-y-6">
                  {addOns.map((addon, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_2fr_1.2fr_0.5fr_1fr_auto] items-center gap-x-8">
                      <span className="text-2xl font-medium text-right whitespace-nowrap">No. {idx + 1}</span>
                      
                      <div className="relative">
                        <select
                          value={addon.ingredientId}
                          onChange={(e) => {
                            const selectedIngredient = activeIngredients.find(ing => ing.id === e.target.value);
                            const updated = [...addOns];
                            updated[idx] = {
                              ...updated[idx],
                              ingredientId: e.target.value,
                              name: selectedIngredient?.name || '',
                            };
                            setAddOns(updated);
                          }}
                          className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none"
                        >
                          <option value="">Select Add-On</option>
                          {activeIngredients.filter(ing => ing.isAddOn).map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                      </div>

                      <input
                        type="text"
                        placeholder="Unit"
                        value={addon.unit}
                        onChange={(e) => {
                          const updated = [...addOns];
                          updated[idx].unit = e.target.value;
                          setAddOns(updated);
                        }}
                        className="bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold"
                      />

                      <span className="text-2xl font-medium text-right">Php</span>
                      
                      <input 
                        type="text" 
                        value={addon.price} 
                        onChange={(e) => {
                          const updated = [...addOns];
                          updated[idx].price = e.target.value;
                          setAddOns(updated);
                        }}
                        className="bg-white text-black rounded-lg h-12 text-center text-xl font-semibold" 
                      />

                      <button 
                        onClick={() => handleRemoveRow(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors p-2"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={handleAddRow}
                      className="border-2 border-white rounded-xl px-12 py-3 flex items-center gap-3 text-xl font-medium hover:bg-white hover:text-black transition-colors"
                    >
                      <Plus size={24} /> Add another Add-On
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444]">
              <button 
                onClick={() => setActiveAccordion(activeAccordion === 'connections' ? null : 'connections')} 
                className="w-full p-6 flex justify-between items-center hover:bg-[#444] transition-colors"
              >
                <h3 className="text-2xl font-medium">Assign Connections</h3>
                {activeAccordion === 'connections' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>

              {activeAccordion === 'connections' && (
                <div className="p-10 border-t border-[#444] space-y-6">
                  {connections.map((conn, idx) => (
                    <div key={idx} className="grid grid-cols-[1.5fr_2fr_0.5fr_1fr_auto] items-center gap-x-8">
                      <span className="text-2xl font-medium text-right">
                        {conn.type === 'ingredient' ? 'Ingredient' : 'Item'} No. {getSequenceNumber(idx, conn.type)}
                      </span>

                      <div className="relative">
                        <select
                          value={conn.code}
                          onChange={(e) => {
                            const updated = [...connections];
                            updated[idx].code = e.target.value;
                            setConnections(updated);
                          }}
                          className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none"
                        >
                          <option value="" disabled>{conn.type === 'ingredient' ? 'Select Ingredient' : 'Select Item'}</option>
                          {(conn.type === 'ingredient' ? activeIngredients : activeItems).map((entry) => (
                            <option key={entry.id} value={entry.id}>{entry.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                      </div>

                      <span className="text-2xl font-medium text-right">Units</span>

                      <input 
                        type="text" 
                        value={conn.units} 
                        onChange={(e) => {
                          const newConns = [...connections];
                          newConns[idx].units = e.target.value;
                          setConnections(newConns);
                        }}
                        placeholder={conn.type === 'ingredient' ? '' : '1'}
                        className="bg-white text-black rounded-lg h-12 text-center text-xl font-semibold" 
                      />

                      <button 
                        onClick={() => removeConnection(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors p-2"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-center gap-8 pt-4">
                    <button 
                      onClick={() => addConnection('ingredient')}
                      className="border-2 border-white rounded-xl px-8 py-3 flex items-center gap-2 text-xl font-medium hover:bg-white hover:text-black transition-colors"
                    >
                      <Plus size={24} /> Assign Ingredient
                    </button>
                    <button 
                      onClick={() => addConnection('item')}
                      className="border-2 border-white rounded-xl px-8 py-3 flex items-center gap-2 text-xl font-medium hover:bg-white hover:text-black transition-colors"
                    >
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
                    <button onClick={finalizeSaveFlow} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                  </div>
                </div>
              )}
              {showItemSavedSuccess && (
                <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                  <h2 className="text-5xl font-semibold mb-8 text-white"> Menu Item Saved!</h2>
                  <p className="text-2xl text-gray-300 mb-4"><span className="font-semibold text-white">{lastSavedKey}</span></p>
                  <p className="text-2xl text-gray-300 mb-10">{lastSavedName || 'Item'} has been saved.</p>
                  <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); resetCreateStates(); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                </div>
              )}
              {showDiscardPrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                  <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                    <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); resetCreateStates(); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  if (currentView === 'create-item') {
    return (
      <div className="flex w-full h-full gap-6 relative">
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-y-auto custom-scrollbar-gutter">
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
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none" 
                  />
                </div>
              )}
            </div>

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
                  <div className="grid grid-cols-[1fr_2.5fr] gap-y-8 gap-x-12 text-lg text-gray-300">
                    <label className="text-2xl font-medium text-right">Size</label>
                    <div className="relative">
                      <select
                        value={selectedItemSize}
                        onChange={(e) => setSelectedItemSize(e.target.value)}
                        className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold appearance-none cursor-pointer"
                      >
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                      </select>
                      <ChevronDown size={24} className="absolute right-3 top-3 text-black pointer-events-none" />
                    </div>

                    <label className="text-2xl font-medium text-right">Starting Qty.</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={itemStartingQty}
                      onChange={(e) => setItemStartingQty(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="mt-8 px-4 text-xl text-gray-300">
                    <p>
                      Saved item name will become: <span className="text-white font-semibold">{itemName ? `${itemName} (${selectedItemSize})` : `Your item name (${selectedItemSize})`}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto flex justify-center pb-4">
            <button 
              onClick={() => setShowSavePrompt(true)} 
              className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-32 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Save
            </button>
          </div>

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
                    <button onClick={finalizeSaveFlow} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                  </div>
                </div>
              )}
              {showItemSavedSuccess && (
                <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                  <h2 className="text-5xl font-semibold mb-8 text-white"> Item Saved!</h2>
                  <p className="text-2xl text-gray-300 mb-4"><span className="font-semibold text-white">{lastSavedKey}</span></p>
                  <p className="text-2xl text-gray-300 mb-10">{lastSavedName || 'Item'} has been saved.</p>
                  <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); resetCreateStates(); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                </div>
              )}
              {showDiscardPrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                  <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                    <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); resetCreateStates(); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  if (currentView === 'create-ingredient') {
    return (
      <div className="flex w-full h-full gap-6 relative"> 
        <AdminSidebar activePage="maintenance" />
        <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
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

          <div className="bg-[#3d3d3d] rounded-2xl p-10 w-full shadow-inner border border-[#444]">
            <h3 className="text-2xl font-medium mb-10 text-gray-200">General Information</h3>
            
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
                <select 
                  value={ingredientType}
                  onChange={(e) => setIngredientType(e.target.value)}
                  className="w-full bg-white text-black rounded-lg h-12 px-4 text-xl font-semibold focus:outline-none appearance-none cursor-pointer pr-14"
                >
                  <option>Dry</option>
                  <option>Liquid</option>
                  <option>Frozen</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black"><ChevronDown size={28} strokeWidth={3} /></div>
              </div>

              <label className="text-2xl font-medium text-right">Starting Qty.</label>
              <div className="flex items-center gap-4">
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={startingQty}
                  onChange={(e) => setStartingQty(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-white text-black rounded-lg h-12 px-4 text-center text-xl font-semibold focus:outline-none" 
                />
                <span className="text-2xl font-medium w-10">g</span>
              </div>

              <label className="text-2xl font-medium text-right">Is Add-On</label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={ingredientIsAddOn}
                  onChange={(e) => setIngredientIsAddOn(e.target.checked)}
                  className="w-5 h-5 rounded border border-gray-400 bg-white"
                />
                <span className="text-xl text-gray-200">This ingredient can be assigned as an add-on</span>
              </div>
            </div>
          </div>

          <div className="mt-auto flex justify-center pb-4">
            <button onClick={() => setShowSavePrompt(true)} className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white text-2xl font-semibold py-4 px-32 rounded-xl shadow-lg transition-transform active:scale-95">
              Save
            </button>
          </div>
        </main>

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
                    <button onClick={finalizeSaveFlow} className="w-full bg-[#56a2d1] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Save</button>
                  </div>
                </div>
              )}
              {showItemSavedSuccess && (
                <div className="bg-[#2a2a2a] rounded-3xl p-12 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444] text-center">
                  <h2 className="text-5xl font-semibold mb-8 text-white">Creation Saved!</h2>
                  <p className="text-2xl text-gray-300 mb-4"><span className="font-semibold text-white">{lastSavedKey}</span></p>
                  <p className="text-2xl text-gray-300 mb-10">{lastSavedName || 'Item'} has been saved.</p>
                  <button onClick={() => { setShowItemSavedSuccess(false); setCurrentView('main'); resetCreateStates(); }} className="w-full max-w-xs bg-[#4a4a4a] py-4 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                </div>
              )}
              {showDiscardPrompt && (
                <div className="bg-[#2a2a2a] rounded-3xl p-10 shadow-2xl w-full max-w-xl flex flex-col items-center border border-[#444]">
                  <h2 className="text-5xl font-semibold mb-12 text-white text-center">Discard Creation?</h2>
                  <div className="flex flex-col gap-5 w-full max-w-md">
                    <button onClick={() => setShowDiscardPrompt(false)} className="w-full bg-[#4a4a4a] py-5 rounded-2xl text-2xl font-semibold transition-colors">Return</button>
                    <button onClick={() => { setShowDiscardPrompt(false); setCurrentView('main'); resetCreateStates(); }} className="w-full bg-[#ca4646] py-5 rounded-2xl text-2xl font-semibold text-white transition-colors">Discard</button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    );
  }

  return null;
}
