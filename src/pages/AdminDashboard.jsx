import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerUpLeft, ClipboardList, Bell, Filter, ChevronDown, ChevronUp, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // --- DUMMY DATA ---
  const [transactions] = useState([
    { id: 1, type: 'Inventory', transNo: 'IT110125001', date: '11/01/2025', details: { inCharge: 'Ysabella Trazo', accountNo: 'E002', item: 'INGR001 (Egg)', oldStock: 4, newStock: 54 } },
    { id: 2, type: 'Inventory', transNo: 'IT103025002', date: '10/30/2025', details: { inCharge: 'Ysabella Trazo', accountNo: 'E002', item: 'ITEM001 (Cup)', oldStock: 20, newStock: 100 } },
    { id: 3, type: 'Sales', transNo: 'SLS1030250002', date: '10/30/2025', time: '10:30 AM', details: { inCharge: 'Carl Nueva', accountNo: 'E001', orderType: 'Take Out', items: [{ qty: 3, name: 'CMS(16oz), CG, P', price: 'Php 102', total: 'Php 306' }], grandTotal: 'Php 306', amountGiven: 'Php 500' } },
    { id: 4, type: 'Sales', transNo: 'SLS1030250001', date: '10/30/2025', time: '09:15 AM', details: { inCharge: 'Carl Nueva', accountNo: 'E001', orderType: 'Dine In', items: [{ qty: 1, name: 'Mango Graham', price: 'Php 120', total: 'Php 120' }], grandTotal: 'Php 120', amountGiven: 'Php 150' } },
    { id: 5, type: 'Inventory', transNo: 'IT103025001', date: '10/30/2025', details: { inCharge: 'Carl Nueva', accountNo: 'E001', item: 'INGR002 (Meat)', oldStock: 10, newStock: 50 } },
    { id: 6, type: 'Sales', transNo: 'SLS1030240001', date: '10/29/2025', time: '02:15 PM', details: { inCharge: 'Carl Nueva', accountNo: 'E001', orderType: 'Dine In', items: [{ qty: 2, name: 'Shawarma Rice', price: 'Php 99', total: 'Php 198' }], grandTotal: 'Php 198', amountGiven: 'Php 200' } },
  ]);

  const [notifications] = useState([
    { id: 1, type: 'Inventory', reference: 'IT110125001', date: '11/01/2025', status: 'View' },
    { id: 2, type: 'Ingredient', reference: 'INGR001', date: '11/01/2025', status: 'Low on Stock' },
    { id: 3, type: 'Item', reference: 'ITEM003', date: '11/01/2025', status: 'Critically Low' },
    { id: 4, type: 'Sales', reference: 'SLS1030250002', date: '11/01/2025', status: 'View' },
  ]);

  // --- STATES ---
  const [isTopSalesExpanded, setIsTopSalesExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [startDate, setStartDate] = useState('2025-10-29');
  const [endDate, setEndDate] = useState('2025-10-31');

  // Modal States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);

  // --- LOGIC ---
  const isDateInRange = (transDateStr) => {
    const tDate = new Date(transDateStr).setHours(0, 0, 0, 0);
    const [sYear, sMonth, sDay] = startDate.split('-');
    const sDate = new Date(sYear, sMonth - 1, sDay).setHours(0, 0, 0, 0);
    const [eYear, eMonth, eDay] = endDate.split('-');
    const eDate = new Date(eYear, eMonth - 1, eDay).setHours(0, 0, 0, 0);
    return tDate >= sDate && tDate <= eDate;
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Inventory' || activeFilter === 'Sales') return t.type === activeFilter;
    if (activeFilter === 'Date') return isDateInRange(t.date);
    return true;
  });

  let breadcrumbText = "Dashboard";
  if (viewingTransaction) breadcrumbText = "Dashboard > View Transaction";
  else if (showFilterMenu) breadcrumbText = "Dashboard > Filter";
  else if (activeFilter !== 'All') breadcrumbText = `Dashboard > Filtered (${activeFilter})`;

  const openTransaction = (trans) => setViewingTransaction(trans);

  const closeAllModals = () => {
    setShowNotifications(false);
    setShowFilterMenu(false);
    setShowDateFilter(false);
    setViewingTransaction(null);
  };

  const applyFilter = (filterParam) => {
    if (filterParam === 'Date') {
      setShowFilterMenu(false);
      setShowDateFilter(true);
    } else {
      setActiveFilter(filterParam);
      setShowFilterMenu(false);
    }
  };

  const applyDateFilter = () => {
    if (!startDate || !endDate) {
      alert("Please select both a start and end date.");
      return;
    }
    setActiveFilter('Date');
    setShowDateFilter(false);
  };

  return (
    <div className="flex w-full h-full gap-6">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #666; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #888; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
      `}</style>

      <AdminSidebar activePage="dashboard" />
      
      <main className="flex-1 min-h-0 bg-[#2a2a2a] rounded-xl flex flex-col text-white relative overflow-hidden">
        
        {/* INNER SCROLLABLE CONTENT WRAPPER */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col">
          
          {/* Top Header Row */}
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => {
                // --- THE NEW LOGIC IS HERE ---
                if (viewingTransaction || showFilterMenu || showDateFilter || showNotifications) {
                  closeAllModals();
                } else if (activeFilter !== 'All') {
                  setActiveFilter('All');
                } else {
                  navigate('/admin');
                }
              }}
              className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-3 rounded-lg transition-colors z-10"
            >
              <CornerUpLeft size={20} />
            </button>
            <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 font-medium tracking-wide z-10">
              <ClipboardList size={20} />
              {breadcrumbText}
            </div>
          </div>

          {/* TOP SALES SECTION */}
          <div className="bg-[#4a4a4a] rounded-xl mb-6 flex flex-col transition-all duration-300 shrink-0">
            <button 
              onClick={() => setIsTopSalesExpanded(!isTopSalesExpanded)}
              className="w-full p-5 flex items-center justify-between hover:bg-[#555555] rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-medium tracking-wide">Top Sales</h2>
                {isTopSalesExpanded && <RefreshCw size={20} className="text-gray-300 mt-1" />}
              </div>
              {isTopSalesExpanded ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
            </button>

            {isTopSalesExpanded && (
              <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <p className="text-lg text-gray-200 mb-6">The top selling products for this week are:</p>
                
                <div className="grid grid-cols-2 gap-16">
                  <div>
                    <h3 className="text-xl font-medium text-center mb-6">Beverage</h3>
                    <div className="flex flex-col gap-5">
                      <div><div className="text-sm mb-1">Classic Mango Float</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[95%]"></div></div>
                      <div><div className="text-sm mb-1">Mango Oreo Shake</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[80%]"></div></div>
                      <div><div className="text-sm mb-1">Mango Overload Pop</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[65%]"></div></div>
                      <div><div className="text-sm mb-1">Mango Graham Shake</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[60%]"></div></div>
                      <div><div className="text-sm mb-1">Mango Cheesecake</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[45%]"></div></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium text-center mb-6">Food</h3>
                    <div className="flex flex-col gap-5">
                      <div><div className="text-sm mb-1">Nachowarma</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[90%]"></div></div>
                      <div><div className="text-sm mb-1">Shawarma Rice</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[75%]"></div></div>
                      <div><div className="text-sm mb-1">Shawarma Wraps</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[65%]"></div></div>
                      <div><div className="text-sm mb-1">French Fries</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[60%]"></div></div>
                      <div><div className="text-sm mb-1">Shawarma Salad</div><div className="h-4 bg-[#3ca4c7] rounded-sm w-[45%]"></div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TRANSACTIONS HEADER */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-3xl font-medium tracking-wide">Transactions List</h2>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowNotifications(true)}
                className="flex items-center gap-2 bg-[#5a5a5a] hover:bg-[#6a6a6a] px-5 py-2 rounded-full text-sm font-medium transition-colors relative"
              >
                <Bell size={16} /> Notifications
                <span className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => setShowFilterMenu(true)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter !== 'All' ? 'bg-[#3ca4c7]' : 'bg-[#5a5a5a] hover:bg-[#6a6a6a]'
                }`}
              >
                <Filter size={16} /> Filter
              </button>
            </div>
          </div>

          {/* TRANSACTIONS TABLE */}
          <div className="bg-[#4a4a4a] rounded-xl flex-1 p-6 min-h-[400px]">
            <table className="w-full text-sm text-center">
              <thead>
                <tr className="border-b border-[#5a5a5a] text-gray-300">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Transaction Number</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((trans) => (
                  <tr key={trans.id} className="border-b border-[#5a5a5a]">
                    <td className="py-4">{trans.type}</td>
                    <td className="py-4">{trans.transNo}</td>
                    <td className="py-4">{trans.date}</td>
                    <td className="py-4">
                      <button 
                        onClick={() => openTransaction(trans)}
                        className="underline hover:text-[#3ca4c7] transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-gray-400 italic">No transactions found for this date range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div> 
        {/* END OF SCROLLABLE WRAPPER */}

        {/* --- OVERLAYS AND MODALS --- */}

        {/* 1. Notifications Modal */}
        {showNotifications && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-50">
            <div className="bg-[#333333] p-8 rounded-xl w-[700px] shadow-2xl flex flex-col items-center">
              <h3 className="text-2xl font-medium tracking-wide mb-6">Notifications</h3>
              
              <table className="w-full text-sm text-center mb-8">
                <tbody>
                  {notifications.map((notif) => (
                    <tr key={notif.id} className="border-b border-[#4a4a4a] text-gray-200">
                      <td className="py-4 font-medium">{notif.type}</td>
                      <td className="py-4">{notif.reference}</td>
                      <td className="py-4">{notif.date}</td>
                      <td 
                        className={`py-4 ${notif.status === 'View' ? 'underline cursor-pointer hover:text-[#3ca4c7]' : ''}`}
                        onClick={() => {
                          if (notif.status === 'View') {
                            const matchingTrans = transactions.find(t => t.transNo === notif.reference);
                            if (matchingTrans) {
                              setShowNotifications(false);
                              setViewingTransaction(matchingTrans);
                            } else {
                              alert("Transaction details not found in dummy data.");
                            }
                          }
                        }}
                      >
                        {notif.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button 
                onClick={closeAllModals}
                className="bg-[#5a5a5a] hover:bg-[#6a6a6a] px-12 py-2 rounded-full font-medium tracking-wide transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* 2. Filter Menu Modal */}
        {showFilterMenu && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-50">
            <div className="bg-[#333333] p-6 rounded-xl w-[350px] shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={closeAllModals} className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-2 rounded-lg transition-colors">
                  <CornerUpLeft size={18} />
                </button>
                <h3 className="text-xl font-medium tracking-wide">Select Filter</h3>
              </div>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <button onClick={() => applyFilter('Inventory')} className="bg-[#5a5a5a] hover:bg-[#6a6a6a] text-lg font-medium py-3 rounded-lg transition-colors">Inventory</button>
                <button onClick={() => applyFilter('Sales')} className="bg-[#5a5a5a] hover:bg-[#6a6a6a] text-lg font-medium py-3 rounded-lg transition-colors">Sales</button>
                <button onClick={() => applyFilter('Date')} className="bg-[#5a5a5a] hover:bg-[#6a6a6a] text-lg font-medium py-3 rounded-lg transition-colors">Date</button>
                <button onClick={() => applyFilter('All')} className="mt-2 text-sm text-gray-400 hover:text-white transition-colors">Clear Filters</button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Date Picker Modal */}
        {showDateFilter && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-50">
            <div className="bg-[#333333] p-6 rounded-xl w-[600px] shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={closeAllModals} className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-2 rounded-lg transition-colors">
                  <CornerUpLeft size={18} />
                </button>
                <h3 className="text-xl font-medium tracking-wide">Select Date Filter</h3>
              </div>
              
              <div className="flex gap-8 px-4 pb-4">
                <div className="flex flex-col flex-1 gap-6 justify-center">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Picked</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-[#5a5a5a] text-white py-2 px-4 rounded-full text-center text-sm focus:outline-none w-full border border-transparent focus:border-[#3ca4c7]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Picked (End)</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-[#5a5a5a] text-white py-2 px-4 rounded-full text-center text-sm focus:outline-none w-full border border-transparent focus:border-[#3ca4c7]"
                    />
                  </div>
                  <button 
                    onClick={applyDateFilter}
                    className="bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white font-medium py-2 rounded-xl mt-4 transition-colors"
                  >
                    Enter
                  </button>
                </div>

                <div className="flex-1 bg-[#5a5a5a] p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-4 text-sm font-medium">
                    <ChevronLeft size={16} />
                    <span>October 2025</span>
                    <ChevronRight size={16} />
                  </div>
                  <div className="grid grid-cols-7 gap-y-3 text-center text-xs font-medium">
                    <div className="text-gray-300">S</div><div className="text-gray-300">M</div><div className="text-gray-300">T</div><div className="text-gray-300">W</div><div className="text-gray-300">T</div><div className="text-gray-300">F</div><div className="text-gray-300">S</div>
                    <div></div><div></div><div></div><div>1</div><div>2</div><div>3</div><div>4</div>
                    <div>5</div><div>6</div><div>7</div><div>8</div><div>9</div><div>10</div><div>11</div>
                    <div>12</div><div>13</div><div>14</div><div>15</div><div>16</div><div>17</div><div>18</div>
                    <div>19</div><div>20</div><div>21</div><div>22</div><div>23</div><div>24</div><div>25</div>
                    <div>26</div><div>27</div><div>28</div>
                    <div className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center mx-auto">29</div>
                    <div className="bg-gray-400 text-black rounded-full w-6 h-6 flex items-center justify-center mx-auto">30</div>
                    <div className="bg-[#3ca4c7] text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto">31</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. View Transaction Modal */}
        {viewingTransaction && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-50">
            <div className="bg-[#333333] p-8 rounded-2xl w-[600px] shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <button onClick={closeAllModals} className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-2 rounded-lg transition-colors">
                  <CornerUpLeft size={18} />
                </button>
                <h3 className="text-2xl font-medium tracking-wide">View Transaction</h3>
              </div>

              {viewingTransaction.type === 'Inventory' ? (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Date</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.date}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Transaction No.</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.transNo}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">In Charge</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.details.inCharge}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Account No.</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.details.accountNo}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3">Summary</h4>
                    <div className="bg-[#5a5a5a] p-5 rounded-lg text-gray-200 text-lg">
                      Changed stock of <span className="font-bold text-white">{viewingTransaction.details.item}</span> from <span className="font-bold text-white">{viewingTransaction.details.oldStock}</span> to <span className="font-bold text-white">{viewingTransaction.details.newStock}</span>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Date</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.date}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Transaction No.</span>
                      <div className="bg-[#5a5a5a] px-4 py-2 rounded-lg text-sm">{viewingTransaction.transNo}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Time</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.time}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">In Charge</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.details.inCharge}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Order Type</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.details.orderType}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Account No.</span>
                      <div className="bg-[#5a5a5a] px-6 py-2 rounded-lg text-sm">{viewingTransaction.details.accountNo}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-2">Receipt</h4>
                    <div className="bg-[#5a5a5a] p-5 rounded-lg text-sm">
                      <table className="w-full text-center mb-4">
                        <thead>
                          <tr className="text-gray-300 border-b border-[#4a4a4a]">
                            <th className="pb-2 font-medium">Qty.</th>
                            <th className="pb-2 font-medium">Menu Item</th>
                            <th className="pb-2 font-medium">Price</th>
                            <th className="pb-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingTransaction.details.items.map((item, index) => (
                            <tr key={index}>
                              <td className="pt-3">{item.qty}</td>
                              <td className="pt-3">{item.name}</td>
                              <td className="pt-3">{item.price}</td>
                              <td className="pt-3">{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <div className="border-t-2 border-white pt-4 flex flex-col items-end gap-1 pr-4">
                        <div className="flex justify-between w-[200px]">
                          <span className="font-medium">Total</span>
                          <span>{viewingTransaction.details.grandTotal}</span>
                        </div>
                        <div className="flex justify-between w-[200px]">
                          <span className="font-medium text-gray-300">Amount Given</span>
                          <span className="text-gray-300">{viewingTransaction.details.amountGiven}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}