import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { saveTransaction, formatTransactionDate } from '../utils/transactionHelpers';
import { Package, Filter, Layers, ArrowUpDown, RefreshCcw, CornerUpLeft, AlertCircle } from 'lucide-react'; 
import AdminSidebar from '../layouts/AdminSidebar';

export default function Inventory() {
  const navigate = useNavigate();

  // Manage the inventory data dynamically
  const [inventory, setInventory] = useState([]);

  const formatFirestoreDate = (value) => {
    if (!value) return '';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US');
  };

  const loadInventory = async () => {
    try {
      const ingredientSnapshot = await getDocs(collection(db, 'ingredients'));
      const itemSnapshot = await getDocs(collection(db, 'items'));

      const ingredientRows = ingredientSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'Ingredient',
          elementNo: data.id || doc.id,
          name: data.name || data.ingredientName || 'Unnamed Ingredient',
          stock: data.startingQty ?? data.stock ?? 0,
          lastChecked: formatFirestoreDate(data.updatedAt) || formatFirestoreDate(data.createdAt) || new Date().toLocaleDateString('en-US'),
          lastRestocked: formatFirestoreDate(data.createdAt) || new Date().toLocaleDateString('en-US'),
        };
      });

      const itemRows = itemSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'Item',
          elementNo: data.id || doc.id,
          name: data.name || data.itemName || 'Unnamed Item',
          stock: data.startingQty ?? data.stock ?? 0,
          lastChecked: formatFirestoreDate(data.updatedAt) || formatFirestoreDate(data.createdAt) || new Date().toLocaleDateString('en-US'),
          lastRestocked: formatFirestoreDate(data.createdAt) || new Date().toLocaleDateString('en-US'),
        };
      });

      setInventory([...ingredientRows, ...itemRows]);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // UI States for Modals
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showArrangeModal, setShowArrangeModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  
  // Track Active Filter and Arrangement
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeArrangement, setActiveArrangement] = useState("Alphabetically (A-Z)");
  
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
      if (adjustTimer.current) clearInterval(adjustTimer.current);
    };
  }, []);

  // Automatically calculate critical stock
  const criticalStock = inventory.filter(item => item.stock < 10);

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
      case "Element No. (Asc)":
        return a.elementNo.localeCompare(b.elementNo, undefined, { numeric: true });
      case "Element No. (Des)":
        return b.elementNo.localeCompare(a.elementNo, undefined, { numeric: true });
      case "Last Checked":
        return new Date(b.lastChecked) - new Date(a.lastChecked);
      case "Last Restocked":
        return new Date(b.lastRestocked) - new Date(a.lastRestocked);
      default:
        return 0;
    }
  });

  // Handlers for Toolbar Buttons
  const handleAdjustClick = (item) => {
    setSelectedItem(item);
    setAdjustValue(item.stock);
    setShowAdjustModal(true);
  };

  const refreshInventory = async () => {
    await loadInventory();
  };

  const saveAdjustment = async () => {
    if (!selectedItem) return;

    const oldStock = selectedItem.stock;
    const newStock = adjustValue;
    const collectionName = selectedItem.type === 'Ingredient' ? 'ingredients' : 'items';

    try {
      await updateDoc(doc(db, collectionName, selectedItem.id), {
        stock: newStock,
        startingQty: newStock,
        updatedAt: new Date(),
      });

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

      setInventory(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, stock: newStock, lastChecked: formatTransactionDate() } 
          : item
      ));
      setShowAdjustModal(false);
    } catch (error) {
      console.error('Error saving inventory adjustment:', error);
      alert('Error saving inventory adjustment. Please try again.');
    }
  };

  const applyFilter = (type) => {
    setActiveFilter(type);
    setShowFilterModal(false);
  };

  const applyArrangement = (type) => {
    setActiveArrangement(type);
    setShowArrangeModal(false);
  };

  return (
    <div className="flex w-full h-full gap-6">
      <AdminSidebar activePage="inventory" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative">
        
        {/* Top Header Row */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => navigate('/admin')}
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
          <h2 className="text-lg font-semibold mb-4 tracking-wide text-white">Critical Stock Levels</h2>
          <div className="grid grid-cols-4 gap-4 text-sm font-medium mb-2 border-b border-[#5a5a5a] pb-2 text-center text-white">
            <div>Element</div>
            <div>Remaining Units</div>
            <div>Last Checked</div>
            <div>Last Restocked</div>
          </div>
          
          {criticalStock.length > 0 ? (
            criticalStock.map(item => (
              <div key={`crit-${item.id}`} className="grid grid-cols-4 gap-4 text-sm mb-3 text-center items-center">
                <div className="font-medium">{item.elementNo}</div>
                <div>{item.stock} units</div>
                <div>Today</div>
                <div>{item.lastRestocked}</div>
              </div>
            ))
          ) : (
            <div className="text-center text-white mt-4 italic">All stock levels are healthy!</div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex justify-end gap-4 mb-4">
          <button 
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter !== "All" ? "bg-[#3ca4c7] hover:bg-[#2b8aa8]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"
            }`}
          >
            <Filter size={16} /> {activeFilter === "All" ? "Filter" : `Filter: ${activeFilter}`}
          </button>
          
          <button 
            onClick={() => setShowArrangeModal(true)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeArrangement !== "Alphabetically (A-Z)" ? "bg-[#3ca4c7] hover:bg-[#2b8aa8]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"
            }`}
          >
            <Layers size={16} /> Arrange
          </button>
          
          <button 
            onClick={refreshInventory}
            className="flex items-center gap-2 bg-[#5a5a5a] hover:bg-[#6a6a6a] px-5 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>

        {/* Main Inventory Table */}
        <div className="bg-[#4a4a4a] rounded-t-xl rounded-b flex-1 p-6 overflow-auto">
          <table className="w-full table-fixed text-sm text-center">
            <thead>
              <tr className="border-b border-[#5a5a5a] text-white">
                <th className="pb-3 font-medium w-1/5">Element No.</th>
                <th className="pb-3 font-medium w-1/5">Name</th>
                <th className="pb-3 font-medium w-1/5">Stock</th>
                <th className="pb-3 font-medium w-1/5">Last Checked</th>
                <th className="pb-3 font-medium w-1/5">Last Restocked</th>
                <th className="pb-3 font-medium w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayInventory.map((item) => (
                <tr 
                  key={item.id} 
                  className="border-b border-[#5a5a5a] transition-colors hover:bg-[#4f4f4f]"
                >
                  <td className="py-4 w-1/5">{item.elementNo}</td>
                  <td className="py-4 w-1/5">{item.name}</td>
                  <td className="py-4 w-1/5">{item.stock}</td>
                  <td className="py-4 w-1/5">{item.lastChecked}</td>
                  <td className="py-4 w-1/5">{item.lastRestocked}</td>
                  <td className="py-4 w-[120px]">
                    <button
                      onClick={() => handleAdjustClick(item)}
                      className="bg-[#5a5a5a] hover:bg-[#6a6a6a] rounded-full p-2 transition-colors"
                    >
                      <ArrowUpDown size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              
              {displayInventory.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-white italic">No items found.</td>
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
                <h3 className="text-xl font-medium tracking-wide text-white">Select Filter</h3>
              </div>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <button 
                  onClick={() => applyFilter("Ingredient")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeFilter === "Ingredient" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Ingredient
                </button>
                <button 
                  onClick={() => applyFilter("Item")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeFilter === "Item" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Item
                </button>
                <button 
                  onClick={() => applyFilter("All")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeFilter === "All" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
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
                <h3 className="text-xl font-medium tracking-wide text-white">Select Arrangement</h3>
              </div>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <button 
                  onClick={() => applyArrangement("Alphabetically (A-Z)")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Alphabetically (A-Z)" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Alphabetically (A-Z)
                </button>
                <button 
                  onClick={() => applyArrangement("Alphabetically (Z-A)")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Alphabetically (Z-A)" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Alphabetically (Z-A)
                </button>
                <button 
                  onClick={() => applyArrangement("Element No. (Asc)")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Element No. (Asc)" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Element No. (Asc)
                </button>
                <button 
                  onClick={() => applyArrangement("Element No. (Des)")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Element No. (Des)" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Element No. (Des)
                </button>
                <button 
                  onClick={() => applyArrangement("Last Checked")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Last Checked" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
                >
                  Last Checked
                </button>
                <button 
                  onClick={() => applyArrangement("Last Restocked")}
                  className={`text-lg font-medium py-3 rounded-lg transition-colors ${activeArrangement === "Last Restocked" ? "bg-[#3ca4c7]" : "bg-[#5a5a5a] hover:bg-[#6a6a6a]"}`}
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
                <h3 className="text-2xl font-medium tracking-wide text-white">Manual Adjustment</h3>
              </div>

              {/* Selected Element Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-2 text-white">Selected Element</h4>
                <div className="bg-[#4a4a4a] rounded-lg p-3 flex justify-between text-center text-sm">
                  <div>
                    <div className="text-xs text-white mb-1">Type</div>
                    <div>{selectedItem.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white mb-1">Element No.</div>
                    <div>{selectedItem.elementNo}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white mb-1">Name</div>
                    <div>{selectedItem.name}</div>
                  </div>
                </div>
              </div>

              {/* Current Status Section */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold mb-2 text-white">Current Status</h4>
                <div className="bg-[#4a4a4a] rounded-lg p-3 flex justify-between text-center text-sm">
                  <div>
                    <div className="text-xs text-white mb-1">Stock</div>
                    <div>{selectedItem.stock}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white mb-1">Last Updated</div>
                    <div>{selectedItem.lastChecked.replace('/26', '/2026')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white mb-1">Last Restocked</div>
                    <div>{selectedItem.lastRestocked.replace('/26', '/2026')}</div>
                  </div>
                </div>
              </div>

              {/* Set New Stock Section */}
              <div className="flex flex-col items-center">
                <h4 className="text-sm font-semibold mb-4 text-white self-start">Set New Stock</h4>
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
                    className="bg-[#5a5a5a] hover:bg-[#6a6a6a] w-14 h-12 rounded-lg text-lg font-semibold flex items-center justify-center transition-colors"
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
                    className="bg-[#5a5a5a] hover:bg-[#6a6a6a] w-14 h-12 rounded-lg text-lg font-semibold flex items-center justify-center transition-colors"
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


      </main>
    </div>
  );
}