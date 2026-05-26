import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, ChevronDown, ChevronUp, CornerUpLeft } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';

export default function About({ role }) {
  const navigate = useNavigate();
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;
  const [activeAccordion, setActiveAccordion] = useState(null);

  const aboutTopics = [
    "System Specifications",
    "Company Profile"
  ];

  const toggleAccordion = (topic) => {
    setActiveAccordion(activeAccordion === topic ? null : topic);
  };

  return (
    <div className="flex h-full w-full gap-6 overflow-hidden">
      <Sidebar activePage="about" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative h-full min-h-0">
        
        {/* Breadcrumb Header */}
        <div className="flex gap-4 mb-10 shrink-0">
          <button 
            onClick={() => navigate(-1)} 
            className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"
          >
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-xl font-medium tracking-wide">
            <Info size={20} className="text-white" />
            <span>
              About {activeAccordion && (
                <span className="text-white"> &gt; {activeAccordion}</span>
              )}
            </span>
          </div>
        </div>

        {/* Main Content Container (Nested Style) */}
        
          <h1 className="text-3xl font-semibold mb-10 shrink-0">System Information</h1>

          {/* Accordion List */}
          <div className="flex flex-col gap-4 w-full pb-10">
            {aboutTopics.map((topic) => (
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
                    <ChevronUp size={28} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={28} className="text-gray-400" />
                  )}
                </button>

                {/* Accordion Content Area */}
                {activeAccordion === topic && (
                  <div className="p-10 border-t border-[#444] animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-[#2a2a2a]/50 p-8 rounded-xl border border-dashed border-[#555]">
                      <p className="text-xl text-gray-300 leading-relaxed">
                        {topic === "System Specifications" ? (
                          "Technical details regarding the hardware and software requirements of the system."
                        ) : (
                          "Information regarding the organization and the mission behind this platform."
                        )}
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
