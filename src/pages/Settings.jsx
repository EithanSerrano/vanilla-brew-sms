import { useState } from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import { 
  Settings as SettingsIcon,
  Info,
  CornerUpLeft,
 } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';

export default function Settings({ role }) {
  const navigate = useNavigate();
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;
  const [activeAccordion, setActiveAccordion] = useState(null);

  const toggleAccordion = (topic) => {
    setActiveAccordion(activeAccordion === topic ? null : topic);
  };

  return (
    <div className="flex w-full h-full gap-6">
      <Sidebar activePage="settings" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative h-full min-h-0">
      
      {/* Breadcrumb Header */}
        <div className="flex gap-4 mb-10 shrink-0">
          <button 
            onClick={() => navigate(-1)} 
            className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"
          >
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
            {/* You can now use SettingsIcon here if needed */}
            <SettingsIcon size={20} className="text-white" /> 
            <span>
              Settings {activeAccordion && (
                <span className="text-white"> &gt; {activeAccordion}</span>
              )}
            </span>
          </div>
        </div>

        {/* Accordion Content Logic goes here */}
        <div className="flex flex-col gap-4">
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
        </div>

      </main>
    </div>
  );
}