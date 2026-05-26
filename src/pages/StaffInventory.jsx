import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Filter, Layers, Edit, CornerUpLeft, AlertCircle } from 'lucide-react'; // <-- Added AlertCircle
import StaffSidebar from '../layouts/StaffSidebar';
import { saveTransaction, formatTransactionDate } from '../utils/transactionHelpers';

export default function StaffInventory() {
  const navigate = useNavigate();

  // Manage the inventory data dynamically
  const [inventory, setInventory] = useState([
    { id: 1, type: "Ingredient", elementNo: "INGR001", name: "Egg", stock: 4, lastChecked: "02/28/26", lastRestocked: "02/10/26" },
    { id: 2, type: "Ingredient", elementNo: "INGR002", name: "Meat", stock: 50, lastChecked: "02/28/26", lastRestocked: "02/25/26" },
    { id: 3, type: "Item", elementNo: "ITEM001", name: "Cup", stock: 43, lastChecked: "02/27/26", lastRestocked: "02/22/26" },
    { id: 4, type: "Item", elementNo: "ITEM002", name: "Plate", stock: 33, lastChecked: "02/28/26", lastRestocked: "02/24/26" },
    { id: 5, type: "Item", elementNo: "ITEM003", name: "Spoon", stock: 6, lastChecked: "02/28/26", lastRestocked: "02/12/26" }
  ]);

  // UI States for Modals
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showArrangeModal, setShowArrangeModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false); // <-- Added Warning Modal State
  
  // Track Active Filter and Arrangement
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeArrangement, setActiveArrangement] = useState("Alphabetically (A-Z)");
  
  // Track which row is clicked before hitting "Adjust"
  const [selectedRowId, setSelectedRowId] = useState(null);
  
  // State for the item currently being adjusted in the modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustValue, setAdjustValue] = useState(0);
  const adjustTimer = useRef(null);

  const updateAdjustValue = (delta) => {
    setAdjustValue(prev => Math.max(0, prev + delta));
  };

  const startAdjustRepeat = (delta) => {
    updateAdjustValue(delta);
    if (adjustTimer.current) clearInterval(adjustTimer.current);
    adjustTimer.current = window.setInterval(() => updateAdjustValue(delta), 120);
  };

  const stopAdjustRepeat = () => {
    if (adjustTimer.current) {
      clearInterval(adjustTimer.current);
      adjustTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (adjustTimer.current) {
        clearInterval(adjustTimer.current);
      }
    };
  }, []);

  // Derive the filtered inventory
  const filteredInventory = activeFilter === "All" 
    ? inventory 
    : inventory.filter(item => item.type === activeFilter);

  // Apply the sorting arrangement to the filtered data
  const displayInventory = [...filteredInventory].sort((a, b) => {
    switch (activeArrangement) {
      case "Alphabetically (A-Z)":
        return a.name.localeCompare(b.name);
      case "Alphabetically (Z-A)":
        return b.name.localeCompare(a.name);
      case "Last Checked":
        return new Date(b.lastChecked) - new Date(a.lastChecked);
      case "Last Restocked":
        return new Date(b.lastRestocked) - new Date(a.lastRestocked);
      default:
        return 0;
    }
  });

  // Handlers for Toolbar Buttons
  const handleAdjustClick = () => {
    if (selectedRowId) {
      const itemToAdjust = inventory.find(i => i.id === selectedRowId);
      setSelectedItem(itemToAdjust);
      setAdjustValue(itemToAdjust.stock);
      setShowAdjustModal(true);
    } else {
      // <-- Replaced the alert() with our custom modal!
      setShowWarningModal(true);
    }
  };

  const saveAdjustment = async () => {
    if (!selectedItem) return;
    const oldStock = selectedItem.stock;
    const newStock = adjustValue;

    try {
      await saveTransaction('INV', {
        type: 'Inventory',
        action: 'Adjusted',
        entityType: selectedItem.type,
        entityId: selectedItem.elementNo,
        entityName: selectedItem.name,
        oldStock,
        newStock,
        summary: `Adjusted ${selectedItem.type} ${selectedItem.elementNo} (${selectedItem.name}) from ${oldStock} to ${newStock}`,
        date: formatTransactionDate(),
      });
    } catch (error) {
      console.error('Error recording inventory transaction:', error);
    }

    setInventory(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { ...item, stock: newStock, lastChecked: formatTransactionDate() } 
        : item
    ));
    setShowAdjustModal(false);
    setSelectedRowId(null);
  };

  const applyFilter = (type) => {
    setActiveFilter(type);
    setShowFilterModal(false);
    setSelectedRowId(null); 
  };

  const applyArrangement = (type) => {
    setActiveArrangement(type);
    setShowArrangeModal(false);
  };

  return (
    <div className="flex w-full h-full">
      <StaffSidebar activePage="inventory" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
        
        {/* Top Header Row */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => navigate('/staff')}
            className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-3 rounded-lg transition-colors"
          >
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 font-medium tracking-wide">
            <Package size={20} />
            Inventory
          </div>
        </div>

        {/* Critical Stock Levels Panel */}
        <div className="bg-[#4a4a4a] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 tracking-wide text-gray-200">Critical Stock Levels</h2>
          <div className="grid grid-cols-4 gap-4 text-xl font-medium mb-2 border-b border-[#5a5a5a] pb-2 text-center text-gray-400">
            <div>Element</div>
            <div>Remaining Units</div>
            <div>Last Checked</div>
            <div>Last Restocked</div>
          </div>
          
          {criticalStock.length > 0 ? (
            criticalStock.map(item => (
              <div key={`crit-${item.id}`} className="grid grid-cols-4 gap-4 text-xl mb-3 text-center items-center">
                <div className="font-medium">{item.elementNo}</div>
                <div>{item.stock} units</div>
                <div>Today</div>
                <div>{item.lastRestocked}</div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 mt-4 italic">All stock levels are healthy!</div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex justify-end gap-4 mb-4">
          <button 
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xl font-medium transition-colors ${
              activeFilter !== "All" ? "bg-[#3ca4c7] hover:bg-[#2b8aa8]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"
            }`}
          >
            <Filter size={16} /> {activeFilter === "All" ? "Filter" : `Filter: ${activeFilter}`}
          </button>
          
          <button 
            onClick={() => setShowArrangeModal(true)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xl font-medium transition-colors ${
              activeArrangement !== "Alphabetically (A-Z)" ? "bg-[#3ca4c7] hover:bg-[#2b8aa8]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"
            }`}
          >
            <Layers size={16} /> Arrange
          </button>
          
          <button 
            onClick={handleAdjustClick}
            className="flex items-center gap-2 bg-[#5a5a5a] hover:bg-[#6a6a6a] px-5 py-2 rounded-full text-xl font-medium transition-colors"
          >
            <Edit size={16} /> Adjust
          </button>
        </div>

        {/* Main Inventory Table */}
        <div className="bg-[#4a4a4a] rounded-t-xl rounded-b flex-1 p-6 overflow-auto">
          <table className="w-full text-xl text-center">
            <thead>
              <tr className="border-b border-[#5a5a5a] text-gray-300">
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Element No.</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Stock</th>
                <th className="pb-3 font-medium">Last Checked</th>
                <th className="pb-3 font-medium">Last Restocked</th>
              </tr>
            </thead>
            <tbody>
              {displayInventory.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => setSelectedRowId(item.id)}
                  className={`border-b border-[#5a5a5a] cursor-pointer transition-colors ${
                    selectedRowId === item.id ? 'bg-[#555555] border-l-4 border-[#3ca4c7]' : 'hover:bg-[#4f4f4f]'
                  }`}
                >
                  <td className="py-4">{item.type}</td>
                  <td className="py-4">{item.elementNo}</td>
                  <td className="py-4">{item.name}</td>
                  <td className="py-4">{item.stock}</td>
                  <td className="py-4">{item.lastChecked}</td>
                  <td className="py-4">{item.lastRestocked}</td>
                </tr>
              ))}
              
              {displayInventory.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-gray-400 italic">No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* OVERLAYS AND MODALS */}

        {/* 1. Filter Modal */}
        {showFilterModal && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-50">
            <div className="bg-[#333333] p-6 rounded-xl w-[350px] shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-2 rounded-lg transition-colors"
                >
                  <CornerUpLeft size={18} />
                </button>
                <h3 className="text-xl font-medium tracking-wide">Select Filter</h3>
              </div>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <button 
                  onClick={() => applyFilter("Ingredient")}
                  className={`text-xl font-medium py-3 rounded-lg transition-colors ${activeFilter === "Ingredient" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Ingredient
                </button>
                <button 
                  onClick={() => applyFilter("Item")}
                  className={`text-xl font-medium py-3 rounded-lg transition-colors ${activeFilter === "Item" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Item
                </button>
                <button 
                  onClick={() => applyFilter("All")}
                  className={`text-xl font-medium py-3 rounded-lg transition-colors ${activeFilter === "All" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  All Types
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Arrange Modal */}
        {showArrangeModal && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-50">
            <div className="bg-[#333333] p-6 rounded-xl w-[350px] shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setShowArrangeModal(false)}
                  className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-2 rounded-lg transition-colors"
                >
                  <CornerUpLeft size={18} />
                </button>
                <h3 className="text-xl font-medium tracking-wide">Select Arrangement</h3>
              </div>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <button 
                  onClick={() => applyArrangement("Alphabetically (A-Z)")}
                  className={`text-xl font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Alphabetically (A-Z)" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Alphabetically (A-Z)
                </button>
                <button 
                  onClick={() => applyArrangement("Alphabetically (Z-A)")}
                  className={`text-xl font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Alphabetically (Z-A)" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Alphabetically (Z-A)
                </button>
                <button 
                  onClick={() => applyArrangement("Last Checked")}
                  className={`text-xl font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Last Checked" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Last Checked
                </button>
                <button 
                  onClick={() => applyArrangement("Last Restocked")}
                  className={`text-xl font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Last Restocked" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Last Restocked
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Manual Adjustment Modal */}
        {showAdjustModal && selectedItem && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-50">
            <div className="bg-[#333333] p-8 rounded-xl w-[520px] max-w-[90vw] shadow-2xl">
              
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setShowAdjustModal(false)}
                  className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-2 rounded-lg transition-colors"
                >
                  <CornerUpLeft size={18} />
                </button>
                <h3 className="text-2xl font-medium tracking-wide">Manual Adjustment</h3>
              </div>

              {/* Selected Element Section */}
              <div className="mb-6">
                <h4 className="text-xl font-semibold mb-2 text-gray-300">Selected Element</h4>
                <div className="bg-[#4a4a4a] rounded-lg p-3 flex justify-between text-center text-xl">
                  <div>
                    <div className="text-xl text-gray-400 mb-1">Type</div>
                    <div>{selectedItem.type}</div>
                  </div>
                  <div>
                    <div className="text-xl text-gray-400 mb-1">Element No.</div>
                    <div>{selectedItem.elementNo}</div>
                  </div>
                  <div>
                    <div className="text-xl text-gray-400 mb-1">Name</div>
                    <div>{selectedItem.name}</div>
                  </div>
                </div>
              </div>

              {/* Current Status Section */}
              <div className="mb-8">
                <h4 className="text-xl font-semibold mb-2 text-gray-300">Current Status</h4>
                <div className="bg-[#4a4a4a] rounded-lg p-3 flex justify-between text-center text-xl">
                  <div>
                    <div className="text-xl text-gray-400 mb-1">Stock</div>
                    <div>{selectedItem.stock}</div>
                  </div>
                  <div>
                    <div className="text-xl text-gray-400 mb-1">Last Updated</div>
                    <div>{selectedItem.lastChecked.replace('/26', '/2026')}</div>
                  </div>
                  <div>
                    <div className="text-xl text-gray-400 mb-1">Last Restocked</div>
                    <div>{selectedItem.lastRestocked.replace('/26', '/2026')}</div>
                  </div>
                </div>
              </div>

              {/* Set New Stock Section */}
              <div className="flex flex-col items-center">
                <h4 className="text-xl font-semibold mb-4 text-gray-300 self-start">Set New Stock</h4>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onMouseDown={() => startAdjustRepeat(-10)}
                    onMouseUp={stopAdjustRepeat}
                    onMouseLeave={stopAdjustRepeat}
                    onTouchStart={() => startAdjustRepeat(-10)}
                    onTouchEnd={stopAdjustRepeat}
                    onTouchCancel={stopAdjustRepeat}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateAdjustValue(-10);
                      }
                    }}
                    onClick={(e) => e.preventDefault()}
                    className="bg-[#5a5a5a] hover:bg-[#6a6a6a] w-14 h-12 rounded-lg text-xl font-semibold flex items-center justify-center transition-colors"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => startAdjustRepeat(-1)}
                    onMouseUp={stopAdjustRepeat}
                    onMouseLeave={stopAdjustRepeat}
                    onTouchStart={() => startAdjustRepeat(-1)}
                    onTouchEnd={stopAdjustRepeat}
                    onTouchCancel={stopAdjustRepeat}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateAdjustValue(-1);
                      }
                    }}
                    onClick={(e) => e.preventDefault()}
                    className="bg-[#5a5a5a] hover:bg-[#6a6a6a] w-12 h-12 rounded-lg text-2xl font-medium flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={adjustValue}
                    onChange={(e) => setAdjustValue(Number(e.target.value))}
                    className="w-24 h-12 rounded-lg text-center text-2xl font-bold text-black bg-white focus:outline-none no-spinner"
                  />
                  <button
                    type="button"
                    onMouseDown={() => startAdjustRepeat(1)}
                    onMouseUp={stopAdjustRepeat}
                    onMouseLeave={stopAdjustRepeat}
                    onTouchStart={() => startAdjustRepeat(1)}
                    onTouchEnd={stopAdjustRepeat}
                    onTouchCancel={stopAdjustRepeat}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateAdjustValue(1);
                      }
                    }}
                    onClick={(e) => e.preventDefault()}
                    className="bg-[#5a5a5a] hover:bg-[#6a6a6a] w-12 h-12 rounded-lg text-2xl font-medium flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => startAdjustRepeat(10)}
                    onMouseUp={stopAdjustRepeat}
                    onMouseLeave={stopAdjustRepeat}
                    onTouchStart={() => startAdjustRepeat(10)}
                    onTouchEnd={stopAdjustRepeat}
                    onTouchCancel={stopAdjustRepeat}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateAdjustValue(10);
                      }
                    }}
                    onClick={(e) => e.preventDefault()}
                    className="bg-[#5a5a5a] hover:bg-[#6a6a6a] w-14 h-12 rounded-lg text-xl font-semibold flex items-center justify-center transition-colors"
                  >
                    +10
                  </button>
                </div>
                <button 
                  onClick={saveAdjustment}
                  className="bg-[#5a5a5a] hover:bg-[#6a6a6a] px-8 py-2 rounded-full font-medium tracking-wide transition-colors"
                >
                  Save
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 4. Custom Warning Modal (Replaces browser alert) */}
        {showWarningModal && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-[#333333] p-10 rounded-2xl w-[450px] shadow-2xl flex flex-col items-center text-center">
              
              <div className="bg-red-500/20 p-4 rounded-full mb-6">
                <AlertCircle size={48} className="text-red-400" />
              </div>
              
              <h3 className="text-2xl font-semibold tracking-wide mb-4 text-white">Selection Required</h3>
              
              <p className="text-xl text-gray-200 mb-8 leading-relaxed">
                Please click on an item in the table to select it first!
              </p>

              <button 
                onClick={() => setShowWarningModal(false)}
                className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white px-12 py-3 rounded-full text-xl font-medium transition-colors tracking-wide w-full"
              >
                Got it
              </button>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}