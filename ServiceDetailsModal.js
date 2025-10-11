/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Stack, Divider, Chip, List, ListItem, ListItemText, Paper, IconButton, Tooltip, TextField, InputAdornment, CircularProgress, Alert, Card, Grid, Checkbox, ButtonGroup
} from '@mui/material';
import {
  X, Calendar, MapPin, Package, Users, Boxes, FileText, User, Edit3, Save, XCircle, Clock, CheckCircle, Phone, MapPinned, Printer, Play, RefreshCw, Shield, UserCheck, Plus, UserPlus, UserX, UserMinus
} from 'lucide-react';
import axiosInstance from '../../../api/axiosInstance';
import { printServiceEventReport } from './printUtils';
import AddCommunityParticipantModal from './AddCommunityParticipantModal';

// ============================================
// MULTI-SECTOR HELPER FUNCTIONS - CORRECTED
// ============================================
const getSectorInfo = (catalog) => {
  const sectorId = catalog?.sector_id || catalog?.sector?.id;
  const sectorNames = {
    1: { name: 'Rice Production', color: '#4caf50', icon: '🌾' },
    2: { name: 'Corn Production', color: '#ff9800', icon: '🌽' },
    3: { name: 'High Value Crops', color: '#9c27b0', icon: '🥬' },
    4: { name: 'Fisheries & Aquaculture', color: '#2196f3', icon: '🐟' },
    5: { name: 'Livestock Production', color: '#795548', icon: '🐄' }
  };
  return sectorNames[sectorId] || { name: 'General Services', color: '#607d8b', icon: '⚙️' };
};

const getQuantityLabel = (catalog) => {
  if (!catalog) return 'Quantity';
  const sectorId = catalog.sector_id || catalog.sector?.id;
  
  switch (sectorId) {
    case 1: // Rice
    case 2: // Corn
      return 'Farm Area';
    case 3: // HVC
      return 'Production Area';
    case 4: // Fisheries
      return 'Stock/Harvest';
    case 5: // Livestock
      return 'Animal Count';
    default:
      return catalog.unit || 'Quantity';
  }
};

const getQuantityUnit = (catalog) => {
  if (!catalog) return 'units';
  const sectorId = catalog.sector_id || catalog.sector?.id;
  
  switch (sectorId) {
    case 1: // Rice
    case 2: // Corn
      return 'hectares';
    case 3: // HVC
      return 'sq. meters';
    case 4: // Fisheries
      return 'pieces';
    case 5: // Livestock
      return 'heads';
    default:
      return catalog.unit || 'units';
  }
};

// ✅ Get the category label (Species vs Crop Type)
const getCategoryLabel = (catalog) => {
  if (!catalog) return 'Category';
  const sectorId = catalog.sector_id || catalog.sector?.id;
  
  switch (sectorId) {
    case 1: // Rice
    case 2: // Corn
    case 3: // HVC
      return 'Crop Type';
    case 4: // Fisheries
      return 'Species';
    case 5: // Livestock
      return 'Species';
    default:
      return 'Category';
  }
};

const shouldUseDecimals = (catalog) => {
  if (!catalog) return false;
  const sectorId = catalog.sector_id || catalog.sector?.id;
  return sectorId === 1 || sectorId === 2 || sectorId === 3;
};

const formatQuantity = (quantity, catalog) => {
  const useDecimals = shouldUseDecimals(catalog);
  const num = parseFloat(quantity) || 0;
  if (useDecimals) {
    return num.toFixed(2);
  }
  return Math.round(num).toString();
};

const getParticipantTypeLabel = (type, catalog) => {
  const sectorId = catalog?.sector_id || catalog?.sector?.id;
  
  if (type === 'community') {
    switch (sectorId) {
      case 1:
      case 2:
      case 3:
        return 'Community Farmer';
      case 4:
        return 'Community Fish Farmer';
      case 5:
        return 'Community Livestock Owner';
      default:
        return 'Community Participant';
    }
  }
  
  switch (sectorId) {
    case 1:
    case 2:
    case 3:
      return 'Registered Farmer';
    case 4:
      return 'Registered Fish Farmer';
    case 5:
      return 'Registered Livestock Owner';
    default:
      return 'Registered Beneficiary';
  }
};

const ServiceDetailsModal = ({ 
  open, 
  onClose, 
  event, 
  onComplete, 
  onRefresh, 
  isHistoryView, 
  onOperation,
  eventType,
  serviceItems = [] // ✅ Added serviceItems prop
}) => {
  // State management
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [rowRemarks, setRowRemarks] = useState({});
  const [cancelInput, setCancelInput] = useState({});
  const [expandedByBen, setExpandedByBen] = useState({});
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('service_proof');
  const [docDescription, setDocDescription] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [provideDialog, setProvideDialog] = useState({ open: false, idKey: null, type: null });
  const [cancelDialog, setCancelDialog] = useState({ open: false, idKey: null, type: null });
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [bulkCancelReason, setBulkCancelReason] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Status management states
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [benActionLoading, setBenActionLoading] = useState(false);
  const [benActionError, setBenActionError] = useState(null);

  // Community participant modal state
  const [showAddCommunityParticipant, setShowAddCommunityParticipant] = useState(false);
  const [communityParticipantLoading, setCommunityParticipantLoading] = useState(false);

  // Get sector information
  const sectorInfo = eventDetails?.catalog ? getSectorInfo(eventDetails.catalog) : getSectorInfo(event?.catalog || event?.service_catalog);

  // ✅ Determine if this event allows community participants
  const allowsCommunityParticipants = () => {
    const displayEvent = eventDetails || event;
    
    if (eventType) {
      return eventType === 'community' || eventType === 'mixed';
    }
    
    if (displayEvent.event_type) {
      return displayEvent.event_type === 'community' || displayEvent.event_type === 'mixed';
    }
    
    const hasCommunityParticipants = (displayEvent.service_aggregates || []).length > 0;
    const hasBeneficiaries = (displayEvent.beneficiaries || []).length > 0;
    
    if (hasBeneficiaries && !hasCommunityParticipants) {
      return false;
    }
    
    if (displayEvent.status === 'scheduled' && !hasBeneficiaries) {
      return true;
    }
    
    if (hasBeneficiaries && hasCommunityParticipants) {
      return true;
    }
    
    return displayEvent.status === 'scheduled' && !hasBeneficiaries;
  };

  // ✅ Get event type for display
  const getEventTypeDisplay = () => {
    const displayEvent = eventDetails || event;
    
    if (eventType) {
      return eventType;
    }
    
    if (displayEvent.event_type) {
      return displayEvent.event_type;
    }
    
    const hasCommunityParticipants = (displayEvent.service_aggregates || []).length > 0;
    const hasBeneficiaries = (displayEvent.beneficiaries || []).length > 0;
    
    if (hasBeneficiaries && hasCommunityParticipants) return 'mixed';
    if (hasBeneficiaries && !hasCommunityParticipants) return 'registered';
    if (!hasBeneficiaries && hasCommunityParticipants) return 'community';
    return 'registered';
  };

  // ✅ Get available service items for community participants
  const getAvailableServiceItems = () => {
    const displayEvent = eventDetails || event;
    
    // If serviceItems prop is provided, use that
    if (serviceItems && serviceItems.length > 0) {
      return serviceItems;
    }
    
    // Otherwise, try to get from event stocks
    if (displayEvent?.stocks && displayEvent.stocks.length > 0) {
      return displayEvent.stocks.map(stock => ({
        id: stock.inventory_id || stock.id,
        item_name: stock.inventory?.item_name || stock.item_name || 'Service Item',
        name: stock.inventory?.item_name || stock.item_name || 'Service Item',
        unit: stock.inventory?.unit || stock.unit || 'units',
        inventory_id: stock.inventory_id || stock.inventory?.id,
        is_from_inventory: true
      }));
    }
    
    // Fallback to empty array
    return [];
  };

  useEffect(() => {
    if (open && event) {
      console.log('📋 [ServiceDetailsModal] Modal opened with event:', event);
      fetchEventDetails();
      setEditData({ 
        barangay: event.barangay, 
        service_date: event.service_date?.split('T')[0], 
        remarks: event.remarks, 
        status: event.status 
      });
    }
  }, [open, event]);

  const fetchEventDetails = async () => {
    if (!event?.id) return;
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/service-events/${event.id}`);
      console.log('📦 [ServiceDetailsModal] Fetched event details:', response.data);
      setEventDetails(response.data.data || response.data);
      setSelectedItemIds(new Set());
    } catch (error) {
      console.error('❌ [ServiceDetailsModal] Error fetching event details:', error);
      onOperation?.('Failed to load event details', 'error');
      setEventDetails(event);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // COMMUNITY PARTICIPANT HANDLER
  // ============================================
  const handleAddCommunityParticipant = async (participantData) => {
    try {
      setCommunityParticipantLoading(true);
      console.log('Adding community participant:', participantData);
      
      const response = await axiosInstance.post(
        `/api/service-events/${event.id}/service-aggregates`, 
        participantData
      );
      
      console.log('Community participant added:', response.data);
      
      await fetchEventDetails();
      
      onOperation?.('Community participant added successfully', 'success');
      
      setShowAddCommunityParticipant(false);
      
    } catch (error) {
      console.error('Error adding community participant:', error);
      throw error;
    } finally {
      setCommunityParticipantLoading(false);
    }
  };

  const handleScheduleEvent = async () => {
    console.log('🔄 [ServiceDetailsModal] Starting manual schedule for event:', event.id);
    setSchedulingLoading(true);
    try {
      const response = await axiosInstance.post(`/api/service-events/${event.id}/mark-scheduled`);
      console.log('✅ [ServiceDetailsModal] Schedule response:', response.data);
      
      onOperation?.('Event scheduled successfully', 'success');
      await fetchEventDetails();
      onRefresh?.();
    } catch (error) {
      console.error('❌ [ServiceDetailsModal] Schedule error:', error);
      onOperation?.(error.response?.data?.message || 'Failed to schedule event', 'error');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const shouldBeScheduled = () => {
    const displayEvent = eventDetails || event;
    const eventDate = displayEvent?.service_date?.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const isPending = displayEvent?.status === 'pending';
    const isToday = eventDate === today;
    
    return isPending && isToday;
  };

  const checkCanBeScheduled = () => {
    const displayEvent = eventDetails || event;
    return displayEvent?.status === 'pending';
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    const currentEvent = eventDetails || event;
    setEditData({ 
      barangay: currentEvent.barangay, 
      service_date: currentEvent.service_date?.split('T')[0], 
      remarks: currentEvent.remarks, 
      status: currentEvent.status 
    });
  };

  const handleSaveEdit = async () => {
    try {
      await axiosInstance.put(`/api/service-events/${event.id}`, editData);
      onOperation?.('Event updated successfully', 'success');
      setEditMode(false);
      onRefresh?.();
      fetchEventDetails();
    } catch (error) {
      console.error('Error updating event:', error);
      onOperation?.(error.response?.data?.message || 'Failed to update event', 'error');
    }
  };

  const approveBeneficiary = async (eventId, beneficiaryId, remarks = '') => {
    setBenActionLoading(true);
    setBenActionError(null);
    try {
      const response = await axiosInstance.post(`/api/service-events/${eventId}/beneficiaries/${beneficiaryId}/mark-provided`, {
        remarks: remarks
      });
      console.log('✅ [ServiceDetailsModal] Beneficiary provided:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [ServiceDetailsModal] Error providing beneficiary:', error);
      setBenActionError(error.response?.data?.message || 'Failed to provide beneficiary');
      throw error;
    } finally {
      setBenActionLoading(false);
    }
  };

  const cancelBeneficiary = async (eventId, beneficiaryId, reason = '') => {
    setBenActionLoading(true);
    setBenActionError(null);
    try {
      const response = await axiosInstance.post(`/api/service-events/${eventId}/beneficiaries/${beneficiaryId}/mark-cancelled`, {
        cancellation_reason: reason
      });
      console.log('✅ [ServiceDetailsModal] Beneficiary cancelled:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [ServiceDetailsModal] Error cancelling beneficiary:', error);
      setBenActionError(error.response?.data?.message || 'Failed to cancel beneficiary');
      throw error;
    } finally {
      setBenActionLoading(false);
    }
  };

  const handleProvideCommunityParticipant = async (participant, remarks = '') => {
    try {
      await axiosInstance.post(`/api/service-events/${event.id}/service-aggregates/${participant.id}/mark-provided`, {
        remarks: remarks
      });
      onOperation?.('Community participant marked as provided', 'success');
      await fetchEventDetails();
    } catch (error) {
      onOperation?.(error.response?.data?.message || 'Failed to provide service', 'error');
    }
  };

  const handleCancelCommunityParticipant = async (participant, reason = '') => {
    try {
      await axiosInstance.post(`/api/service-events/${event.id}/service-aggregates/${participant.id}/mark-cancelled`, {
        cancellation_reason: reason
      });
      onOperation?.('Community participant marked as cancelled', 'success');
      await fetchEventDetails();
    } catch (error) {
      onOperation?.(error.response?.data?.message || 'Failed to cancel service', 'error');
    }
  };

  const handleNoShowCommunityParticipant = async (participant) => {
    try {
      await axiosInstance.post(`/api/service-events/${event.id}/service-aggregates/${participant.id}/mark-no-show`);
      onOperation?.('Community participant marked as no-show', 'success');
      await fetchEventDetails();
    } catch (error) {
      onOperation?.(error.response?.data?.message || 'Failed to mark as no-show', 'error');
    }
  };

  const handleProvide = async (ben) => {
    try {
      const idKey = ben.id || ben.beneficiary_id;
      await approveBeneficiary(event.id, idKey, rowRemarks[idKey] || '');
      onOperation?.('Beneficiary marked as provided', 'success');
      await fetchEventDetails();
    } catch (e) {
      onOperation?.(e.response?.data?.message || 'Failed to provide beneficiary', 'error');
    }
  };

  const handleCancel = async (ben) => {
    const idKey = ben.id || ben.beneficiary_id;
    const reason = (cancelInput[idKey] && cancelInput[idKey].trim()) || 'No reason provided';
    try {
      await cancelBeneficiary(event.id, idKey, reason);
      onOperation?.('Beneficiary marked as cancelled', 'success');
      await fetchEventDetails();
    } catch (e) {
      onOperation?.(e.response?.data?.message || 'Failed to cancel beneficiary', 'error');
    }
  };

  const handleMarkCompleted = async () => {
    try {
      await axiosInstance.post(`/api/service-events/${event.id}/mark-completed`);
      onOperation?.('Service event marked as completed', 'success');
      onRefresh?.();
      onClose?.();
    } catch (e) {
      onOperation?.(e.response?.data?.message || 'Failed to mark as completed', 'error');
    }
  };

  const handlePrintReport = () => {
    const displayEvent = eventDetails || event;
    if (!displayEvent) {
      onOperation?.('No event data available for printing', 'error');
      return;
    }
    try {
      printServiceEventReport(displayEvent, { 
        title: 'Service Event Completion Report', 
        municipalAgriculturist: 'EDDIE C. MAAPE JR.', 
        closeAfterPrint: true, 
        showCancelled: true, 
        showSignatures: true 
      });
      onOperation?.('Report sent to printer', 'success');
    } catch (error) {
      console.error('Print error:', error);
      onOperation?.('Failed to print report', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'completed': return 'success';
      case 'ongoing': return 'primary';
      case 'pending': return 'warning';
      case 'scheduled': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getBeneficiaryName = (beneficiary) => {
    if (!beneficiary) return 'N/A';
    const actualBeneficiary = beneficiary.beneficiary || beneficiary;
    if (actualBeneficiary.user) {
      const { fname, mname, lname } = actualBeneficiary.user;
      return `${fname || ''} ${mname || ''} ${lname || ''}`.trim() || 'N/A';
    }
    return actualBeneficiary.name || actualBeneficiary.full_name || 'Unknown Beneficiary';
  };

  const getBeneficiaryContact = (beneficiary) => {
    if (!beneficiary) return 'N/A';
    const actualBeneficiary = beneficiary.beneficiary || beneficiary;
    return actualBeneficiary.contact_number || 'N/A';
  };

  const getBeneficiaryBarangay = (beneficiary) => {
    if (!beneficiary) return 'N/A';
    const actualBeneficiary = beneficiary.beneficiary || beneficiary;
    return actualBeneficiary.barangay || 'N/A';
  };

  const getRSBSANumber = (beneficiary) => {
    const actual = beneficiary.beneficiary || beneficiary;
    return (
      actual.system_generated_rsbsa_number || 
      actual.manual_rsbsa_number || 
      actual.rsbsa_number || 
      beneficiary.rsbsa_number || 
      beneficiary.rsbsaNumber || 
      beneficiary.systemGeneratedRsbaNumber || 
      beneficiary.systemGeneratedRsbsaNumber || 
      'Not Available'
    );
  };

  const getTotalQuantity = () => {
    const displayEvent = eventDetails || event;
    const total = (displayEvent.beneficiaries || []).reduce((sum, ben) => {
      return sum + (parseFloat(ben.quantity) || 0);
    }, 0) + (displayEvent.service_aggregates || []).reduce((sum, communityParticipant) => {
      return sum + (parseFloat(communityParticipant.quantity) || 0);
    }, 0);
    return formatQuantity(total, displayEvent.catalog);
  };

  if (!event) return null;

  const displayEvent = eventDetails || event;
  const canEdit = !isHistoryView && displayEvent.status !== 'completed';
  const canSchedule = shouldBeScheduled();
  const canBeScheduled = checkCanBeScheduled();

  // ✅ COMBINED: Group both beneficiaries and community participants
  const combinedParticipants = (() => {
    const beneficiaries = (displayEvent.beneficiaries || []).map(ben => ({
      ...ben,
      type: 'beneficiary',
      displayName: getBeneficiaryName(ben),
      contact: getBeneficiaryContact(ben),
      barangay: getBeneficiaryBarangay(ben),
      rsbsa: getRSBSANumber(ben)
    }));

    const communityParticipants = (displayEvent.service_aggregates || []).map(communityParticipant => ({
      ...communityParticipant,
      type: 'community',
      displayName: communityParticipant.owner_name,
      contact: communityParticipant.owner_contact,
      barangay: 'Community',
      rsbsa: 'N/A'
    }));

    return [...beneficiaries, ...communityParticipants];
  })();

  // ✅ FIXED: Group combined participants by person with corrected item name logic
  const groupedByParticipant = combinedParticipants.reduce((acc, participant) => {
    const key = participant.beneficiary_id || participant.id || `temp-${Math.random()}`;
    if (!acc[key]) {
      acc[key] = { 
        idKey: key, 
        person: participant, 
        items: [],
        type: participant.type
      };
    }

    // ✅ FIXED: Determine item name based on participant type and available data
    let itemName = displayEvent.catalog?.name || 'Service Item';
    
    // For community participants, try to get the actual service item name
    if (participant.type === 'community') {
      // Priority 1: Direct service_item field
      if (participant.service_item) {
        itemName = participant.service_item;
      }
      // Priority 2: Associated inventory item
      else if (participant.inventory_id && displayEvent.stocks) {
        const associatedStock = displayEvent.stocks.find(stock => 
          stock.inventory_id === participant.inventory_id || 
          stock.inventory?.id === participant.inventory_id
        );
        if (associatedStock?.inventory?.item_name) {
          itemName = associatedStock.inventory.item_name;
        }
      }
      // Priority 3: Direct item_name field
      else if (participant.item_name) {
        itemName = participant.item_name;
      }
      // Priority 4: Check if there's a stock item that matches
      else if (displayEvent.stocks && displayEvent.stocks.length > 0) {
        // Use the first available stock item as fallback
        const firstStock = displayEvent.stocks[0];
        if (firstStock?.inventory?.item_name) {
          itemName = firstStock.inventory.item_name;
        }
      }
    }
    
    // For registered beneficiaries, they might have specific service items too
    else if (participant.type === 'beneficiary') {
      if (participant.service_item) {
        itemName = participant.service_item;
      }
      // Check if there's an inventory item associated
      else if (displayEvent.stocks && displayEvent.stocks.length > 0) {
        // If there's only one stock item, use that
        if (displayEvent.stocks.length === 1) {
          itemName = displayEvent.stocks[0].inventory?.item_name || itemName;
        }
        // For multiple stock items, try to find a match or use first one
        else {
          const firstStock = displayEvent.stocks[0];
          if (firstStock?.inventory?.item_name) {
            itemName = firstStock.inventory.item_name;
          }
        }
      }
    }
    
    const category = participant.species || participant.target_category || 'Not Specified';
    
    acc[key].items.push({
      id: participant.id,
      label: category,
      itemName: itemName,  // ✅ Now correctly shows the actual service item name
      serviceItem: participant.service_item,
      quantity: participant.quantity,
      unit: getQuantityUnit(displayEvent.catalog),
      status: participant.status,
      remarks: participant.remarks,
      type: participant.type
    });
    return acc;
  }, {});

  const groupedParticipantsList = Object.values(groupedByParticipant);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { minHeight: '80vh' } }}>
        <DialogTitle sx={{ bgcolor: sectorInfo.color, color: 'white', py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ fontSize: '24px' }}>{sectorInfo.icon}</Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {displayEvent.catalog?.name || 'Service Event'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {sectorInfo.name} • {displayEvent.barangay} • {formatDate(displayEvent.service_date)}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip 
                label={displayEvent.status || 'pending'} 
                size="small" 
                color={getStatusColor(displayEvent.status)} 
                sx={{ color: 'white', fontWeight: 600 }} 
              />
              <Chip 
                label={
                  getEventTypeDisplay() === 'registered' ? 'Registered Only' :
                  getEventTypeDisplay() === 'community' ? 'Community Only' :
                  getEventTypeDisplay() === 'mixed' ? 'Mixed Event' : 'Event'
                } 
                size="small" 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white', 
                  fontWeight: 500,
                  fontSize: '0.7rem'
                }} 
              />
              <IconButton onClick={onClose} sx={{ color: 'white' }}>
                <X size={20} />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={400}>
              <CircularProgress />
            </Box>
          ) : (
            <Box p={3}>
              <Stack spacing={3}>
                {canBeScheduled && (
                  <Alert severity="info" sx={{ borderRadius: 2, bgcolor: '#e3f2fd' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" spacing={1}>
                        <UserCheck size={16} />
                        <Typography variant="body2">
                          <strong>Event is pending!</strong> Click the button to schedule this event for service delivery.
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleScheduleEvent}
                        disabled={schedulingLoading}
                        startIcon={schedulingLoading ? <CircularProgress size={16} /> : <Play size={16} />}
                        sx={{ bgcolor: sectorInfo.color, '&:hover': { bgcolor: sectorInfo.color + 'dd' } }}
                      >
                        {schedulingLoading ? 'Scheduling...' : 'Schedule Event'}
                      </Button>
                    </Stack>
                  </Alert>
                )}

                {allowsCommunityParticipants() && displayEvent.status === 'scheduled' && (
                  <Card sx={{ p: 2, bgcolor: sectorInfo.color + '15', border: `1px solid ${sectorInfo.color}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="h6" sx={{ color: sectorInfo.color }} fontWeight={600}>
                          {getParticipantTypeLabel('community', displayEvent.catalog)} Registration
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Register community members for {sectorInfo.name.toLowerCase()} services
                        </Typography>
                        
                        {getAvailableServiceItems().length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Available Service Items:
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                              {getAvailableServiceItems().map((item, idx) => (
                                <Chip 
                                  key={idx}
                                  label={`${item.item_name || item.name || 'Service Item'}`}
                                  size="small"
                                  sx={{ bgcolor: sectorInfo.color + '20', color: sectorInfo.color }}
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<Plus size={16} />}
                        onClick={() => setShowAddCommunityParticipant(true)}
                        disabled={communityParticipantLoading}
                        sx={{ bgcolor: sectorInfo.color, '&:hover': { bgcolor: sectorInfo.color + 'dd' } }}
                      >
                        Add {getParticipantTypeLabel('community', displayEvent.catalog)}
                      </Button>
                    </Stack>
                  </Card>
                )}

                {!allowsCommunityParticipants() && displayEvent.status === 'scheduled' && (displayEvent.beneficiaries || []).length > 0 && (
                  <Alert severity="info" sx={{ borderRadius: 2, bgcolor: sectorInfo.color + '10' }}>
                    <Typography variant="body2">
                      <strong>Registered Beneficiaries Event:</strong> This event was created for pre-registered farmers only. 
                      Community registration is not available for this event type.
                    </Typography>
                  </Alert>
                )}

                {getEventTypeDisplay() === 'community' && displayEvent.status === 'pending' && (
                  <Alert severity="warning" sx={{ borderRadius: 2, bgcolor: '#fff3e0' }}>
                    <Typography variant="body2">
                      <strong>Community Only Event:</strong> This event is designed for community participants. 
                      Schedule the event first, then participants can register on-site.
                    </Typography>
                  </Alert>
                )}

                <Card elevation={2} sx={{ border: `2px solid ${sectorInfo.color}15` }}>
                  <Box sx={{ bgcolor: sectorInfo.color + '10', p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ fontSize: '20px' }}>{sectorInfo.icon}</Box>
                      <Typography variant="h6" fontWeight={600} sx={{ color: sectorInfo.color }}>
                        {sectorInfo.name} Event Information
                      </Typography>
                      <Chip 
                        label={
                          getEventTypeDisplay() === 'registered' ? 'Registered Beneficiaries' :
                          getEventTypeDisplay() === 'community' ? 'Community Participants' :
                          getEventTypeDisplay() === 'mixed' ? 'Mixed Event' : 'Standard Event'
                        } 
                        size="small" 
                        sx={{ 
                          ml: 'auto',
                          bgcolor: sectorInfo.color + '20', 
                          color: sectorInfo.color,
                          fontWeight: 600 
                        }} 
                      />
                    </Stack>
                  </Box>
                  <List sx={{ p: 0 }}>
                    <ListItem sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Stack direction="row" spacing={2} width="100%">
                        <Package size={20} color={sectorInfo.color} />
                        <Box flex={1}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Service Type</Typography>
                          <Typography variant="body1" fontWeight={600} mt={0.5}>
                            {displayEvent.catalog?.name || 'N/A'}
                          </Typography>
                          {displayEvent.catalog?.description && (
                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                              {displayEvent.catalog.description}
                            </Typography>
                          )}
                          <Chip 
                            label={sectorInfo.name} 
                            size="small" 
                            sx={{ 
                              mt: 1, 
                              bgcolor: sectorInfo.color + '20', 
                              color: sectorInfo.color,
                              fontWeight: 600 
                            }} 
                          />
                        </Box>
                      </Stack>
                    </ListItem>

                    <ListItem sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Stack direction="row" spacing={2} width="100%">
                        <MapPin size={20} color={sectorInfo.color} />
                        <Box flex={1}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Location & Date</Typography>
                          <Typography variant="body1" fontWeight={600} mt={0.5}>
                            Barangay {displayEvent.barangay}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(displayEvent.service_date)}
                          </Typography>
                        </Box>
                      </Stack>
                    </ListItem>

                    <ListItem sx={{ py: 2 }}>
                      <Stack direction="row" spacing={2} width="100%">
                        <Clock size={20} color={sectorInfo.color} />
                        <Box flex={1}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Status & Coordinator</Typography>
                          <Box mt={0.5} display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={displayEvent.status || 'pending'} 
                              size="small" 
                              color={getStatusColor(displayEvent.status)} 
                            />
                            {displayEvent.coordinator && (
                              <Typography variant="body2" color="text.secondary">
                                by {`${displayEvent.coordinator.fname || ''} ${displayEvent.coordinator.lname || ''}`.trim()}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Stack>
                    </ListItem>
                  </List>
                </Card>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Card sx={{ p: 2, textAlign: 'center', bgcolor: sectorInfo.color + '10' }}>
                      <Users size={24} color={sectorInfo.color} style={{ margin: '0 auto' }} />
                      <Typography variant="h4" fontWeight={700} mt={1}>
                        {combinedParticipants.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Total Participants</Typography>
                      <Stack direction="row" spacing={1} justifyContent="center" mt={1}>
                        {(displayEvent.beneficiaries || []).length > 0 && (
                          <Chip 
                            label={`${(displayEvent.beneficiaries || []).length} Registered`} 
                            size="small" 
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                        {(displayEvent.service_aggregates || []).length > 0 && (
                          <Chip 
                            label={`${(displayEvent.service_aggregates || []).length} Community`} 
                            size="small" 
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Stack>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                      <Boxes size={24} color="#9c27b0" style={{ margin: '0 auto' }} />
                      <Typography variant="h4" fontWeight={700} mt={1}>
                        {displayEvent.stocks?.length || displayEvent.stocks_count || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Service Items</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                      <CheckCircle size={24} color="#2e7d32" style={{ margin: '0 auto' }} />
                      <Typography variant="h4" fontWeight={700} mt={1}>
                        {getTotalQuantity()} {getQuantityUnit(displayEvent.catalog)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Total {getQuantityLabel(displayEvent.catalog)}</Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: sectorInfo.color }}>
                  {sectorInfo.name} Participants ({combinedParticipants.length})
                </Typography>
                
                <Stack spacing={2}>
                  <TextField 
                    size="small" 
                    placeholder={`Search participants, location, ${getCategoryLabel(displayEvent.catalog).toLowerCase()}...`}
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    InputProps={{ 
                      startAdornment: (
                        <InputAdornment position="start">
                          <User size={16} />
                        </InputAdornment>
                      ) 
                    }} 
                  />

                  {(groupedParticipantsList && groupedParticipantsList.length > 0) ? (
                    <Stack spacing={1.5}>
                      {groupedParticipantsList
                        .filter((entry) => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          const name = entry.person.displayName.toLowerCase();
                          const brgy = String(entry.person.barangay || '').toLowerCase();
                          const category = entry.items.map(i => String(i.label).toLowerCase()).join(' ');
                          return name.includes(q) || brgy.includes(q) || category.includes(q);
                        })
                        .map((entry, index) => (
                          <Paper key={entry.idKey || index} variant="outlined" sx={{ p: 2.5, '&:hover': { bgcolor: sectorInfo.color + '05' } }}>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ cursor: 'pointer', flex: 1 }} onClick={() => setExpandedByBen({ ...expandedByBen, [entry.idKey]: !expandedByBen[entry.idKey] })}>
                                  <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                    <Typography variant="h6" fontWeight={700}>
                                      {entry.person.displayName}
                                    </Typography>
                                    <Chip 
                                      label={getParticipantTypeLabel(entry.type, displayEvent.catalog)} 
                                      size="small" 
                                      sx={{
                                        bgcolor: entry.type === 'community' ? sectorInfo.color + '20' : '#e3f2fd',
                                        color: entry.type === 'community' ? sectorInfo.color : '#1976d2'
                                      }}
                                    />
                                  </Stack>
                                  <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <User size={12} />
                                      RSBSA: {entry.person.rsbsa}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Phone size={12} />
                                      {entry.person.contact}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <MapPin size={12} />
                                      {entry.person.barangay}
                                    </Typography>
                                  </Stack>
                                </Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip 
                                    label={
                                      entry.items.every(i => i.status === 'provided') ? 'All Provided' :
                                      entry.items.every(i => i.status === 'cancelled') ? 'All Cancelled' :
                                      entry.items.some(i => i.status === 'provided') ? 'Partially Provided' : 'Pending'
                                    } 
                                    size="small" 
                                    color={
                                      entry.items.every(i => i.status === 'provided') ? 'success' :
                                      entry.items.some(i => i.status === 'cancelled') ? 'warning' : 'default'
                                    } 
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {entry.items.length} service(s)
                                  </Typography>
                                </Stack>
                              </Stack>

                              {expandedByBen[entry.idKey] && (
                                <Box sx={{ mt: 1 }}>
                                  <Divider sx={{ mb: 2 }} />
                                  <Stack spacing={1.5}>
                                    {entry.items.map((it) => (
                                      <Paper key={it.id} variant="outlined" sx={{ 
                                        p: 2, 
                                        bgcolor: it.status === 'provided' ? '#f1f8e9' : it.status === 'cancelled' ? '#ffebee' : 'white',
                                        border: `1px solid ${sectorInfo.color}20`
                                      }}>
                                        <Grid container spacing={2} alignItems="center">
                                          <Grid item xs={12} md={8}>
                                            <Stack spacing={0.5}>
                                              <Typography variant="body2" fontWeight={700} color={sectorInfo.color}>
                                                {it.itemName}
                                              </Typography>
                                              
                                              {it.serviceItem && (
                                                <Box sx={{ 
                                                  p: 1.5, 
                                                  bgcolor: sectorInfo.color + '15', 
                                                  borderRadius: 1,
                                                  border: `1px solid ${sectorInfo.color}40`,
                                                  mb: 1
                                                }}>
                                                  <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Package size={16} color={sectorInfo.color} />
                                                    <Typography variant="body2" fontWeight={600} sx={{ color: sectorInfo.color }}>
                                                      Service Item: {it.serviceItem}
                                                    </Typography>
                                                  </Stack>
                                                </Box>
                                              )}
                                              
                                              <Typography variant="body2" color="text.secondary">
                                                {getCategoryLabel(displayEvent.catalog)}: {it.label}
                                              </Typography>
                                              <Typography variant="body2" color="primary" fontWeight={600}>
                                                {getQuantityLabel(displayEvent.catalog)}: {formatQuantity(it.quantity, displayEvent.catalog)} {getQuantityUnit(displayEvent.catalog)}
                                              </Typography>
                                            </Stack>
                                          </Grid>
                                          
                                          <Grid item xs={12} md={4} sx={{ ml: 'auto' }}>
                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                              <Chip 
                                                label={it.status || 'pending'} 
                                                size="small" 
                                                color={it.status === 'provided' ? 'success' : (it.status === 'cancelled' ? 'error' : 'default')} 
                                              />
                                              {it.status === 'pending' && (
                                                <>
                                                  <Button 
                                                    variant="contained" 
                                                    color="success" 
                                                    size="small" 
                                                    onClick={() => setProvideDialog({ open: true, idKey: it.id, type: entry.type })} 
                                                    startIcon={<CheckCircle size={14} />}
                                                  >
                                                    Provide
                                                  </Button>
                                                  <Button 
                                                    variant="outlined" 
                                                    color="error" 
                                                    size="small" 
                                                    onClick={() => setCancelDialog({ open: true, idKey: it.id, type: entry.type })} 
                                                    startIcon={<XCircle size={14} />}
                                                  >
                                                    Cancel
                                                  </Button>
                                                </>
                                              )}
                                            </Stack>
                                          </Grid>
                                        </Grid>
                                        
                                        {it.remarks && (
                                          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                            <Typography variant="caption" color="text.secondary">
                                              <strong>Remarks:</strong> {it.remarks}
                                            </Typography>
                                          </Box>
                                        )}
                                      </Paper>
                                    ))}
                                  </Stack>
                                </Box>
                              )}
                            </Stack>
                          </Paper>
                        ))}
                    </Stack>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2, bgcolor: sectorInfo.color + '10' }}>
                      {getEventTypeDisplay() === 'registered' ? (
                        <Typography variant="body2">
                          No registered beneficiaries have been added to this {sectorInfo.name.toLowerCase()} service event yet.
                        </Typography>
                      ) : getEventTypeDisplay() === 'community' ? (
                        <Typography variant="body2">
                          No community participants have registered for this {sectorInfo.name.toLowerCase()} service event yet. 
                          {displayEvent.status === 'pending' && ' Schedule the event first to enable community registration.'}
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          No participants have been added to this {sectorInfo.name.toLowerCase()} service event yet.
                        </Typography>
                      )}
                    </Alert>
                  )}
                </Stack>
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5', borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} variant="outlined">
              Close
            </Button>
            <Button 
              variant="contained" 
              onClick={handlePrintReport} 
              sx={{ bgcolor: sectorInfo.color, '&:hover': { bgcolor: sectorInfo.color + 'dd' } }} 
              startIcon={<Printer size={16} />}
            >
              Print Report
            </Button>
            {canEdit && displayEvent.status !== 'completed' && (
              <Button 
                variant="contained" 
                onClick={handleMarkCompleted} 
                sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }} 
                startIcon={<CheckCircle size={16} />}
              >
                Mark as Completed
              </Button>
            )}
          </Stack>
        </DialogActions>

        <Dialog open={provideDialog.open} onClose={() => setProvideDialog({ open: false, idKey: null, type: null })} maxWidth="xs" fullWidth>
          <DialogTitle>Provide Service</DialogTitle>
          <DialogContent>
            <TextField 
              fullWidth 
              label="Remarks (optional)" 
              value={rowRemarks[provideDialog.idKey] || ''} 
              onChange={(e) => setRowRemarks({ ...rowRemarks, [provideDialog.idKey]: e.target.value })} 
              multiline 
              minRows={3} 
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProvideDialog({ open: false, idKey: null, type: null })}>Close</Button>
            <Button 
              variant="contained" 
              onClick={async () => {
                if (provideDialog.type === 'community') {
                  const communityTarget = (eventDetails?.service_aggregates || []).find(w => w.id === provideDialog.idKey);
                  if (communityTarget) await handleProvideCommunityParticipant(communityTarget, rowRemarks[provideDialog.idKey] || '');
                } else {
                  const allBens = (eventDetails?.beneficiaries || event?.beneficiaries || []);
                  let target = allBens.find(b => (b.id === provideDialog.idKey));
                  if (!target) {
                    target = allBens.find(b => ((b.beneficiary_id || b.id) === provideDialog.idKey));
                  }
                  if (target) await handleProvide(target);
                }
                setProvideDialog({ open: false, idKey: null, type: null });
              }} 
              disabled={benActionLoading}
            >
              Confirm Provide
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, idKey: null, type: null })} maxWidth="xs" fullWidth>
          <DialogTitle>Cancel Service</DialogTitle>
          <DialogContent>
            <TextField 
              fullWidth 
              label="Reason (optional)" 
              value={cancelInput[cancelDialog.idKey] || ''} 
              onChange={(e) => setCancelInput({ ...cancelInput, [cancelDialog.idKey]: e.target.value })} 
              multiline 
              minRows={3} 
              placeholder="You can leave this blank" 
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialog({ open: false, idKey: null, type: null })}>Close</Button>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={async () => {
                if (cancelDialog.type === 'community') {
                  const communityTarget = (eventDetails?.service_aggregates || []).find(w => w.id === cancelDialog.idKey);
                  if (communityTarget) await handleCancelCommunityParticipant(communityTarget, cancelInput[cancelDialog.idKey] || '');
                } else {
                  const allBens = (eventDetails?.beneficiaries || event?.beneficiaries || []);
                  let target = allBens.find(b => (b.id === cancelDialog.idKey));
                  if (!target) {
                    target = allBens.find(b => ((b.beneficiary_id || b.id) === cancelDialog.idKey));
                  }
                  if (target) await handleCancel(target);
                }
                setCancelDialog({ open: false, idKey: null, type: null });
              }} 
              disabled={benActionLoading}
            >
              Confirm Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>

      {allowsCommunityParticipants() && (
        <AddCommunityParticipantModal
          open={showAddCommunityParticipant}
          onClose={() => setShowAddCommunityParticipant(false)}
          onAdd={handleAddCommunityParticipant}
          serviceCatalog={displayEvent.catalog || displayEvent.service_catalog}
          serviceItems={getAvailableServiceItems()} // ✅ Pass the available service items
          isLoading={communityParticipantLoading}
        />
      )}
    </>
  );
};

export default ServiceDetailsModal;