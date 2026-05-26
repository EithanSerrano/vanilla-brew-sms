import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CornerUpLeft, 
  Search as SearchIcon, 
  Package, 
  ClipboardList, 
  Info, 
  User, 
  Coffee, 
  X,
  HelpCircle
} from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';

export default function AdminSearch() {
  const navigate = useNavigate();

  // --- STATES ---
  // Tracks which category is currently selected (null means we are on the selection screen)
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- DUMMY DATA ---
  const inventoryData = [
    { type: 'Ingredient', id: 'INGR001', name: 'Egg' },
    { type: 'Ingredient', id: 'INGR002', name: 'Meat' },
    { type: 'Item', id: 'ITEM001', name: 'Cup' },
    { type: 'Item', id: 'ITEM002', name: 'Plate' }
  ];

  // Map category names to their respective icons for easy rendering
  const categories = [
    { name: 'Inventory', icon: Package },
    { name: 'Transaction', icon: ClipboardList },
    { name: 'Instructions', icon: Info },
    { name: 'Account', icon: User },
    { name: 'Menu', icon: Coffee },
  ];

  // --- LOGIC ---
  const handleBack = () => {
    if (selectedCategory) {
      // If we are inside a category, go back to category selection
      setSelectedCategory(null);
      setSearchQuery('');
    } else {
      // If we are on the main search screen, go back to the dashboard
      navigate('/admin');
    }
  };

  const clearCategory = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  // Find the selected category object so we can use its specific icon
  const ActiveIcon = selectedCategory 
    ? categories.find(c => c.name === selectedCategory)?.icon || SearchIcon
    : SearchIcon;

  // Filter dummy data based on query (Only implemented for Inventory for this mockup)
  const searchResults = selectedCategory === 'Inventory' && searchQuery.trim() !== ''
    ? inventoryData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="flex w-full h-full">
      <AdminSidebar activePage="search" />
      
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white relative overflow-hidden">
        
        {/* Top Header Row */}
        <div className="flex gap-4 mb-10">
          <button 
            onClick={handleBack}
            className="bg-[#5a5a5a] hover:bg-[#6a6a6a] p-3 rounded-lg transition-colors"
          >
            <CornerUpLeft size={20} />
          </button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 font-medium tracking-wide">
            <SearchIcon size={20} />
            {selectedCategory ? `Search > ${selectedCategory}` : 'Search'}
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex flex-col flex-1 animate-in fade-in duration-300">
          <h1 className="text-3xl font-semibold mb-8 tracking-wide">Search</h1>

          {/* VIEW 1: CATEGORY SELECTION */}
          {!selectedCategory ? (
            <div>
              <h2 className="text-2xl font-medium mb-6">Select Category</h2>
              
              <div className="flex flex-wrap gap-5">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className="flex items-center gap-3 bg-[#4a4a4a] hover:bg-[#5a5a5a] px-8 py-4 rounded-xl text-xl font-medium transition-colors tracking-wide"
                  >
                    <cat.icon size={24} />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            
            /* VIEW 2: SEARCH INPUT & RESULTS */
            <div className="flex flex-col w-full max-w-4xl">
              
              {/* Search Input */}
              <div className="relative w-full">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full bg-[#4a4a4a] text-white rounded-xl h-14 px-6 text-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#3ca4c7] pr-14"
                  autoFocus
                />
                <SearchIcon size={24} className="absolute right-5 top-4 text-gray-300" />
              </div>

              {/* Active Category Pill */}
              <button 
                onClick={clearCategory}
                className="flex items-center gap-3 bg-[#5a5a5a] hover:bg-[#6a6a6a] px-5 py-2.5 rounded-lg mt-5 w-fit transition-colors group"
                title="Clear Category"
              >
                <ActiveIcon size={20} />
                <span className="text-xl font-medium">{selectedCategory}</span>
                <X size={20} className="text-gray-300 group-hover:text-white transition-colors ml-2" />
              </button>

              <hr className="border-[#4a4a4a] my-8" />

              {/* Search Results */}
              {searchQuery && (
                <div className="animate-in fade-in duration-300">
                  <h3 className="text-2xl font-medium mb-6">Result for “{searchQuery}”</h3>
                  
                  {searchResults.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {searchResults.map((result) => (
                        <div key={result.id} className="grid grid-cols-4 gap-4 items-center px-4 py-4 text-xl font-medium border-b border-[#4a4a4a] last:border-0 hover:bg-[#333333] transition-colors rounded-lg">
                          <span>{result.type}</span>
                          <span>{result.id}</span>
                          <span>{result.name}</span>
                          <div className="flex justify-end pr-4">
                            <button className="text-gray-300 hover:text-white transition-colors">
                              <HelpCircle size={28} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xl text-gray-400 italic mt-4">
                      No results found for "{searchQuery}" in {selectedCategory}.
                    </p>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

      </main>
    </div>
  );
}