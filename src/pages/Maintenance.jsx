import { useState, useEffect } from 'react';
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
  Trash2,
  } from 'lucide-react';
import AdminSidebar from '../layouts/AdminSidebar';
import MaintenanceCreate from './maintenance/MaintenanceCreate';
import MaintenanceEdit from './maintenance/MaintenanceEdit';
import MaintenanceArchive from './maintenance/MaintenanceArchive';
import MaintenanceRetrieve from './maintenance/MaintenanceRetrieve';
import MaintenanceAccounts from './maintenance/MaintenanceAccounts';
import { collection, addDoc, updateDoc, doc, getDocs, setDoc } from "firebase/firestore"; 
import { db } from "../firebase";
import { saveTransaction, formatTransactionDate } from '../utils/transactionHelpers';

export default function Maintenance({ role }) {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('main'); 
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState('general');
  const [currentFormType, setCurrentFormType] = useState(null); // Track which form is being saved
  
  // --- STATE FOR FORMS & FLOWS ---
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showItemSavedSuccess, setShowItemSavedSuccess] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  const [menuItemName, setMenuItemName] = useState('');
  const [sizes, setSizes] = useState({
    Small: { enabled: true, price: '' },
    Medium: { enabled: true, price: '' },
    Large: { enabled: false, price: '' },
  });
  const [selectedMenuItemSize, setSelectedMenuItemSize] = useState('Small');
  const [addOns, setAddOns] = useState([{ ingredientId: '', name: '', price: '', unit: '' }]);
  const [itemSizes, setItemSizes] = useState({
    Small: { enabled: true, qty: '50' },
    Medium: { enabled: true, qty: '50' },
    Large: { enabled: true, qty: '50' },
  });
  const [selectedItemSize, setSelectedItemSize] = useState('Small');
  const [itemStartingQty, setItemStartingQty] = useState('');

  const toggleItemSize = (size) => {
  setItemSizes(prev => ({
    ...prev,
    [size]: { ...prev[size], enabled: !prev[size].enabled }
  }));
  };

  const [selectedEditItem, setSelectedEditItem] = useState(null);

  useEffect(() => {
    if (currentView === 'edit-menu-item' || currentView === 'edit-item' || currentView === 'edit-ingredient') {
      setSelectedEditItem(null);
    }
  }, [currentView]);

  const handleAddRow = () => {
    setAddOns([...addOns, { ingredientId: '', name: '', price: '', unit: '' }]);
  };

  const handleRemoveRow = (index) => {
    if (addOns.length > 0) {
      setAddOns(addOns.filter((_, i) => i !== index));
    } else {
      setAddOns([{ ingredientId: '', name: '', price: '', unit: '' }]);
    }
  };

  const [connections, setConnections] = useState([]);

  const addConnection = (type) => {
    setConnections([...connections, { type, code: '', units: '' }]);
  };

  const removeConnection = (index) => {
    setConnections(connections.filter((_, i) => i !== index));
  };

  const getSequenceNumber = (index, type) => {
    return connections.slice(0, index + 1).filter(c => c.type === type).length;
  };



  // --- ACTIVE & ARCHIVED DATA STATES --- 

  const [activeIngredients, setActiveIngredients] = useState([
    
  ]);

  const [activeMenuItems, setActiveMenuItems] = useState([
    
  ]);

  const [activeItems, setActiveItems] = useState([
    
  ]);

  useEffect(() => {
    const loadActiveData = async () => {
      try {
        const ingredientSnapshot = await getDocs(collection(db, 'ingredients'));
        const itemSnapshot = await getDocs(collection(db, 'items'));
        const menuItemSnapshot = await getDocs(collection(db, 'menuItems'));

        const ingredients = ingredientSnapshot.docs.map((doc) => ({ docId: doc.id, id: doc.data().id ?? doc.id, ...doc.data() }));
        const items = itemSnapshot.docs.map((doc) => ({ docId: doc.id, id: doc.data().id ?? doc.id, ...doc.data() }));
        const menuItems = menuItemSnapshot.docs.map((doc) => ({ docId: doc.id, id: doc.data().id ?? doc.id, ...doc.data() }));

        setActiveIngredients(ingredients.filter((item) => !item.archived));
        setArchivedIngredients(ingredients.filter((item) => item.archived));
        setActiveItems(items.filter((item) => !item.archived));
        setArchivedItems(items.filter((item) => item.archived));
        setActiveMenuItems(menuItems.filter((item) => !item.archived));
        setArchivedMenuItems(menuItems.filter((item) => item.archived));
      } catch (error) {
        console.error('Failed to load active maintenance data:', error);
      }
    };

    loadActiveData();
  }, []);

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
    
  ]);
  const [archivedMenuItems, setArchivedMenuItems] = useState([
    
  ]);
  const [archivedItems, setArchivedItems] = useState([
    
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
      [size]: { ...prev[size], enabled: !prev[size].enabled }
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

  // --- FORM DATA STATE ---
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientType, setIngredientType] = useState('Dry');
  const [startingQty, setStartingQty] = useState('');
  const [ingredientIsAddOn, setIngredientIsAddOn] = useState(false);
  const [itemName, setItemName] = useState('');
  
  // Updated initial category alignment state to default to Coffee
  const [itemCategory, setItemCategory] = useState('Coffee');

  // --- SAVED UNIQUE KEY STATE (for modal display) ---
  const [lastSavedKey, setLastSavedKey] = useState('');
  const [lastSavedName, setLastSavedName] = useState('');
  
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

  const recordMaintenanceTransaction = async ({ action, entityType, entityId, entityName, summary, extra = {} }) => {
    try {
      await saveTransaction('MTN', {
        type: 'Maintenance',
        action,
        entityType,
        entityId,
        entityName,
        summary,
        date: formatTransactionDate(),
        ...extra,
      });
    } catch (error) {
      console.error('Failed to record maintenance transaction:', error);
    }
  };

  // --- FIRESTORE SAVE FUNCTIONS ---
  const generateNextId = (prefix, itemsArray) => {
    const existingIds = itemsArray.map(item => {
      const match = item.id.match(new RegExp(`^${prefix}(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `${prefix}${String(maxId + 1).padStart(3, '0')}`;
  };

  const stripTrailingSizeSuffix = (name) => {
    if (!name) return '';
    return name.replace(/\s*\((Small|Medium|Large)\)$/, '');
  };

  const saveMenuItemToFirestore = async () => {
    try {
      const filteredAddOns = addOns
        .filter(addon => addon.ingredientId && addon.price)
        .map(addon => ({
          ingredientId: addon.ingredientId,
          name: addon.name,
          price: addon.price,
        }));

      const validConnections = connections.filter(conn => conn.code && conn.units);
      const selectedSize = selectedMenuItemSize || 'Small';
      const selectedPrice = sizes[selectedSize]?.price || '';
      const baseMenuItemName = stripTrailingSizeSuffix(menuItemName);
      const savedMenuItemName = baseMenuItemName ? `${baseMenuItemName} (${selectedSize})` : '';
      const newMenuItemId = generateNextId('MNTM', activeMenuItems);

      const menuItemData = {
        id: newMenuItemId,
        name: savedMenuItemName,
        category: itemCategory,
        selectedSize,
        price: selectedPrice,
        sizes,
        addOns: filteredAddOns,
        connections: validConnections,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, 'menuItems'), menuItemData);
      console.log('Menu Item saved with ID:', newMenuItemId);

      setLastSavedKey(newMenuItemId);
      setLastSavedName(savedMenuItemName);

      setActiveMenuItems(prev => ([
        ...prev,
        {
          id: newMenuItemId,
          docId: docRef.id,
          name: savedMenuItemName,
          category: itemCategory,
          selectedSize,
          price: selectedPrice,
          sizes,
          addOns: filteredAddOns,
          connections: validConnections,
          archived: false,
        },
      ]));

      await recordMaintenanceTransaction({
        action: 'Created',
        entityType: 'Menu Item',
        entityId: newMenuItemId,
        entityName: savedMenuItemName,
        summary: `Created Menu Item ${savedMenuItemName} (${newMenuItemId})`,
      });

      return true;
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving menu item to database');
      return false;
    }
  };

  const saveItemToFirestore = async () => {
    try {
      const itemSize = selectedItemSize || 'Small';
      const baseItemName = stripTrailingSizeSuffix(itemName);
      const savedItemName = baseItemName ? `${baseItemName} (${itemSize})` : '';
      const newItemId = generateNextId('ITEM', activeItems);
      const itemData = {
        id: newItemId,
        name: savedItemName,
        size: itemSize,
        startingQty: parseFloat(itemStartingQty) || 0,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, 'items'), itemData);
      console.log('Item saved with ID:', newItemId);

      setLastSavedKey(newItemId);
      setLastSavedName(savedItemName);

      setActiveItems(prev => ([
        ...prev,
        {
          id: newItemId,
          docId: docRef.id,
          name: savedItemName,
          size: itemSize,
          startingQty: parseFloat(itemStartingQty) || 0,
          archived: false,
        },
      ]));

      await recordMaintenanceTransaction({
        action: 'Created',
        entityType: 'Item',
        entityId: newItemId,
        entityName: savedItemName,
        summary: `Created Item ${savedItemName} (${newItemId})`,
      });

      return true;
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item to database');
      return false;
    }
  };

  const saveIngredientToFirestore = async () => {
    try {
      const newIngredientId = generateNextId('INGR', activeIngredients);
      const ingredientData = {
        id: newIngredientId,
        name: ingredientName,
        type: ingredientType,
        startingQty: parseFloat(startingQty) || 0,
        isAddOn: ingredientIsAddOn,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, 'ingredients'), ingredientData);
      console.log('Ingredient saved with ID:', newIngredientId);

      setLastSavedKey(newIngredientId);
      setLastSavedName(ingredientName);

      setActiveIngredients(prev => ([
        ...prev,
        {
          id: newIngredientId,
          docId: docRef.id,
          name: ingredientName,
          type: ingredientType,
          startingQty: parseFloat(startingQty) || 0,
          isAddOn: ingredientIsAddOn,
          archived: false,
        },
      ]));

      await recordMaintenanceTransaction({
        action: 'Created',
        entityType: 'Ingredient',
        entityId: newIngredientId,
        entityName: ingredientName,
        summary: `Created Ingredient ${ingredientName} (${newIngredientId})`,
      });

      return true;
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Error saving ingredient to database');
      return false;
    }
  };

  const updateMenuItemInFirestore = async () => {
    if (!selectedEditItem) return false;

    try {
      const filteredAddOns = addOns
        .filter(addon => addon.ingredientId && addon.price)
        .map(addon => ({
          ingredientId: addon.ingredientId,
          name: addon.name,
          price: addon.price,
        }));

      const validConnections = connections.filter(conn => conn.code && conn.units);
      const selectedSize = selectedMenuItemSize || 'Small';
      const selectedPrice = sizes[selectedSize]?.price || '';
      const baseMenuItemName = stripTrailingSizeSuffix(menuItemName);
      const savedMenuItemName = baseMenuItemName ? `${baseMenuItemName} (${selectedSize})` : '';
      const menuItemData = {
        name: savedMenuItemName,
        category: itemCategory,
        selectedSize,
        price: selectedPrice,
        sizes,
        addOns: filteredAddOns,
        connections: validConnections,
        updatedAt: new Date(),
      };

      const documentId = selectedEditItem.docId || selectedEditItem.id;
      await updateDoc(doc(db, 'menuItems', documentId), menuItemData);

      setActiveMenuItems(prev => prev.map((item) => item.id === selectedEditItem.id ? {
        ...item,
        ...menuItemData,
        id: selectedEditItem.id,
        docId: selectedEditItem.docId || selectedEditItem.id,
      } : item));

      setLastSavedKey(selectedEditItem.id);
      setLastSavedName(savedMenuItemName);

      await recordMaintenanceTransaction({
        action: 'Updated',
        entityType: 'Menu Item',
        entityId: selectedEditItem.id,
        entityName: savedMenuItemName,
        summary: `Updated Menu Item ${savedMenuItemName} (${selectedEditItem.id})`,
      });

      return true;
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert('Error updating menu item in database');
      return false;
    }
  };

  const updateItemInFirestore = async () => {
    if (!selectedEditItem) return false;

    try {
      const itemSize = selectedItemSize || 'Small';
      const baseItemName = stripTrailingSizeSuffix(itemName);
      const savedItemName = baseItemName ? `${baseItemName} (${itemSize})` : '';
      const itemData = {
        name: savedItemName,
        size: itemSize,
        startingQty: parseFloat(itemStartingQty) || 0,
        updatedAt: new Date(),
      };

      const documentId = selectedEditItem.docId || selectedEditItem.id;
      await updateDoc(doc(db, 'items', documentId), itemData);

      setActiveItems(prev => prev.map((item) => item.id === selectedEditItem.id ? {
        ...item,
        ...itemData,
        id: selectedEditItem.id,
        docId: selectedEditItem.docId || selectedEditItem.id,
      } : item));

      setLastSavedKey(selectedEditItem.id);
      setLastSavedName(savedItemName);

      await recordMaintenanceTransaction({
        action: 'Updated',
        entityType: 'Item',
        entityId: selectedEditItem.id,
        entityName: savedItemName,
        summary: `Updated Item ${savedItemName} (${selectedEditItem.id})`,
      });

      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error updating item in database');
      return false;
    }
  };

  const updateIngredientInFirestore = async () => {
    if (!selectedEditItem) return false;

    try {
      const ingredientData = {
        name: ingredientName,
        type: ingredientType,
        startingQty: parseFloat(startingQty) || 0,
        isAddOn: ingredientIsAddOn,
        updatedAt: new Date(),
      };

      const documentId = selectedEditItem.docId || selectedEditItem.id;
      await updateDoc(doc(db, 'ingredients', documentId), ingredientData);

      setActiveIngredients(prev => prev.map((item) => item.id === selectedEditItem.id ? {
        ...item,
        ...ingredientData,
        id: selectedEditItem.id,
        docId: selectedEditItem.docId || selectedEditItem.id,
      } : item));

      setLastSavedKey(selectedEditItem.id);
      setLastSavedName(ingredientName);

      await recordMaintenanceTransaction({
        action: 'Updated',
        entityType: 'Ingredient',
        entityId: selectedEditItem.id,
        entityName: ingredientName,
        summary: `Updated Ingredient ${ingredientName} (${selectedEditItem.id})`,
      });

      return true;
    } catch (error) {
      console.error('Error updating ingredient:', error);
      alert('Error updating ingredient in database');
      return false;
    }
  };

  const finalizeSaveFlow = async () => {
    let saveSuccess = false;

    // Determine which form is being saved based on currentView
    if (currentView === 'create-menu-item') {
      saveSuccess = await saveMenuItemToFirestore();
    } else if (currentView === 'edit-menu-item') {
      saveSuccess = await updateMenuItemInFirestore();
    } else if (currentView === 'create-item') {
      saveSuccess = await saveItemToFirestore();
    } else if (currentView === 'edit-item') {
      saveSuccess = await updateItemInFirestore();
    } else if (currentView === 'create-ingredient') {
      saveSuccess = await saveIngredientToFirestore();
    } else if (currentView === 'edit-ingredient') {
      saveSuccess = await updateIngredientInFirestore();
    }

    if (saveSuccess) {
      setShowSavePrompt(false);
      setShowItemSavedSuccess(true);
    } else {
      alert('Error saving data. Please try again.');
    }
  };

  const resetCreateStates = () => {
    setActiveAccordion('general');
    setMenuItemName('');
    setItemCategory('Coffee');
    setSizes({
      Small: { enabled: true, price: '' },
      Medium: { enabled: true, price: '' },
      Large: { enabled: false, price: '' },
    });
    setAddOns([{ ingredientId: '', name: '', price: '', unit: '' }]);
    setConnections([]);
    setItemName('');
    setIngredientName('');
    setIngredientType('Dry');
    setStartingQty('');
    setIngredientIsAddOn(false);
    setSelectedMenuItemSize('Small');
    setSelectedItemSize('Small');
    setItemStartingQty('');
    setItemSizes({
      Small: { enabled: true, qty: '50' },
      Medium: { enabled: true, qty: '50' },
      Large: { enabled: true, qty: '50' },
    });
    setLastSavedKey('');
    setLastSavedName('');
  };

  const finalizeDiscardFlow = () => {
    resetCreateStates();
    closeAllModals();
    setCurrentView('main');
  };

  const menuItems = [
    { id: 'create', label: 'Create', icon: <Box size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
    { id: 'edit', label: 'Edit', icon: <Edit3 size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
    { id: 'archive', label: 'Archive', icon: <Archive size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
    { id: 'retrieve', label: 'Retrieve', icon: <FilePlus size={24} />, subOptions: ['Menu Item', 'Item', 'Ingredient'] },
  ];

  if (currentView.startsWith('create-')) {
    return (
      <MaintenanceCreate
        currentView={currentView}
        handleBack={handleBack}
        activeAccordion={activeAccordion}
        setActiveAccordion={setActiveAccordion}
        menuItemName={menuItemName}
        setMenuItemName={setMenuItemName}
        itemCategory={itemCategory}
        setItemCategory={setItemCategory}
        sizes={sizes}
        setSizes={setSizes}
        selectedMenuItemSize={selectedMenuItemSize}
        setSelectedMenuItemSize={setSelectedMenuItemSize}
        itemSizes={itemSizes}
        setItemSizes={setItemSizes}
        selectedItemSize={selectedItemSize}
        setSelectedItemSize={setSelectedItemSize}
        itemStartingQty={itemStartingQty}
        setItemStartingQty={setItemStartingQty}
        addOns={addOns}
        setAddOns={setAddOns}
        handleAddRow={handleAddRow}
        handleRemoveRow={handleRemoveRow}
        connections={connections}
        setConnections={setConnections}
        addConnection={addConnection}
        removeConnection={removeConnection}
        getSequenceNumber={getSequenceNumber}
        showSavePrompt={showSavePrompt}
        setShowSavePrompt={setShowSavePrompt}
        showItemSavedSuccess={showItemSavedSuccess}
        setShowItemSavedSuccess={setShowItemSavedSuccess}
        showDiscardPrompt={showDiscardPrompt}
        setShowDiscardPrompt={setShowDiscardPrompt}
        finalizeSaveFlow={finalizeSaveFlow}
        setCurrentView={setCurrentView}
        resetCreateStates={resetCreateStates}
        activeItems={activeItems}
        activeIngredients={activeIngredients}
        itemName={itemName}
        setItemName={setItemName}
        ingredientName={ingredientName}
        setIngredientName={setIngredientName}
        ingredientType={ingredientType}
        setIngredientType={setIngredientType}
        ingredientIsAddOn={ingredientIsAddOn}
        setIngredientIsAddOn={setIngredientIsAddOn}
        startingQty={startingQty}
        setStartingQty={setStartingQty}
        lastSavedKey={lastSavedKey}
        lastSavedName={lastSavedName}
      />
    );
  }

  if (currentView.startsWith('edit-')) {
    return (
      <MaintenanceEdit
        currentView={currentView}
        handleBack={handleBack}
        activeAccordion={activeAccordion}
        setActiveAccordion={setActiveAccordion}
        selectedEditItem={selectedEditItem}
        setSelectedEditItem={setSelectedEditItem}
        menuItemName={menuItemName}
        setMenuItemName={setMenuItemName}
        itemCategory={itemCategory}
        setItemCategory={setItemCategory}
        itemSizes={itemSizes}
        setItemSizes={setItemSizes}
        addOns={addOns}
        setAddOns={setAddOns}
        handleAddRow={handleAddRow}
        handleRemoveRow={handleRemoveRow}
        connections={connections}
        setConnections={setConnections}
        addConnection={addConnection}
        removeConnection={removeConnection}
        getSequenceNumber={getSequenceNumber}
        showSavePrompt={showSavePrompt}
        setShowSavePrompt={setShowSavePrompt}
        showItemSavedSuccess={showItemSavedSuccess}
        setShowItemSavedSuccess={setShowItemSavedSuccess}
        showDiscardPrompt={showDiscardPrompt}
        setShowDiscardPrompt={setShowDiscardPrompt}
        finalizeSaveFlow={finalizeSaveFlow}
        setCurrentView={setCurrentView}
        activeMenuItems={activeMenuItems}
        activeItems={activeItems}
        activeIngredients={activeIngredients}
        itemName={itemName}
        setItemName={setItemName}
        ingredientName={ingredientName}
        setIngredientName={setIngredientName}
        ingredientType={ingredientType}
        setIngredientType={setIngredientType}
        ingredientIsAddOn={ingredientIsAddOn}
        setIngredientIsAddOn={setIngredientIsAddOn}
        startingQty={startingQty}
        setStartingQty={setStartingQty}
        selectedMenuItemSize={selectedMenuItemSize}
        setSelectedMenuItemSize={setSelectedMenuItemSize}
        selectedItemSize={selectedItemSize}
        setSelectedItemSize={setSelectedItemSize}
        itemStartingQty={itemStartingQty}
        setItemStartingQty={setItemStartingQty}
        sizes={sizes}
        setSizes={setSizes}
      />
    );
  }

  if (currentView.startsWith('archive-')) {
    return (
      <MaintenanceArchive
        currentView={currentView}
        handleBack={handleBack}
        activeMenuItems={activeMenuItems}
        activeItems={activeItems}
        activeIngredients={activeIngredients}
        selectedArchiveMenuItem={selectedArchiveMenuItem}
        setSelectedArchiveMenuItem={setSelectedArchiveMenuItem}
        showMenuConfirm={showMenuConfirm}
        setShowMenuConfirm={setShowMenuConfirm}
        showMenuSuccess={showMenuSuccess}
        setShowMenuSuccess={setShowMenuSuccess}
        selectedArchiveItem={selectedArchiveItem}
        setSelectedArchiveItem={setSelectedArchiveItem}
        showItemConfirm={showItemConfirm}
        setShowItemConfirm={setShowItemConfirm}
        showItemSuccess={showItemSuccess}
        setShowItemSuccess={setShowItemSuccess}
        selectedArchiveIngredient={selectedArchiveIngredient}
        setSelectedArchiveIngredient={setSelectedArchiveIngredient}
        showIngConfirm={showIngConfirm}
        setShowIngConfirm={setShowIngConfirm}
        showIngSuccess={showIngSuccess}
        setShowIngSuccess={setShowIngSuccess}
        setActiveMenuItems={setActiveMenuItems}
        setActiveItems={setActiveItems}
        setActiveIngredients={setActiveIngredients}
        setArchivedMenuItems={setArchivedMenuItems}
        setArchivedItems={setArchivedItems}
        setArchivedIngredients={setArchivedIngredients}
        onRecordTransaction={recordMaintenanceTransaction}
      />
    );
  }

  if (currentView.startsWith('retrieve-')) {
    return (
      <MaintenanceRetrieve
        currentView={currentView}
        handleBack={handleBack}
        archivedMenuItems={archivedMenuItems}
        archivedItems={archivedItems}
        archivedIngredients={archivedIngredients}
        selectedRetrieveMenu={selectedRetrieveMenu}
        setSelectedRetrieveMenu={setSelectedRetrieveMenu}
        showRetrieveMenuConfirm={showRetrieveMenuConfirm}
        setShowRetrieveMenuConfirm={setShowRetrieveMenuConfirm}
        showRetrieveMenuSuccess={showRetrieveMenuSuccess}
        setShowRetrieveMenuSuccess={setShowRetrieveMenuSuccess}
        selectedRetrieveItem={selectedRetrieveItem}
        setSelectedRetrieveItem={setSelectedRetrieveItem}
        showRetrieveItemConfirm={showRetrieveItemConfirm}
        setShowRetrieveItemConfirm={setShowRetrieveItemConfirm}
        showRetrieveItemSuccess={showRetrieveItemSuccess}
        setShowRetrieveItemSuccess={setShowRetrieveItemSuccess}
        selectedRetrieveIng={selectedRetrieveIng}
        setSelectedRetrieveIng={setSelectedRetrieveIng}
        showRetrieveIngConfirm={showRetrieveIngConfirm}
        setShowRetrieveIngConfirm={setShowRetrieveIngConfirm}
        showRetrieveIngSuccess={showRetrieveIngSuccess}
        setShowRetrieveIngSuccess={setShowRetrieveIngSuccess}
        setArchivedMenuItems={setArchivedMenuItems}
        setArchivedItems={setArchivedItems}
        setArchivedIngredients={setArchivedIngredients}
        setActiveMenuItems={setActiveMenuItems}
        setActiveItems={setActiveItems}
        setActiveIngredients={setActiveIngredients}
        onRecordTransaction={recordMaintenanceTransaction}
      />
    );
  }

  if (currentView === 'manage-accounts') {
    return (
      <MaintenanceAccounts
        currentView={currentView}
        handleBack={handleBack}
        accounts={accounts}
        selectedAccount={selectedAccount}
        setSelectedAccount={setSelectedAccount}
        showStatusConfirm={showStatusConfirm}
        setShowStatusConfirm={setShowStatusConfirm}
        showStatusSuccess={showStatusSuccess}
        setShowStatusSuccess={setShowStatusSuccess}
        setAccounts={setAccounts}
      />
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="flex w-full h-full">
      <AdminSidebar activePage="maintenance" />
      <main className="flex-1 bg-[#2a2a2a] rounded-xl p-8 flex flex-col text-white">
        <div className="flex gap-4 mb-10">
          <button onClick={handleBack} className="bg-[#5a5a5a] p-3 rounded-lg"><CornerUpLeft size={20} /></button>
          <div className="flex-1 bg-[#5a5a5a] rounded-lg flex items-center px-4 gap-3 font-medium tracking-wide">
            <WrenchIcon size={20} />
            <span>{activeDropdown ? `Maintenance > ${menuItems.find(item => item.id === activeDropdown)?.label || activeDropdown}` : 'Maintenance'}</span>
          </div>
        </div>

        <div className="flex flex-col flex-1 animate-in fade-in duration-300">
          <h1 className="text-3xl font-semibold mb-8">Maintenance</h1>

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
                        className="bg-[#56a2d1] hover:bg-[#66b2e1] text-white px-10 py-3 rounded-lg transition-colors text-xl font-medium min-w-[160px]"
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

