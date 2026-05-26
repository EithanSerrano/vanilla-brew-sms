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

  // Replaced the array of strings with an array of objects containing the content!
  const helpData = [
    {
      title: "Using the Inventory",
      content: "Navigate to the Inventory tab to view all current stock. You can use the 'Filter' button to separate Ingredients from Items, and the 'Arrange' button to sort them. To update quantities, click on an item row to select it, then click 'Adjust' to add or subtract stock."
    },
    {
      title: "Registration of Accounts",
      content: "Only Administrators can register new accounts. Go to the Registration tab, fill out the employee's details, assign them a role (Admin or Staff), and set their initial password."
    },
    {
      title: "Understanding the Dashboard",
      content: "The Dashboard provides a real-time overview of the shop. 'Top Sales' highlights the most popular items for the week. The 'Transactions List' shows a history of inventory adjustments and sales. Use the Filter button to narrow down transactions by specific dates or types."
    },
    {
      title: "How to Search",
      content: "Use the Search module to quickly find specific inventory items, past transactions, or employee records. Simply type your keyword into the search bar and the system will filter the results automatically."
    },
    {
      title: "How to create in Maintenance",
      content: "To add a completely new product or ingredient to the system, navigate to the Maintenance tab, click 'Add New', and fill in the item details including its name, category, and starting stock level."
    },
    {
      title: "How to edit in Maintenance",
      content: "If an item's details change (like its name or category), go to the Maintenance tab, click on the item from the list to select it, and click 'Edit' to update its information."
    },
    {
      title: "Retrieving and Archiving",
      content: "To keep the system organized, discontinued items can be Archived from the Maintenance tab. If you need them back, switch to the 'Archived' view, select the item, and click 'Retrieve' to restore it to the active inventory."
    },
    {
      title: "Account Management",
      content: "Staff can update their personal application preferences in the Settings tab. To reset a forgotten password, go to the Login screen and click 'Forgot Password'. You will need an Administrator to input their Admin Passkey to authorize the reset."
    },
    {
      title: "Recording new Sales",
      content: "Sales are recorded automatically when an order is finalized in the Point of Sale terminal. To view the receipt or details of a specific sale, go to the Dashboard and click 'View' on the corresponding transaction row."
    }
  ];

  const toggleAccordion = (topicTitle) => {
    setActiveAccordion(activeAccordion === topicTitle ? null : topicTitle);
  };

  return (
    <div className="flex h-full w-full gap-6 overflow-hidden">
      <AdminSidebar activePage="help" /> 
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-y-auto">
        
        {/* Breadcrumb Header */}
        <div className="flex gap-4 mb-10">
          <button 
            onClick={() => navigate(-1)} 
            className="bg-[#5a5a5a] p-3 rounded-lg hover:bg-[#6a6a6a]"
          >
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 text-xl font-medium tracking-wide">
            <HelpCircle size={20} className="text-white" />
            <span>
              Help {activeAccordion && (
                <span className="text-gray-300"> &gt; {activeAccordion}</span>
              )}
            </span>
          </div>
        </div>

        <h1 className= "text-3xl font-semibold mb-10 shrink-0">Admin Instructions</h1>

        {/* Accordion Container */}
        <div className="flex flex-col gap-4 w-full pb-10">
          {helpData.map((item) => (
            <div 
              key={item.title} 
              className="bg-[#3d3d3d] rounded-2xl overflow-hidden border border-[#444] transition-all duration-300"
            >
              <button 
                onClick={() => toggleAccordion(item.title)} 
                className={`w-full p-6 flex justify-between items-center transition-colors ${
                  activeAccordion === item.title ? 'bg-[#4a4a4a]' : 'hover:bg-[#444]'
                }`}
              >
                <h3 className="text-2xl font-medium tracking-wide">{item.title}</h3>
                {activeAccordion === item.title ? (
                  <ChevronUp size={28} className="text-[#3ca4c7]" />
                ) : (
                  <ChevronDown size={28} className="text-gray-400" />
                )}
              </button>

              {/* Accordion Content Area */}
              {activeAccordion === item.title && (
                <div className="p-10 border-t border-[#444] animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-[#2a2a2a]/50 p-8 rounded-xl border border-dashed border-[#555]">
                    {/* Replaced the placeholder with the actual content */}
                    <p className="text-xl text-gray-200 leading-relaxed">
                      {item.content}
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