import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, 
  CornerUpLeft, 
  ChevronDown, 
  ChevronUp, 
  WrenchIcon 
} from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

export default function AdminHelp() {
  const navigate = useNavigate();
  const [activeAccordion, setActiveAccordion] = useState(null);

  const helpTopics = [
    "Using the Inventory",
    "Registration of Accounts",
    "Understanding the Dashboard",
    "How to Search",
    "How to create in Maintenance",
    "How to edit in Maintenance",
    "Retrieving and Archiving",
    "Account Management",
    "Recording new Sales"
  ];

  const toggleAccordion = (topic) => {
    setActiveAccordion(activeAccordion === topic ? null : topic);
  };

  return (
    <div className="flex h-full w-full gap-6 overflow-hidden">
      <AdminSidebar activePage="adminhelp" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-y-auto">
        
        {/* Breadcrumb Header */}
        <div className="flex gap-4 mb-10">
          <button 
            onClick={() => navigate(-1)} 
            className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"
          >
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-base font-medium tracking-wide">
            <HelpCircle size={20} className="text-white" />
            <span>
              Help {activeAccordion && (
                <span className="text-white-300"> &gt; {activeAccordion}</span>
              )}
            </span>
          </div>
        </div>

        <h1 className="text-4xl font-semibold mb-8">Admin Instructions</h1>

        {/* Accordion Container */}
        <div className="flex flex-col gap-4 w-full pb-10">
          {helpTopics.map((topic) => (
            <div 
              key={topic} 
              className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444] transition-all duration-300"
            >
              <button 
                onClick={() => toggleAccordion(topic)} 
                className={`w-full p-6 flex justify-between items-center transition-colors ${
                  activeAccordion === topic ? 'bg-[#4a4a4a]' : 'hover:bg-[#444]'
                }`}
              >
                <h3 className="text-2xl font-medium tracking-wide">{topic}</h3>
                {activeAccordion === topic ? (
                  <ChevronUp size={28} className="text-[#3ca4c7]" />
                ) : (
                  <ChevronDown size={28} className="text-gray-400" />
                )}
              </button>

              {/* Accordion Content Area */}
              {activeAccordion === topic && (
                <div className="p-10 border-t border-[#444] animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-[#2a2a2a]/50 p-8 rounded-xl border border-dashed border-[#555]">
                    <p className="text-xl text-gray-400 italic">
                      Instructional content for "{topic}" will be placed here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
