/* eslint-disable no-else-return */
/* eslint-disable camelcase */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
/* eslint-disable react/jsx-no-duplicate-props */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, CircularProgress, Alert, Stack, Stepper, Step, StepLabel, Chip, Divider, Autocomplete, Card, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip, InputAdornment, Grid,
  CardContent, Badge, LinearProgress, Checkbox, ButtonGroup, FormControlLabel, Switch, Accordion, AccordionSummary,
  AccordionDetails, Chip as MuiChip
} from '@mui/material';
import {
  Calendar, MapPin, Package, Users, Plus, Save, X, Trash2, User, Boxes, AlertTriangle,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon, Plus as PlusIcon, Trash2 as DeleteIcon, Settings as TuneIcon,
  CheckSquare as SelectAllIcon, X as ClearIcon, Gauge as SpeedIcon,
  ChevronDown as ExpandMoreIcon, Table2 as TableChartIcon, List as ViewListIcon,
  List, Clock, Play
} from 'lucide-react';

import { 
  useCreateServiceEvent, 
  useServiceCatalogs, 
  useBeneficiaries, 
  useInventoryStocks, 
  useCreateBeneficiary, 
  useCreateServiceEventStock,
  useCreateServiceCatalog
} from './useServiceManagement';

const theme = {
  primary: '#2d5016',
  secondary: '#4a7c59',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#4a7c59',
  background: '#f8fdf9',
  surface: '#ffffff',
  surfaceVariant: '#e8f5e8',
  outline: '#4a7c59',
  primaryLight: '#e8f5e8',
  successLight: '#e8f5e8',
  warningLight: '#fff3e0',
  errorLight: '#ffebee',
  text: '#333333'
};

const ComprehensiveServiceEventModal = ({ open, onClose, onSubmit }) => {
  // ============================================
  // STATE HOOKS
  // ============================================
  const [eventType, setEventType] = useState('registered'); // 'registered' or 'walkin'
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [eventData, setEventData] = useState({ 
    service_catalog_id: '', 
    barangay: '', 
    service_date: new Date().toISOString().split('T')[0], 
    remarks: '' 
  });
  const [showCreateService, setShowCreateService] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    name: '',
    unit: '',
    description: ''
  });
  const [serviceItems, setServiceItems] = useState([]);
  const [serviceBeneficiaries, setServiceBeneficiaries] = useState([]);
  const [walkinAllocations, setWalkinAllocations] = useState({}); // New state for walk-in allocations
  const [errors, setErrors] = useState({});
  const [simulatedStock, setSimulatedStock] = useState({});
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState([]);
  const [bulkAllocations, setBulkAllocations] = useState({});
  const [viewMode, setViewMode] = useState('table');
  const [bulkToolsExpanded, setBulkToolsExpanded] = useState(false);
  const [barangayFilter, setBarangayFilter] = useState('');

  // ============================================
  // STATIC DATA
  // ============================================
  const speciesOptions = [
    'Bovine (Cattle)',
    'Bubaline (Carabao/Water Buffalo)',
    'Caprine (Goat)',
    'Ovine (Sheep)',
    'Porcine (Pig/Swine)',
    'Equine (Horse)',
    'Canine (Dog)',
    'Feline (Cat)',
    'Other'
  ];

  const barangayOptions = [
    'Awang', 'Bagocboc', 'Barra', 'Bonbon', 'Cauyonan', 'Igpit',
    'Limonda', 'Luyongbonbon', 'Malanang', 'Nangcaon', 'Patag',
    'Poblacion', 'Taboc', 'Tingalan'
  ];

  // ============================================
  // CUSTOM HOOKS
  // ============================================
  const { data: catalogs, loading: catalogsLoading, refresh: refreshCatalogs } = useServiceCatalogs();
  const { data: beneficiaries, loading: beneficiariesLoading, fetchBeneficiaries } = useBeneficiaries();
  const { data: inventoryStocks, loading: inventoryLoading, fetchStocks, checkAvailability } = useInventoryStocks();
  const { createEvent, loading: creatingEvent, error: eventError } = useCreateServiceEvent();
  const { createBeneficiary } = useCreateBeneficiary();
  const { createStock } = useCreateServiceEventStock();
  const { createCatalog, loading: creatingCatalog, error: catalogError } = useCreateServiceCatalog();

  // ============================================
  // REFS
  // ============================================
  const hasLoadedBeneficiaries = useRef(false);
  const hasLoadedInventory = useRef(false);

  // ============================================
  // COMPUTED VALUES (MUST BE AFTER HOOKS)
  // ============================================
  const safeCatalogs = useMemo(() => 
    (catalogs || []).filter(c => c.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    [catalogs]
  );
  
  const selectedCatalog = useMemo(() => 
    catalogs?.find(c => c.id === parseInt(eventData.service_catalog_id)),
    [catalogs, eventData.service_catalog_id]
  );
  
  const selectedSectorId = selectedCatalog?.sector_id || selectedCatalog?.sector?.id;
  const usesSpecies = selectedSectorId === 5 || selectedSectorId === 4; // Livestock or Fisheries

  const availableInventory = useMemo(() => 
    (inventoryStocks || []).filter(i => (i.quantity_available || 0) > 0),
    [inventoryStocks]
  );

  const visibleBeneficiaries = useMemo(() => {
    if (!barangayFilter) return serviceBeneficiaries;
    return serviceBeneficiaries.filter(b => 
      (b.barangay || '').toLowerCase().includes(barangayFilter.toLowerCase())
    );
  }, [serviceBeneficiaries, barangayFilter]);

  const totalCost = useMemo(() => {
    if (eventType === 'registered') {
      return serviceBeneficiaries.reduce((sum, ben) => {
        return sum + (ben.speciesAllocations || []).reduce((allocationSum, allocation) => {
          const inventoryItem = availableInventory.find(inv => inv.id === serviceItems[0]?.inventory_id);
          const unitCost = inventoryItem?.unit_cost || 0;
          return allocationSum + ((Number(allocation.allocation) || 0) * unitCost);
        }, 0);
      }, 0);
    } else {
      // For walk-in events, calculate based on walkinAllocations
      return Object.values(walkinAllocations).reduce((sum, allocation) => {
        const inventoryItem = availableInventory.find(inv => inv.id === allocation.inventory_id);
        const unitCost = inventoryItem?.unit_cost || 0;
        return sum + ((Number(allocation.quantity) || 0) * unitCost);
      }, 0);
    }
  }, [serviceBeneficiaries, availableInventory, serviceItems, eventType, walkinAllocations]);

  const isEventDateToday = useMemo(() => {
    return eventData.service_date === new Date().toISOString().split('T')[0];
  }, [eventData.service_date]);

  // Dynamic steps based on event type
  const steps = useMemo(() => {
    if (eventType === 'registered') {
      return [
        { label: 'Service Details', description: 'Choose type, location, date', icon: <InfoIcon />, required: true },
        { label: 'Registration Type', description: 'Choose participant type', icon: <Users />, required: true },
        { label: 'Service Items', description: 'Select items (optional)', icon: <List />, required: false },
        { label: 'Assign Beneficiaries', description: 'Allocate to farmers', icon: <Users />, required: true },
        { label: 'Review', description: 'Confirm and create', icon: <CheckCircleIcon />, required: true }
      ];
    } else {
      // For walk-in events, add allocation step if inventory items are selected
      const hasInventoryItems = serviceItems.some(item => item.is_from_inventory);
      const baseSteps = [
        { label: 'Service Details', description: 'Choose type, location, date', icon: <InfoIcon />, required: true },
        { label: 'Registration Type', description: 'Choose participant type', icon: <Users />, required: true },
        { label: 'Service Items', description: 'Select items (optional)', icon: <List />, required: false }
      ];
      
      if (hasInventoryItems) {
        baseSteps.push({ label: 'Set Allocations', description: 'Set inventory allocations', icon: <Package />, required: true });
      }
      
      baseSteps.push({ label: 'Review', description: 'Confirm and create', icon: <CheckCircleIcon />, required: true });
      return baseSteps;
    }
  }, [eventType, serviceItems]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (open && activeStep === 2 && !hasLoadedInventory.current && !inventoryLoading) {
      hasLoadedInventory.current = true;
      fetchStocks();
    }
  }, [open, activeStep, inventoryLoading, fetchStocks]);

  useEffect(() => {
    if (open && activeStep === 3 && eventType === 'registered' && !hasLoadedBeneficiaries.current && !beneficiariesLoading) {
      hasLoadedBeneficiaries.current = true;
      fetchBeneficiaries();
    }
  }, [open, activeStep, eventType, beneficiariesLoading, fetchBeneficiaries]);

  useEffect(() => {
    if ((inventoryStocks || []).length > 0) initializeSimulatedStock();
  }, [inventoryStocks]);

  useEffect(() => {
    if (eventType === 'registered') {
      recalculateStock();
    } else {
      recalculateWalkinStock();
    }
  }, [serviceBeneficiaries, walkinAllocations, eventType]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  // ============================================
  // CALLBACK FUNCTIONS
  // ============================================
  const initializeSimulatedStock = useCallback(() => {
    const stockSim = {};
    (inventoryStocks || []).forEach(item => {
      stockSim[item.id] = {
        original_stock: item.quantity_available || item.current_stock || 0,
        remaining_stock: item.quantity_available || item.current_stock || 0,
        allocated: 0
      };
    });
    setSimulatedStock(stockSim);
  }, [inventoryStocks]);

  const recalculateStock = useCallback(() => {
    const newSimulatedStock = {};
    (inventoryStocks || []).forEach(item => {
      newSimulatedStock[item.id] = {
        original_stock: item.quantity_available || item.current_stock || 0,
        remaining_stock: item.quantity_available || item.current_stock || 0,
        allocated: 0
      };
    });
    
    serviceBeneficiaries.forEach(beneficiary => {
      (beneficiary.speciesAllocations || []).forEach(allocation => {
        if (allocation.allocation && Number(allocation.allocation) > 0) {
          const inventoryItem = serviceItems.find(item => item.inventory_id);
          if (inventoryItem && newSimulatedStock[inventoryItem.inventory_id]) {
            newSimulatedStock[inventoryItem.inventory_id].allocated += Number(allocation.allocation) || 0;
            newSimulatedStock[inventoryItem.inventory_id].remaining_stock =
              newSimulatedStock[inventoryItem.inventory_id].original_stock - newSimulatedStock[inventoryItem.inventory_id].allocated;
          }
        }
      });
    });
    setSimulatedStock(newSimulatedStock);
  }, [inventoryStocks, serviceBeneficiaries, serviceItems]);

  // New function for walk-in stock calculation
  const recalculateWalkinStock = useCallback(() => {
    const newSimulatedStock = {};
    (inventoryStocks || []).forEach(item => {
      newSimulatedStock[item.id] = {
        original_stock: item.quantity_available || item.current_stock || 0,
        remaining_stock: item.quantity_available || item.current_stock || 0,
        allocated: 0
      };
    });
    
    // Calculate allocations from walkinAllocations
    Object.values(walkinAllocations).forEach(allocation => {
      if (allocation.quantity && Number(allocation.quantity) > 0 && allocation.inventory_id) {
        if (newSimulatedStock[allocation.inventory_id]) {
          newSimulatedStock[allocation.inventory_id].allocated += Number(allocation.quantity) || 0;
          newSimulatedStock[allocation.inventory_id].remaining_stock =
            newSimulatedStock[allocation.inventory_id].original_stock - newSimulatedStock[allocation.inventory_id].allocated;
        }
      }
    });
    setSimulatedStock(newSimulatedStock);
  }, [inventoryStocks, walkinAllocations]);

  const resetForm = useCallback(() => {
    setActiveStep(0);
    setCompletedSteps(new Set());
    setEventData({ 
      service_catalog_id: '', 
      barangay: '', 
      service_date: new Date().toISOString().split('T')[0], 
      remarks: '' 
    });
    setServiceItems([]);
    setServiceBeneficiaries([]);
    setWalkinAllocations({}); // Reset walk-in allocations
    setErrors({});
    setShowCreateService(false);
    setNewServiceData({ name: '', unit: '', description: '' });
    setBulkMode(false);
    setSelectedBeneficiaries([]);
    setBulkAllocations({});
    setBulkToolsExpanded(false);
    setBarangayFilter('');
    setViewMode('table');
    setEventType('registered');
    hasLoadedBeneficiaries.current = false;
    hasLoadedInventory.current = false;
  }, []);

  const validateStep = useCallback((step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!eventData.service_catalog_id) newErrors.service_catalog_id = 'Required';
      if (!eventData.barangay.trim()) newErrors.barangay = 'Required';
      if (!eventData.service_date) newErrors.service_date = 'Required';
    }
    
    if (step === 1) {
      // Registration Type Selection - No validation needed
    }
    
    if (step === 2) {
      // Service items validation (same for both types)
      // Optional step, no validation needed
    }
    
    if (step === 3) {
      if (eventType === 'registered') {
        if (serviceBeneficiaries.length === 0) {
          newErrors.beneficiaries = 'At least one beneficiary is required';
        }
        
        serviceBeneficiaries.forEach((ben, index) => {
          if (!ben.speciesAllocations || ben.speciesAllocations.length === 0) {
            newErrors[`beneficiary_${index}`] = 'Each beneficiary must have at least one species allocation';
          }
        });
        
        if (serviceItems.some(item => item.is_from_inventory)) {
          Object.keys(simulatedStock).forEach(id => {
            const stock = simulatedStock[id];
            if (stock && stock.remaining_stock < 0) {
              newErrors.stock_over = 'Over-allocation detected! Please reduce quantities.';
            }
          });
        }
      } else {
        // Walk-in allocation validation
        const hasInventoryItems = serviceItems.some(item => item.is_from_inventory);
        if (hasInventoryItems) {
          const hasAllocations = Object.keys(walkinAllocations).length > 0;
          if (!hasAllocations) {
            newErrors.walkin_allocations = 'Please set allocations for inventory items';
          }
          
          // Check for over-allocation
          Object.keys(simulatedStock).forEach(id => {
            const stock = simulatedStock[id];
            if (stock && stock.remaining_stock < 0) {
              newErrors.stock_over = 'Over-allocation detected! Please reduce quantities.';
            }
          });
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [eventData, eventType, serviceItems, serviceBeneficiaries, simulatedStock, walkinAllocations]);

  const handleNext = useCallback(() => {
    if (validateStep(activeStep)) {
      setCompletedSteps(prev => new Set([...prev, activeStep]));
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep, validateStep]);

  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
    setErrors({});
  }, []);

  const handleStepClick = useCallback((index) => {
    if (index === 0 || completedSteps.has(0)) {
      setActiveStep(index);
    }
  }, [completedSteps]);

  const handleEventDataChange = useCallback((e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleCreateService = useCallback(async () => {
    if (!newServiceData.name.trim()) {
      setErrors(prev => ({ ...prev, newService: 'Service name is required' }));
      return;
    }
    
    try {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.newService;
        return newErrors;
      });
      
      const createdCatalog = await createCatalog(newServiceData);
      await refreshCatalogs();
      setEventData(prev => ({ ...prev, service_catalog_id: createdCatalog.id }));
      setShowCreateService(false);
      setNewServiceData({ name: '', unit: '', description: '' });
    } catch (err) {
      console.error('Error creating service catalog:', err);
      setErrors(prev => ({ 
        ...prev, 
        newService: err.response?.data?.message || 'Failed to create service' 
      }));
    }
  }, [newServiceData, createCatalog, refreshCatalogs]);

  // Service Items handlers
  const addServiceItem = useCallback(() => {
    const newId = Date.now();
    const newItem = {
      id: newId,
      item_name: '',
      unit: '',
      inventory_id: null,
      original_stock: 0,
      is_from_inventory: false
    };
    
    setServiceItems(prev => [...prev, newItem]);
  }, []);

  const handleInventorySelect = useCallback((itemIndex, inventoryItem) => {
    if (inventoryItem) {
      setServiceItems(prev => prev.map((item, idx) =>
        idx === itemIndex ? {
          ...item,
          inventory_id: inventoryItem.id,
          item_name: inventoryItem.item_name,
          unit: inventoryItem.unit,
          original_stock: inventoryItem.quantity_available || inventoryItem.current_stock || 0,
          is_from_inventory: true
        } : item
      ));
      
      // Initialize walk-in allocation for this item
      if (eventType === 'walkin') {
        setWalkinAllocations(prev => ({
          ...prev,
          [inventoryItem.id]: {
            inventory_id: inventoryItem.id,
            item_name: inventoryItem.item_name,
            unit: inventoryItem.unit,
            quantity: 0,
            remarks: ''
          }
        }));
      }
    } else {
      setServiceItems(prev => prev.map((item, idx) =>
        idx === itemIndex ? {
          ...item,
          inventory_id: null,
          item_name: '',
          unit: '',
          original_stock: 0,
          is_from_inventory: false
        } : item
      ));
    }
  }, [eventType]);

  const handleServiceItemChange = useCallback((itemIndex, field, value) => {
    setServiceItems(prev => prev.map((item, idx) =>
      idx === itemIndex ? { ...item, [field]: value } : item
    ));
  }, []);

  const removeServiceItem = useCallback((index) => {
    const itemToRemove = serviceItems[index];
    setServiceItems(prev => prev.filter((_, i) => i !== index));
    
    // Remove corresponding walk-in allocation if exists
    if (itemToRemove?.inventory_id && eventType === 'walkin') {
      setWalkinAllocations(prev => {
        const newAllocations = { ...prev };
        delete newAllocations[itemToRemove.inventory_id];
        return newAllocations;
      });
    }
  }, [serviceItems, eventType]);

  // Walk-in allocation handlers
  const handleWalkinAllocationChange = useCallback((inventoryId, field, value) => {
    setWalkinAllocations(prev => ({
      ...prev,
      [inventoryId]: {
        ...prev[inventoryId],
        [field]: field === 'quantity' ? (Number(value) || 0) : value
      }
    }));
  }, []);

  // Beneficiaries handlers (existing code remains the same)
  const getAvailableBeneficiaries = useCallback(() => {
    const added = new Set(serviceBeneficiaries.map(ben => String(ben.beneficiary_id)));
    return (beneficiaries || [])
      .filter(opt => !added.has(String(opt.id)))
      .filter(opt => !barangayFilter || (opt.streetPurokBarangay || '').toLowerCase().includes(barangayFilter.toLowerCase()));
  }, [beneficiaries, serviceBeneficiaries, barangayFilter]);

  const addBeneficiary = useCallback((beneficiaryOption) => {
    const beneficiary_id = beneficiaryOption.id;
    if (!beneficiary_id) return;
    
    if (serviceBeneficiaries.some(b => Number(b.beneficiary_id) === beneficiary_id)) {
      setErrors(prev => ({ ...prev, duplicate_beneficiary: `${getBeneficiaryName(beneficiaryOption)} is already added.` }));
      return;
    }
    
    const newBeneficiary = {
      id: beneficiary_id,
      beneficiary_id,
      beneficiary_name: getBeneficiaryName(beneficiaryOption),
      rsbsa_number: beneficiaryOption.rsbsaNumber || beneficiaryOption.systemGeneratedRsbaNumber || 'N/A',
      barangay: beneficiaryOption.streetPurokBarangay || 'N/A',
      contact_number: beneficiaryOption.contactNo || 'N/A',
      speciesAllocations: []
    };
    
    setErrors(prev => ({ ...prev, duplicate_beneficiary: '' }));
    setServiceBeneficiaries(prev => [...prev, newBeneficiary]);
  }, [serviceBeneficiaries]);

  const removeBeneficiary = useCallback((index) => {
    setServiceBeneficiaries(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle species allocation with quantities, allocations, and manual breed input
  const handleSpeciesAllocationChange = useCallback((benIndex, speciesIndex, field, value) => {
    setServiceBeneficiaries(prev => prev.map((ben, bIdx) => {
      if (bIdx !== benIndex) return ben;
      const speciesAllocations = [...(ben.speciesAllocations || [])];
      
      if (field === 'quantity' || field === 'allocation') {
        const parsed = Number(value);
        const qty = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        speciesAllocations[speciesIndex] = { ...speciesAllocations[speciesIndex], [field]: qty };
      } else if (field === 'species') {
        // Clear breed when species changes
        speciesAllocations[speciesIndex] = { 
          ...speciesAllocations[speciesIndex], 
          [field]: value,
          breed: ''
        };
      } else {
        speciesAllocations[speciesIndex] = { ...speciesAllocations[speciesIndex], [field]: value };
      }
      
      return { ...ben, speciesAllocations };
    }));
  }, []);

  // Add species allocation with breed support
  const addSpeciesAllocation = useCallback((benIndex, species) => {
    if (!species) return;
    setServiceBeneficiaries(prev => prev.map((ben, bIdx) => {
      if (bIdx !== benIndex) return ben;
      const currentAllocations = ben.speciesAllocations || [];
      if (!currentAllocations.some(allocation => allocation.species === species)) {
        return { 
          ...ben, 
          speciesAllocations: [...currentAllocations, { 
            species, 
            breed: '',
            quantity: 0, 
            allocation: 0, 
            remarks: '' 
          }] 
        };
      }
      return ben;
    }));
  }, []);

  // Remove species allocation
  const removeSpeciesAllocation = useCallback((benIndex, speciesToRemove) => {
    setServiceBeneficiaries(prev => prev.map((ben, bIdx) => {
      if (bIdx !== benIndex) return ben;
      const currentAllocations = ben.speciesAllocations || [];
      return { 
        ...ben, 
        speciesAllocations: currentAllocations.filter(allocation => allocation.species !== speciesToRemove) 
      };
    }));
  }, []);

  // Bulk operations
  const handleSelectAllBeneficiaries = useCallback(() => {
    if (selectedBeneficiaries.length === serviceBeneficiaries.length) {
      setSelectedBeneficiaries([]);
    } else {
      setSelectedBeneficiaries(serviceBeneficiaries.map(b => Number(b.beneficiary_id)));
    }
  }, [selectedBeneficiaries, serviceBeneficiaries]);

  const handleBeneficiarySelect = useCallback((beneficiaryId) => {
    const idNum = Number(beneficiaryId);
    setSelectedBeneficiaries(prev => 
      prev.includes(idNum) ? prev.filter(id => id !== idNum) : [...prev, idNum]
    );
  }, []);

  // Helper functions
  const getBeneficiaryName = useCallback((beneficiary) => {
    if (!beneficiary) return 'N/A';
    
    if (beneficiary.displayName) {
      return beneficiary.displayName;
    }
    
    if (beneficiary.firstName && beneficiary.lastName) {
      const middleName = beneficiary.middleName ? ` ${beneficiary.middleName}` : '';
      return `${beneficiary.firstName}${middleName} ${beneficiary.lastName}`.trim();
    }
    
    return beneficiary.name || beneficiary.full_name || 'Unknown Beneficiary';
  }, []);

  const getStockStatus = useCallback((inventoryId) => {
    const stock = simulatedStock[inventoryId];
    if (!stock) return { color: 'default', text: 'Unknown' };
    
    if (stock.remaining_stock < 0) return { color: 'error', text: 'Over-allocated' };
    if (stock.remaining_stock === 0) return { color: 'warning', text: 'Fully Allocated' };
    if (stock.remaining_stock < stock.original_stock * 0.2) return { color: 'warning', text: 'Low Stock' };
    return { color: 'success', text: 'Good Stock' };
  }, [simulatedStock]);

  const formatQuantity = useCallback((value, decimals = 2) => {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num)) return '0';
    const factor = 10 ** decimals;
    const rounded = Math.round(num * factor) / factor;
    return rounded.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }, []);

  // ✅ UPDATED Submit handler - Pass eventType to onSubmit
  const handleSubmit = useCallback(async () => {
    const finalStep = eventType === 'registered' ? 4 : (steps.length - 1);
    if (!validateStep(finalStep)) return;
    
    try {
      console.log('Creating event with data:', eventData);
      
      const eventStatus = eventType === 'registered' ? 'scheduled' : 'pending';
      
      // ✅ Include event_type in the data sent to backend
      const eventDataWithTypeAndStatus = { 
        ...eventData, 
        status: eventStatus,
        event_type: eventType  // ✅ Add this line
      };
      
      const createdEvent = await createEvent(eventDataWithTypeAndStatus);
      console.log('Event created:', createdEvent);
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      if (eventType === 'registered') {
        const inventoryMap = new Map();
        if (serviceItems.some(item => item.is_from_inventory)) {
          serviceItems.forEach(item => {
            if (item.inventory_id) {
              const totalUsed = serviceBeneficiaries.reduce((sum, ben) => {
                return sum + (ben.speciesAllocations || []).reduce((allocationSum, allocation) => {
                  return allocationSum + (Number(allocation.allocation) || 0);
                }, 0);
              }, 0);
              
              if (totalUsed > 0) {
                inventoryMap.set(item.inventory_id, {
                  inventory_id: item.inventory_id,
                  quantity_used: totalUsed,
                  remarks: `Service allocation for ${serviceBeneficiaries.length} beneficiaries`
                });
              }
            }
          });
          
          for (const [inventoryId, stockData] of inventoryMap) {
            try {
              await createStock(createdEvent.id, stockData);
            } catch (invErr) {
              console.error('Error adding inventory:', invErr);
              errors.push(`Inventory item: ${invErr.message}`);
            }
          }
        }
        
        // Create beneficiary entries with breed support
        for (const ben of serviceBeneficiaries) {
          const speciesAllocations = ben.speciesAllocations || [];
          
          for (const allocation of speciesAllocations) {
            if (allocation.quantity && Number(allocation.quantity) > 0) {
              try {
                await createBeneficiary(createdEvent.id, { 
                  beneficiary_id: ben.beneficiary_id, 
                  species: allocation.species,
                  breed: allocation.breed || '',
                  quantity: Number(allocation.quantity), 
                  remarks: allocation.remarks || ''
                });
                successCount++;
              } catch (benErr) {
                console.error('Error adding beneficiary:', benErr);
                errorCount++;
                errors.push(`${ben.beneficiary_name} (${allocation.species}${allocation.breed ? ` - ${allocation.breed}` : ''}): ${benErr.message}`);
              }
            }
          }
        }
      } else {
        // Handle walk-in allocations
        for (const allocation of Object.values(walkinAllocations)) {
          if (allocation.quantity && Number(allocation.quantity) > 0) {
            try {
              await createStock(createdEvent.id, {
                inventory_id: allocation.inventory_id,
                quantity_used: Number(allocation.quantity),
                remarks: allocation.remarks || `Walk-in event allocation for ${allocation.item_name}`
              });
            } catch (invErr) {
              console.error('Error adding walk-in inventory allocation:', invErr);
              errors.push(`${allocation.item_name}: ${invErr.message}`);
            }
          }
        }
      }
      
      if (errorCount > 0) {
        alert(
          `Event created with warnings:\n\n` +
          `✓ ${successCount} beneficiary records added successfully\n` +
          `✗ ${errorCount} beneficiary records failed\n\n` +
          `Errors:\n${errors.join('\n')}`
        );
      } else if (eventType === 'walkin') {
        const allocationsCount = Object.values(walkinAllocations).filter(a => a.quantity > 0).length;
        alert(
          `Walk-in event created successfully!\n\n` +
          `Event Status: ${eventStatus}\n` +
          `Inventory Allocations: ${allocationsCount}\n` +
          `Next Steps:\n` +
          `1. Admin approval required\n` +
          `2. Event will be scheduled after approval\n` +
          `3. Walk-in participants can register then`
        );
      }
      
      if (onSubmit) {
        onSubmit({ 
          ...createdEvent, 
          beneficiariesCount: successCount, 
          inventoryCount: eventType === 'registered' ? serviceItems.filter(item => item.is_from_inventory).length : Object.keys(walkinAllocations).length,
          eventType,  // ✅ Pass eventType to parent
          serviceItems  // ✅ Pass serviceItems to parent
        });
      }
      
      resetForm();
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error creating event:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create event';
      alert(`Error: ${errorMessage}\n\nPlease check the console for details.`);
    }
  }, [eventData, eventType, serviceItems, serviceBeneficiaries, walkinAllocations, createEvent, createBeneficiary, createStock, onSubmit, onClose, resetForm, validateStep, steps.length]);

  // ============================================
  // EARLY RETURN
  // ============================================
  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl"
      fullWidth 
      PaperProps={{ 
        sx: { 
          borderRadius: 3, 
          background: theme.background, 
          minHeight: '90vh',
          width: '95vw'
        } 
      }}
    >
      <DialogTitle sx={{ pb: 2, background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, color: 'white' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Package size={28} />
            <Box>
              <Typography variant="h5" fontWeight={700}>Create Service Event</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {eventType === 'registered' 
                  ? 'Assign services to registered farmers' 
                  : 'Create event for walk-in participants'
                }
              </Typography>
            </Box>
          </Stack>
          <Button onClick={onClose} sx={{ color: 'white', minWidth: 'auto', p: 1 }}>
            <X size={24} />
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '75vh', overflow: 'hidden' }}>
        {eventError && <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>{eventError}</Alert>}
        
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Sidebar */}
          <Box sx={{ width: 350, bgcolor: theme.background, borderRight: '1px solid #e0e0e0', p: 3, overflowY: 'auto' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom color={theme.primary}>Progress</Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label} completed={completedSteps.has(index)}>
                  <StepLabel 
                    onClick={() => handleStepClick(index)}
                    sx={{ cursor: index === 0 || completedSteps.has(0) ? 'pointer' : 'default' }}
                    StepIconProps={{ 
                      sx: { 
                        '&.Mui-active': { color: theme.primary }, 
                        '&.Mui-completed': { color: theme.success } 
                      } 
                    }}
                  >
                    <Typography variant="body2" fontWeight={activeStep === index ? 700 : 500}>
                      {step.label} {step.required && <span style={{ color: '#f44336' }}> *</span>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {step.description}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'white', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Summary</Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Service:</Typography>
                  <Typography variant="caption" fontWeight={600}>{selectedCatalog?.name || 'Not selected'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Type:</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {eventType === 'registered' ? 'Registered' : 'Walk-in'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Items:</Typography>
                  <Typography variant="caption" fontWeight={600}>{serviceItems.length}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Beneficiaries:</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {eventType === 'registered' ? serviceBeneficiaries.length : '0 (Will be added later)'}
                  </Typography>
                </Stack>
                {eventType === 'walkin' && Object.keys(walkinAllocations).length > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption">Allocations:</Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {Object.values(walkinAllocations).filter(a => a.quantity > 0).length}
                    </Typography>
                  </Stack>
                )}
                {totalCost > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption">Est. Cost:</Typography>
                    <Typography variant="caption" fontWeight={600} color="#f57c00">
                      ₱{formatQuantity(totalCost)}
                    </Typography>
                  </Stack>
                )}
                {isEventDateToday && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="warning.main">Event Date:</Typography>
                    <Typography variant="caption" fontWeight={600} color="warning.main">Today</Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ flex: 1, p: 4, overflowY: 'auto' }}>
            {/* Step 0: Service Details */}
            {activeStep === 0 && (
              <Card sx={{ bgcolor: theme.surface, borderRadius: 3, border: `1px solid ${theme.outline}` }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom color={theme.primary} fontWeight="600" sx={{ mb: 3 }}>
                    Service Information
                  </Typography>
                  <Stack spacing={3}>
                    <FormControl fullWidth error={!!errors.service_catalog_id}>
                      <InputLabel>Service Type *</InputLabel>
                      <Select
                        name="service_catalog_id"
                        value={eventData.service_catalog_id}
                        onChange={handleEventDataChange}
                        label="Service Type *"
                      >
                        {catalogsLoading ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} />
                          </MenuItem>
                        ) : safeCatalogs.length === 0 ? (
                          <MenuItem disabled>No active services available</MenuItem>
                        ) : (
                          safeCatalogs.map(cat => (
                            <MenuItem key={cat.id} value={cat.id}>
                              {cat.name} {cat.unit && `(${cat.unit})`}
                            </MenuItem>
                          ))
                        )}
                        <Divider />
                        <MenuItem 
                          value="create_new" 
                          onClick={() => setShowCreateService(true)}
                          sx={{ color: 'primary.main', fontWeight: 600 }}
                        >
                          <Plus size={16} style={{ marginRight: 8 }} />
                          Create New Service
                        </MenuItem>
                      </Select>
                      {errors.service_catalog_id && (
                        <Typography variant="caption" color="error">{errors.service_catalog_id}</Typography>
                      )}
                    </FormControl>

                    {/* Create New Service Form */}
                    {showCreateService && (
                      <Card sx={{ p: 3, mt: 2, border: '2px solid', borderColor: 'primary.main', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom color="primary" fontWeight={600}>
                          Create New Service
                        </Typography>
                        <Stack spacing={2}>
                          <TextField
                            fullWidth
                            label="Service Name *"
                            value={newServiceData.name}
                            onChange={(e) => setNewServiceData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Vaccination, Deworming, Artificial Insemination"
                            error={!!errors.newService}
                            helperText={errors.newService}
                          />
                          <Stack direction="row" spacing={2}>
                            <TextField
                              label="Unit"
                              value={newServiceData.unit}
                              onChange={(e) => setNewServiceData(prev => ({ ...prev, unit: e.target.value }))}
                              placeholder="e.g., head, session, dose"
                              sx={{ width: 200 }}
                            />
                            <TextField
                              label="Description (Optional)"
                              value={newServiceData.description}
                              onChange={(e) => setNewServiceData(prev => ({ ...prev, description: e.target.value }))}
                              fullWidth
                              placeholder="Brief description of the service"
                            />
                          </Stack>
                          <Stack direction="row" spacing={2}>
                            <Button
                              variant="contained"
                              onClick={handleCreateService}
                              disabled={!newServiceData.name.trim() || creatingCatalog}
                              startIcon={creatingCatalog ? <CircularProgress size={16} /> : <Save size={16} />}
                            >
                              {creatingCatalog ? 'Creating...' : 'Create Service'}
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => {
                                setShowCreateService(false);
                                setNewServiceData({ name: '', unit: '', description: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          </Stack>
                          {catalogError && (
                            <Alert severity="error">{catalogError}</Alert>
                          )}
                        </Stack>
                      </Card>
                    )}

                    <FormControl fullWidth error={!!errors.barangay}>
                      <InputLabel>Barangay *</InputLabel>
                      <Select
                        name="barangay"
                        value={eventData.barangay}
                        onChange={handleEventDataChange}
                        label="Barangay *"
                      >
                        {barangayOptions.map(barangay => (
                          <MenuItem key={barangay} value={barangay}>{barangay}</MenuItem>
                        ))}
                      </Select>
                      {errors.barangay && (
                        <Typography variant="caption" color="error">{errors.barangay}</Typography>
                      )}
                    </FormControl>

                    <TextField
                      fullWidth
                      type="date"
                      label="Service Date *"
                      name="service_date"
                      value={eventData.service_date}
                      onChange={handleEventDataChange}
                      error={!!errors.service_date}
                      helperText={errors.service_date}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        min: new Date().toISOString().split('T')[0]
                      }}
                    />

                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Remarks"
                      name="remarks"
                      value={eventData.remarks}
                      onChange={handleEventDataChange}
                      placeholder="Add any additional notes or instructions..."
                    />

                    {/* Event Date Warning */}
                    {isEventDateToday && (
                      <Alert severity="info" sx={{ borderRadius: 2, bgcolor: theme.primaryLight }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Clock size={16} />
                          <Typography variant="body2">
                            <strong>Event is scheduled for today!</strong> After creating this event, you can immediately schedule it to start providing services.
                          </Typography>
                        </Stack>
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Registration Type Selection */}
            {activeStep === 1 && (
              <Card sx={{ bgcolor: theme.surface, borderRadius: 3, border: `1px solid ${theme.outline}` }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom color={theme.primary} fontWeight="600" sx={{ mb: 3 }}>
                    Choose Event Type
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card 
                        sx={{ 
                          p: 3, 
                          cursor: 'pointer',
                          border: eventType === 'registered' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                          bgcolor: eventType === 'registered' ? '#e3f2fd' : 'white',
                          '&:hover': { bgcolor: eventType === 'registered' ? '#e3f2fd' : '#f5f5f5' }
                        }}
                        onClick={() => setEventType('registered')}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <User size={32} color="#1976d2" />
                          <Box>
                            <Typography variant="h6" fontWeight={600} color="primary">
                              Registered Beneficiaries
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Assign services to farmers already in the RSBSA database. 
                              You can add beneficiaries and allocate species/quantities during creation.
                            </Typography>
                            <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                              Event Status: <strong>scheduled</strong> (immediate assignment)
                            </Typography>
                          </Box>
                        </Stack>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card 
                        sx={{ 
                          p: 3, 
                          cursor: 'pointer',
                          border: eventType === 'walkin' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                          bgcolor: eventType === 'walkin' ? '#e3f2fd' : 'white',
                          '&:hover': { bgcolor: eventType === 'walkin' ? '#e3f2fd' : '#f5f5f5' }
                        }}
                        onClick={() => setEventType('walkin')}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Users size={32} color="#1976d2" />
                          <Box>
                            <Typography variant="h6" fontWeight={600} color="primary">
                              Walk-in Registration
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Create event for participants to register later. 
                              You can set inventory allocations during creation for better planning.
                            </Typography>
                            <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                              Event Status: <strong>pending</strong> (requires admin approval)
                            </Typography>
                          </Box>
                        </Stack>
                      </Card>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Service Items */}
            {activeStep === 2 && (
              <Card sx={{ bgcolor: theme.surface, borderRadius: 3, border: `1px solid ${theme.outline}` }}>
                <CardContent sx={{ p: 4 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                      <Typography variant="h6" color={theme.primary} fontWeight="600">
                        Service Items ({serviceItems.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Optional - Add inventory items if this service uses physical items
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      startIcon={<PlusIcon />} 
                      onClick={addServiceItem} 
                      sx={{ 
                        borderRadius: 2, 
                        px: 3, 
                        bgcolor: theme.primary, 
                        '&:hover': { bgcolor: theme.primary + 'dd' } 
                      }}
                    >
                      Add Item
                    </Button>
                  </Box>

                  {serviceItems.map((item, idx) => (
                    <Card key={item.id} variant="outlined" sx={{ mb: 2, borderRadius: 2, border: `1px solid ${theme.outline}`, '&:hover': { boxShadow: 2 } }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="subtitle1" fontWeight="600" color={theme.primary}>Item {idx + 1}</Typography>
                          <IconButton color="error" onClick={() => removeServiceItem(idx)} size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="600" color={theme.primary} sx={{ mb: 1 }}>
                              Select from Inventory (Optional)
                            </Typography>
                            <Autocomplete
                              options={availableInventory}
                              getOptionLabel={(option) => `${option.item_name} (${option.quantity_available} ${option.unit} available)`}
                              value={item.inventory_id ? availableInventory.find(inv => inv.id === item.inventory_id) : null}
                              onChange={(e, newValue) => handleInventorySelect(idx, newValue)}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Select Inventory Item"
                                  placeholder="Choose from available inventory or leave empty for service-only..."
                                />
                              )}
                              loading={inventoryLoading}
                              disabled={inventoryLoading}
                            />
                          </Grid>

                          {!item.is_from_inventory && (
                            <>
                              <Grid item xs={8}>
                                <TextField
                                  fullWidth
                                  label="Item Name"
                                  value={item.item_name}
                                  onChange={(e) => handleServiceItemChange(idx, 'item_name', e.target.value)}
                                  placeholder="Enter custom item name (optional)"
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  label="Unit"
                                  value={item.unit}
                                  onChange={(e) => handleServiceItemChange(idx, 'unit', e.target.value)}
                                  placeholder="kg, pcs, heads"
                                />
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {serviceItems.length === 0 && (
                    <Alert severity="info" sx={{ borderRadius: 2, bgcolor: theme.primaryLight }}>
                      <Typography variant="body2">
                        <strong>Optional Step:</strong> Add inventory items if this service distributes physical items (vaccines, medicines, feed, etc.). 
                        You can skip this step for service-only activities like AI, consultations, or training.
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Walk-in Allocations (NEW) */}
            {activeStep === 3 && eventType === 'walkin' && serviceItems.some(item => item.is_from_inventory) && (
              <Stack spacing={3}>
                <Card sx={{ bgcolor: theme.surface, borderRadius: 3, border: `1px solid ${theme.outline}` }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" gutterBottom color={theme.primary} fontWeight="600" sx={{ mb: 3 }}>
                      Set Inventory Allocations for Walk-in Event
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Set the expected allocation quantities for inventory items. This helps with planning and stock management.
                    </Typography>

                    <Grid container spacing={3}>
                      {serviceItems.filter(item => item.is_from_inventory).map((item) => {
                        const allocation = walkinAllocations[item.inventory_id] || {};
                        const stock = simulatedStock[item.inventory_id];
                        const status = getStockStatus(item.inventory_id);
                        
                        return (
                          <Grid item xs={12} md={6} key={item.inventory_id}>
                            <Card variant="outlined" sx={{ 
                              p: 3, 
                              borderRadius: 2, 
                              border: stock?.remaining_stock < 0 ? `2px solid ${theme.error}` : `1px solid ${theme.outline}` 
                            }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight={600}>{item.item_name}</Typography>
                                <Chip label={status.text} color={status.color} size="small" />
                              </Box>
                              
                              {stock && (
                                <Box mb={2}>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Available: {formatQuantity(stock.original_stock)} {item.unit}
                                  </Typography>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={Math.min((stock.allocated / (stock.original_stock || 1)) * 100, 100)} 
                                    color={stock.remaining_stock < 0 ? 'error' : 'primary'}
                                    sx={{ mt: 1, height: 6, borderRadius: 3 }} 
                                  />
                                  <Typography variant="caption" color={stock.remaining_stock < 0 ? theme.error : 'text.secondary'} display="block" sx={{ mt: 0.5 }}>
                                    Remaining: {formatQuantity(stock.remaining_stock)} {item.unit}
                                  </Typography>
                                </Box>
                              )}

                              <Stack spacing={2}>
                                <TextField
                                  type="number"
                                  label={`Allocation Quantity (${item.unit})`}
                                  value={allocation.quantity || ''}
                                  onChange={(e) => handleWalkinAllocationChange(item.inventory_id, 'quantity', e.target.value)}
                                  inputProps={{ min: 0, step: "any" }}
                                  error={stock?.remaining_stock < 0}
                                  helperText={stock?.remaining_stock < 0 ? 'Over-allocation detected!' : `Expected quantity to allocate for walk-in participants`}
                                />
                                
                                <TextField
                                  multiline
                                  rows={2}
                                  label="Remarks (Optional)"
                                  value={allocation.remarks || ''}
                                  onChange={(e) => handleWalkinAllocationChange(item.inventory_id, 'remarks', e.target.value)}
                                  placeholder="Add notes about this allocation..."
                                />
                              </Stack>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>

                    {errors.walkin_allocations && (
                      <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                        {errors.walkin_allocations}
                      </Alert>
                    )}

                    {errors.stock_over && (
                      <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                          Stock Over-allocation Detected
                        </Typography>
                        {errors.stock_over}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            )}

            {/* Step 3: Assign Beneficiaries - Only for registered events */}
            {activeStep === 3 && eventType === 'registered' && (
              <Stack spacing={3}>
                <Card sx={{ bgcolor: theme.surface, borderRadius: 3, border: `1px solid ${theme.outline}` }}>
                  <CardContent sx={{ pb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h6" color={theme.primary} fontWeight="600">Beneficiaries Management</Typography>
                        <Badge badgeContent={serviceBeneficiaries.length} color="primary" showZero>
                          <Users className="text-blue-500" />
                        </Badge>
                      </Box>
                      <Box display="flex" alignItems="center" gap={2}>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={bulkMode} 
                              onChange={(e) => { 
                                setBulkMode(e.target.checked); 
                                if (!e.target.checked) { 
                                  setSelectedBeneficiaries([]); 
                                  setBulkAllocations({}); 
                                } 
                              }} 
                              color="primary" 
                            />
                          }
                          label={
                            <Box display="flex" alignItems="center" gap={1}>
                              <TuneIcon fontSize="small" />
                              <Typography variant="body2" fontWeight="600">Bulk Mode</Typography>
                            </Box>
                          }
                        />
                        <Divider orientation="vertical" flexItem />
                        <ButtonGroup variant="outlined" size="small">
                          <Button 
                            startIcon={<TableChartIcon />} 
                            variant={viewMode === 'table' ? 'contained' : 'outlined'} 
                            onClick={() => setViewMode('table')}
                          >
                            Table
                          </Button>
                          <Button 
                            startIcon={<ViewListIcon />} 
                            variant={viewMode === 'cards' ? 'contained' : 'outlined'} 
                            onClick={() => setViewMode('cards')}
                          >
                            Cards
                          </Button>
                        </ButtonGroup>
                      </Box>
                    </Box>

                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Autocomplete
                          options={getAvailableBeneficiaries()}
                          getOptionLabel={(option) => `${getBeneficiaryName(option)} (${option.rsbsaNumber || 'No RSBSA'})`}
                          onChange={(_, value) => { if (value) addBeneficiary(value); }}
                          value={null}
                          loading={beneficiariesLoading}
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              label="Add Individual Beneficiary" 
                              placeholder="Search by name or RSBSA number..." 
                              size="small"
                              InputProps={{ 
                                ...params.InputProps, 
                                startAdornment: (
                                  <>
                                    <PlusIcon sx={{ mr: 1, color: 'action.active' }} />
                                    {params.InputProps.startAdornment}
                                  </>
                                ) 
                              }} 
                            />
                          )}
                          disabled={beneficiariesLoading}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Autocomplete
                          options={barangayOptions}
                          value={barangayFilter || null}
                          onChange={(_, value) => setBarangayFilter(value || '')}
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              label="Filter by Barangay" 
                              placeholder="Select barangay..." 
                              size="small" 
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Stock Overview */}
                {serviceItems.some(item => item.is_from_inventory) && (
                  <Card sx={{ bgcolor: theme.surfaceVariant, borderRadius: 3, border: `1px solid ${theme.outline}` }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color={theme.primary} fontWeight="600" sx={{ mb: 3 }}>
                        Inventory Stock Overview
                      </Typography>
                      <Grid container spacing={2}>
                        {serviceItems.filter(i => i.is_from_inventory && i.inventory_id).map(item => {
                          const stock = simulatedStock[item.inventory_id];
                          const status = getStockStatus(item.inventory_id);
                          const percentUsed = stock ? ((stock.allocated / (stock.original_stock || 1)) * 100) : 0;
                          return (
                            <Grid item xs={12} md={6} lg={4} key={item.inventory_id}>
                              <Card variant="outlined" sx={{ 
                                borderRadius: 2, 
                                bgcolor: theme.surface, 
                                border: stock?.remaining_stock < 0 ? `2px solid ${theme.error}` : `1px solid ${theme.outline}` 
                              }}>
                                <CardContent sx={{ p: 2 }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                    <Typography variant="subtitle2" fontWeight="600">{item.item_name}</Typography>
                                    <Chip label={status.text} color={status.color} size="small" />
                                  </Box>
                                  {stock && (
                                    <>
                                      <LinearProgress 
                                        variant="determinate" 
                                        value={Math.min(percentUsed, 100)} 
                                        color={stock.remaining_stock < 0 ? 'error' : 'primary'}
                                        sx={{ mb: 1.5, height: 6, borderRadius: 3 }} 
                                      />
                                      <Grid container spacing={1}>
                                        <Grid item xs={6}>
                                          <Typography variant="caption" display="block" color="text.secondary">Allocated</Typography>
                                          <Typography variant="body2" fontWeight="600">{formatQuantity(stock.allocated)} {item.unit}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                          <Typography variant="caption" display="block" color="text.secondary">Remaining</Typography>
                                          <Typography variant="body2" fontWeight="600" color={stock.remaining_stock < 0 ? theme.error : 'text.primary'}>
                                            {formatQuantity(stock.remaining_stock)} {item.unit}
                                          </Typography>
                                        </Grid>
                                      </Grid>
                                    </>
                                  )}
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Beneficiaries Table/Cards with MANUAL BREED INPUT */}
                {serviceBeneficiaries.length > 0 && (
                  <Card sx={{ bgcolor: theme.surface, borderRadius: 3, border: `1px solid ${theme.outline}` }}>
                    <CardContent sx={{ p: 0 }}>
                      {viewMode === 'table' ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: theme.surfaceVariant }}>
                                {bulkMode && (
                                  <TableCell padding="checkbox" width="50">
                                    <Checkbox
                                      checked={selectedBeneficiaries.length === serviceBeneficiaries.length}
                                      indeterminate={selectedBeneficiaries.length > 0 && selectedBeneficiaries.length < serviceBeneficiaries.length}
                                      onChange={handleSelectAllBeneficiaries}
                                      color="primary"
                                    />
                                  </TableCell>
                                )}
                                <TableCell sx={{ minWidth: 200 }}>
                                  <Typography variant="subtitle2" fontWeight="600">Beneficiary</Typography>
                                </TableCell>
                                <TableCell sx={{ minWidth: 120 }}>
                                  <Typography variant="subtitle2" fontWeight="600">RSBSA Number</Typography>
                                </TableCell>
                                {usesSpecies && (
                                  <TableCell align="center" sx={{ minWidth: 600 }}>
                                    <Typography variant="subtitle2" fontWeight="600">Species, Breed & Allocations</Typography>
                                  </TableCell>
                                )}
                                <TableCell width="80" align="center">
                                  <Typography variant="subtitle2" fontWeight="600">Actions</Typography>
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {visibleBeneficiaries.map((beneficiary, bIdx) => (
                                <TableRow key={beneficiary.id} hover sx={{ '&:hover': { bgcolor: theme.primaryLight } }}>
                                  {bulkMode && (
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        checked={selectedBeneficiaries.includes(Number(beneficiary.beneficiary_id))}
                                        onChange={() => handleBeneficiarySelect(beneficiary.beneficiary_id)}
                                        color="primary"
                                      />
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    <Box>
                                      <Typography variant="body2" fontWeight="600">
                                        {beneficiary.beneficiary_name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {beneficiary.barangay}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                      {beneficiary.rsbsa_number}
                                    </Typography>
                                  </TableCell>
                                  {usesSpecies && (
                                    <TableCell align="center">
                                      <Box sx={{ minWidth: 600 }}>
                                        <Stack spacing={1}>
                                          {(beneficiary.speciesAllocations || []).map((allocation, sIdx) => (
                                            <Box key={sIdx} display="flex" alignItems="center" gap={1} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                              {/* Species Selection */}
                                              <Autocomplete
                                                options={speciesOptions}
                                                value={allocation.species || ''}
                                                onChange={(e, newValue) => handleSpeciesAllocationChange(bIdx, sIdx, 'species', newValue || '')}
                                                renderInput={(params) => (
                                                  <TextField
                                                    {...params}
                                                    size="small"
                                                    placeholder="Species"
                                                    sx={{ width: '140px' }}
                                                  />
                                                )}
                                              />
                                              
                                              {/* Breed Manual Input */}
                                              <TextField
                                                size="small"
                                                label="Breed"
                                                value={allocation.breed || ''}
                                                onChange={(e) => handleSpeciesAllocationChange(bIdx, sIdx, 'breed', e.target.value)}
                                                placeholder="e.g., Holstein, Brahman"
                                                sx={{ width: '120px' }}
                                                disabled={!allocation.species}
                                              />
                                              
                                              {/* Quantity */}
                                              <TextField
                                                type="number"
                                                size="small"
                                                label="Heads"
                                                value={allocation.quantity || ''}
                                                onChange={(e) => handleSpeciesAllocationChange(bIdx, sIdx, 'quantity', e.target.value)}
                                                inputProps={{ min: 0, step: "any" }}
                                                sx={{ width: '80px' }}
                                                placeholder="Qty"
                                              />
                                              
                                              {/* Allocation (if inventory) */}
                                              {serviceItems.some(item => item.is_from_inventory) && (
                                                <TextField
                                                  type="number"
                                                  size="small"
                                                  label="Allocation"
                                                  value={allocation.allocation || ''}
                                                  onChange={(e) => handleSpeciesAllocationChange(bIdx, sIdx, 'allocation', e.target.value)}
                                                  inputProps={{ min: 0, step: "any" }}
                                                  sx={{ width: '80px' }}
                                                  placeholder="Alloc"
                                                />
                                              )}
                                              
                                              {/* Delete Button */}
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => removeSpeciesAllocation(bIdx, allocation.species)}
                                              >
                                                <DeleteIcon fontSize="small" />
                                              </IconButton>
                                            </Box>
                                          ))}
                                          
                                          {/* Add Species Button */}
                                          <Autocomplete
                                            options={speciesOptions.filter(option => 
                                              !(beneficiary.speciesAllocations || []).some(allocation => allocation.species === option)
                                            )}
                                            value={null}
                                            onChange={(e, value) => { if (value) addSpeciesAllocation(bIdx, value); }}
                                            renderInput={(params) => (
                                              <TextField 
                                                {...params} 
                                                size="small" 
                                                placeholder="Add species..."
                                                sx={{ '& .MuiInputBase-root': { minHeight: '32px' } }}
                                              />
                                            )}
                                          />
                                        </Stack>
                                      </Box>
                                    </TableCell>
                                  )}
                                  <TableCell align="center">
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() => removeBeneficiary(bIdx)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2}>
                            {visibleBeneficiaries.map((beneficiary, bIdx) => (
                              <Grid item xs={12} md={6} lg={4} key={beneficiary.id}>
                                <Card 
                                  variant="outlined" 
                                  sx={{ 
                                    borderRadius: 2, 
                                    border: bulkMode && selectedBeneficiaries.includes(Number(beneficiary.beneficiary_id)) 
                                      ? `2px solid ${theme.primary}` 
                                      : `1px solid ${theme.outline}`,
                                    '&:hover': { boxShadow: 2 }
                                  }}
                                >
                                  <CardContent sx={{ p: 2 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                      <Box flex="1">
                                        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                                          {beneficiary.beneficiary_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          RSBSA: {beneficiary.rsbsa_number}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {beneficiary.barangay}
                                        </Typography>
                                      </Box>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        {bulkMode && (
                                          <Checkbox
                                            size="small"
                                            checked={selectedBeneficiaries.includes(Number(beneficiary.beneficiary_id))}
                                            onChange={() => handleBeneficiarySelect(beneficiary.beneficiary_id)}
                                            color="primary"
                                          />
                                        )}
                                        <IconButton
                                          color="error"
                                          size="small"
                                          onClick={() => removeBeneficiary(bIdx)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </Box>

                                    <Divider sx={{ my: 1.5 }} />

                                    {usesSpecies && (
                                      <Box>
                                        <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ fontSize: '0.875rem' }}>
                                          Species & Breed Allocations:
                                        </Typography>
                                        <Stack spacing={1}>
                                          {(beneficiary.speciesAllocations || []).map((allocation, sIdx) => (
                                            <Card key={sIdx} variant="outlined" sx={{ p: 1, border: '1px solid #e0e0e0' }}>
                                              <Grid container spacing={1} alignItems="center">
                                                {/* Species */}
                                                <Grid item xs={6}>
                                                  <Autocomplete
                                                    options={speciesOptions}
                                                    value={allocation.species || ''}
                                                    onChange={(e, newValue) => handleSpeciesAllocationChange(bIdx, sIdx, 'species', newValue || '')}
                                                    renderInput={(params) => (
                                                      <TextField
                                                        {...params}
                                                        size="small"
                                                        label="Species"
                                                      />
                                                    )}
                                                  />
                                                </Grid>
                                                
                                                {/* Breed Manual Input */}
                                                <Grid item xs={6}>
                                                  <TextField
                                                    size="small"
                                                    label="Breed"
                                                    value={allocation.breed || ''}
                                                    onChange={(e) => handleSpeciesAllocationChange(bIdx, sIdx, 'breed', e.target.value)}
                                                    placeholder="e.g., Holstein, Brahman"
                                                    disabled={!allocation.species}
                                                    helperText="Enter breed manually"
                                                  />
                                                </Grid>
                                                
                                                {/* Quantity and Allocation */}
                                                <Grid item xs={4}>
                                                  <TextField
                                                    type="number"
                                                    size="small"
                                                    label="Heads"
                                                    value={allocation.quantity || ''}
                                                    onChange={(e) => handleSpeciesAllocationChange(bIdx, sIdx, 'quantity', e.target.value)}
                                                    inputProps={{ min: 0, step: "any" }}
                                                  />
                                                </Grid>
                                                
                                                {serviceItems.some(item => item.is_from_inventory) && (
                                                  <Grid item xs={4}>
                                                    <TextField
                                                      type="number"
                                                      size="small"
                                                      label="Allocation"
                                                      value={allocation.allocation || ''}
                                                      onChange={(e) => handleSpeciesAllocationChange(bIdx, sIdx, 'allocation', e.target.value)}
                                                      inputProps={{ min: 0, step: "any" }}
                                                    />
                                                  </Grid>
                                                )}
                                                
                                                {/* Delete */}
                                                <Grid item xs={4}>
                                                  <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => removeSpeciesAllocation(bIdx, allocation.species)}
                                                  >
                                                    <DeleteIcon fontSize="small" />
                                                  </IconButton>
                                                </Grid>
                                              </Grid>
                                            </Card>
                                          ))}
                                          
                                          {/* Add Species */}
                                          <Autocomplete
                                            options={speciesOptions.filter(option => 
                                              !(beneficiary.speciesAllocations || []).some(allocation => allocation.species === option)
                                            )}
                                            value={null}
                                            onChange={(e, value) => { if (value) addSpeciesAllocation(bIdx, value); }}
                                            renderInput={(params) => (
                                              <TextField 
                                                {...params} 
                                                size="small" 
                                                placeholder="Add species..."
                                              />
                                            )}
                                          />
                                        </Stack>
                                      </Box>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Error Messages */}
                {errors.beneficiaries && (
                  <Alert severity="error" sx={{ borderRadius: 2, bgcolor: theme.errorLight }}>
                    {errors.beneficiaries}
                  </Alert>
                )}

                {errors.stock_over && (
                  <Alert severity="error" sx={{ borderRadius: 2, bgcolor: theme.errorLight }}>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      Stock Over-allocation Detected
                    </Typography>
                    {errors.stock_over}
                  </Alert>
                )}

                {errors.duplicate_beneficiary && (
                  <Alert severity="warning" onClose={() => setErrors(prev => ({ ...prev, duplicate_beneficiary: '' }))} sx={{ borderRadius: 2, bgcolor: theme.warningLight }}>
                    {errors.duplicate_beneficiary}
                  </Alert>
                )}

                {serviceBeneficiaries.length === 0 && (
                  <Alert severity="info" sx={{ borderRadius: 2, bgcolor: theme.primaryLight }}>
                    <Typography variant="body2">
                      No beneficiaries added yet. Use the search field above to add individual beneficiaries or filter by barangay.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            )}

            {/* Final Step: Review */}
            {activeStep === steps.length - 1 && (
              <Stack spacing={3}>
                <Typography variant="h6" fontWeight={600} color={theme.primary}>Review & Confirm</Typography>
                
                <Card sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Service Type</Typography>
                      <Typography variant="body1" fontWeight={600}>{selectedCatalog?.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Barangay</Typography>
                      <Typography variant="body1" fontWeight={600}>{eventData.barangay}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {new Date(eventData.service_date).toLocaleDateString('en-US', { 
                          year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Event Type</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {eventType === 'registered' ? 'Registered Beneficiaries' : 'Walk-in Registration'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Event Status</Typography>
                      <Typography variant="body1" fontWeight={600} color={eventType === 'registered' ? 'success.main' : 'warning.main'}>
                        {eventType === 'registered' ? 'Scheduled' : 'Pending (Requires Approval)'}
                      </Typography>
                    </Box>
                    {eventData.remarks && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Remarks</Typography>
                        <Typography variant="body2">{eventData.remarks}</Typography>
                      </Box>
                    )}
                  </Stack>
                </Card>

                <Stack direction="row" spacing={2}>
                  <Card sx={{ flex: 1, p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Users size={20} color="#1976d2" />
                      <Typography variant="subtitle1" fontWeight="600">
                        {eventType === 'registered' ? 'Registered Beneficiaries' : 'Walk-in Participants'}
                      </Typography>
                    </Stack>
                    <Typography variant="h4" fontWeight={700} color="#1976d2">
                      {eventType === 'registered' ? serviceBeneficiaries.length : '0 (Will be added later)'}
                    </Typography>
                  </Card>
                  
                  <Card sx={{ flex: 1, p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Boxes size={20} color="#9c27b0" />
                      <Typography variant="subtitle1" fontWeight="600">Service Items</Typography>
                    </Stack>
                    <Typography variant="h4" fontWeight={700} color="#9c27b0">
                      {serviceItems.length}
                    </Typography>
                  </Card>
                  
                  {eventType === 'walkin' && Object.keys(walkinAllocations).length > 0 && (
                    <Card sx={{ flex: 1, p: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <Package size={20} color="#ff9800" />
                        <Typography variant="subtitle1" fontWeight="600">Allocations</Typography>
                      </Stack>
                      <Typography variant="h4" fontWeight={700} color="#ff9800">
                        {Object.values(walkinAllocations).filter(a => a.quantity > 0).length}
                      </Typography>
                    </Card>
                  )}
                  
                  {totalCost > 0 && (
                    <Card sx={{ flex: 1, p: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <Package size={20} color="#f57c00" />
                        <Typography variant="subtitle1" fontWeight="600">Est. Cost</Typography>
                      </Stack>
                      <Typography variant="h4" fontWeight={700} color="#f57c00">
                        ₱{formatQuantity(totalCost)}
                      </Typography>
                    </Card>
                  )}
                </Stack>

                {/* Detailed Allocation Breakdown */}
                {eventType === 'registered' && serviceBeneficiaries.length > 0 && (
                  <Card sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Allocation Details</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Beneficiary</TableCell>
                            <TableCell>Species, Breed & Quantities</TableCell>
                            {serviceItems.some(item => item.is_from_inventory) && (
                              <TableCell>Allocations</TableCell>
                            )}
                            <TableCell>Total Heads</TableCell>
                            {serviceItems.some(item => item.is_from_inventory) && (
                              <TableCell>Total Allocation</TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {serviceBeneficiaries.map((ben) => (
                            <TableRow key={ben.id}>
                              <TableCell>{ben.beneficiary_name}</TableCell>
                              <TableCell>
                                <Stack spacing={0.3}>
                                  {(ben.speciesAllocations || []).map((allocation, idx) => (
                                    <Typography key={idx} variant="caption">
                                      • {allocation.species}{allocation.breed ? ` (${allocation.breed})` : ''}: {allocation.quantity} heads
                                    </Typography>
                                  ))}
                                </Stack>
                              </TableCell>
                              {serviceItems.some(item => item.is_from_inventory) && (
                                <TableCell>
                                  <Stack spacing={0.3}>
                                    {(ben.speciesAllocations || []).map((allocation, idx) => (
                                      <Typography key={idx} variant="caption">
                                        • {allocation.species}: {allocation.allocation} units
                                      </Typography>
                                    ))}
                                  </Stack>
                                </TableCell>
                              )}
                              <TableCell>
                                {(ben.speciesAllocations || []).reduce((sum, allocation) => sum + (Number(allocation.quantity) || 0), 0)}
                              </TableCell>
                              {serviceItems.some(item => item.is_from_inventory) && (
                                <TableCell>
                                  {(ben.speciesAllocations || []).reduce((sum, allocation) => sum + (Number(allocation.allocation) || 0), 0)}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                )}

           {/* Walk-in Allocation Summary */}
            {eventType === 'walkin' && Object.keys(walkinAllocations).length > 0 && (
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Walk-in Allocation Summary
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Allocated Quantity</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.values(walkinAllocations)
                        .filter(a => a.quantity > 0)
                        .map((allocation) => (
                          <TableRow key={allocation.inventory_id}>
                            <TableCell>{allocation.item_name}</TableCell>
                            <TableCell>{formatQuantity(allocation.quantity)}</TableCell>
                            <TableCell>{allocation.unit}</TableCell>
                            <TableCell>{allocation.remarks || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}

                {eventError && (
                  <Alert severity="error">
                    {eventError}
                  </Alert>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: theme.surfaceVariant, gap: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" color="text.secondary">
              Step {activeStep + 1} of {steps.length}
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button 
              onClick={handleBack} 
              disabled={activeStep === 0 || creatingEvent}
              sx={{ borderRadius: 2, minWidth: 100 }}
            >
              Back
            </Button>
            
            {activeStep < steps.length - 1 ? (
              <Button 
                variant="contained" 
                onClick={handleNext}
                disabled={creatingEvent}
                sx={{ 
                  borderRadius: 2, 
                  minWidth: 100,
                  bgcolor: theme.primary, 
                  '&:hover': { bgcolor: theme.primary + 'dd' } 
                }}
              >
                Next
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleSubmit}
                disabled={creatingEvent}
                startIcon={creatingEvent ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                sx={{ 
                  borderRadius: 2, 
                  minWidth: 120,
                  bgcolor: theme.success, 
                  color: 'white',
                  '&:hover': { bgcolor: theme.success + 'dd' }
                }}
              >
                {creatingEvent ? 'Creating...' : 'Create Event'}
              </Button>
            )}
            
            <Button 
              onClick={onClose} 
              disabled={creatingEvent}
              variant="outlined"
              sx={{ borderRadius: 2, minWidth: 100 }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ComprehensiveServiceEventModal;