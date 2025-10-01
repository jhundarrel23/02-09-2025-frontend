/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Alert,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  useTheme,
  alpha,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Checkbox,
  Snackbar,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText as MuiListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Fade,
  Slide,
  Stack,
  LinearProgress,
  Badge,
  Container
} from '@mui/material';
import {
  X,
  AlertTriangle,
  Search,
  XCircle,
  User,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Package,
  Users,
  Send,
  CheckCircle2,
  RefreshCw,
  Download,
  MapPin,
  TrendingUp,
  BarChart3,
  Filter,
  Eye,
  List as ListIcon,
  Grid3x3
} from 'lucide-react';
import useProgramDetailsModal from './useProgramDetailsModal';

const ProgramDetailsModal = ({ open, onClose, program, onComplete, currentView, onRefresh }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState('cards');
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    item: null,
    beneficiary: null,
    confirming: false
  });
  const [completing, setCompleting] = useState(false);
  
  const {
    loading,
    distributingItems,
    error,
    successMessage,
    completeProgram,
    distributeItem,
    bulkDistributeItems,
    clearMessages
  } = useProgramDetailsModal();

  if (!program) return null;

  const canComplete = program.status === 'ongoing' && 
                     program.approval_status === 'approved' && 
                     currentView === 'active';

  const handleComplete = async () => {
    if (!onComplete || !canComplete) return;
    setCompleting(true);
    try {
      await completeProgram(program.id);
      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Error completing program:', error);
    } finally {
      setCompleting(false);
    }
  };

  const groupedBeneficiaries = program.beneficiaries?.reduce((acc, beneficiary) => {
    const rsbsaNumber = beneficiary.beneficiary?.system_generated_rsbsa_number || 
                       beneficiary.beneficiary?.manual_rsbsa_number ||
                       beneficiary.rsbsa_number ||
                       beneficiary.systemGeneratedRsbaNumber;
    
    const beneficiaryKey = rsbsaNumber || 
                          beneficiary.beneficiary?.user?.id || 
                          beneficiary.id ||
                          `temp-${Math.random()}`;
    
    if (!acc[beneficiaryKey]) {
      acc[beneficiaryKey] = {
        ...beneficiary,
        items: [],
        rsbsaNumber: rsbsaNumber
      };
    }
    
    if (beneficiary.items && beneficiary.items.length > 0) {
      beneficiary.items.forEach(item => {
        const itemExists = acc[beneficiaryKey].items.some(existingItem => 
          existingItem.id === item.id || 
          (existingItem.item_name === item.item_name && existingItem.quantity === item.quantity)
        );
        
        if (!itemExists) {
          acc[beneficiaryKey].items.push(item);
        }
      });
    }
    
    return acc;
  }, {}) || {};

  const flattenedBeneficiaryItems = Object.values(groupedBeneficiaries).map(beneficiary => ({
    id: beneficiary.id || `beneficiary-${Math.random()}`,
    beneficiary: beneficiary,
    items: beneficiary.items || [],
    totalValue: (beneficiary.items || []).reduce((sum, item) => 
      sum + (parseFloat(item.total_value) || 0), 0)
  }));

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getBeneficiaryName = (beneficiary) => {
    if (beneficiary.beneficiary?.user) {
      const { fname, lname } = beneficiary.beneficiary.user;
      if (fname || lname) {
        return `${fname || ''} ${lname || ''}`.trim();
      }
    }
    if (beneficiary.full_name) return beneficiary.full_name;
    if (beneficiary.name) return beneficiary.name;
    
    const firstName = beneficiary.firstName || beneficiary.fname;
    const middleName = beneficiary.middleName || beneficiary.mname;
    const lastName = beneficiary.lastName || beneficiary.lname;
    
    if (firstName || middleName || lastName) {
      return [firstName, middleName, lastName].filter(Boolean).join(' ');
    }
    return 'Unknown Beneficiary';
  };

  const getRSBSANumber = (beneficiary) => {
    return beneficiary.rsbsaNumber || 
           beneficiary.beneficiary?.system_generated_rsbsa_number || 
           beneficiary.beneficiary?.manual_rsbsa_number ||
           beneficiary.rsbsa_number || 
           beneficiary.systemGeneratedRsbaNumber || 
           'Not Available';
  };

  const getBeneficiaryAddress = (beneficiary) => {
    if (beneficiary.beneficiary?.barangay) {
      return beneficiary.beneficiary.barangay;
    }
    return beneficiary.address || 
           beneficiary.streetPurokBarangay ||
           beneficiary.barangay ||
           '';
  };

  const totalProgramValue = flattenedBeneficiaryItems.reduce((total, entry) => {
    return total + entry.totalValue;
  }, 0);

  const uniqueBeneficiaries = flattenedBeneficiaryItems.length;
  const totalItems = flattenedBeneficiaryItems.reduce((sum, entry) => 
    sum + entry.items.length, 0);
  const distributedItems = flattenedBeneficiaryItems.reduce((sum, entry) => 
    sum + entry.items.filter(item => item.status === 'distributed').length, 0);
  const pendingItems = totalItems - distributedItems;
  const beneficiariesWithDistributedItems = flattenedBeneficiaryItems.filter(entry => 
    entry.items.some(item => item.status === 'distributed')
  ).length;

  const distributionProgress = totalItems > 0 ? (distributedItems / totalItems) * 100 : 0;

  const filteredBeneficiaryItems = flattenedBeneficiaryItems.filter(entry => {
    if (!searchQuery) return true;
    
    const beneficiaryName = getBeneficiaryName(entry.beneficiary).toLowerCase();
    const rsbsaNumber = getRSBSANumber(entry.beneficiary).toLowerCase();
    const address = getBeneficiaryAddress(entry.beneficiary).toLowerCase();
    const itemNames = entry.items.map(item => item.item_name?.toLowerCase() || '').join(' ');
    const query = searchQuery.toLowerCase();
    
    return beneficiaryName.includes(query) || 
           rsbsaNumber.includes(query) || 
           address.includes(query) ||
           itemNames.includes(query);
  });

  const handleDistributeItem = async (itemId, beneficiaryName, beneficiaryData) => {
    const item = flattenedBeneficiaryItems
      .flatMap(entry => entry.items.map(item => ({ ...item, beneficiary: entry.beneficiary })))
      .find(item => item.id === itemId);
    
    if (!item) return;

    setConfirmDialog({
      open: true,
      item: item,
      beneficiary: beneficiaryData || item.beneficiary,
      confirming: false
    });
  };

  const handleConfirmDistribution = async () => {
    if (!confirmDialog.item) return;
    setConfirmDialog(prev => ({ ...prev, confirming: true }));
    
    try {
      await distributeItem(confirmDialog.item.id, getBeneficiaryName(confirmDialog.beneficiary));
      if (onRefresh) onRefresh();
      setConfirmDialog({ open: false, item: null, beneficiary: null, confirming: false });
    } catch (error) {
      console.error('Error distributing item:', error);
      setConfirmDialog(prev => ({ ...prev, confirming: false }));
    }
  };

  const handleCancelDistribution = () => {
    setConfirmDialog({ open: false, item: null, beneficiary: null, confirming: false });
  };

  const handleBulkDistribute = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      await bulkDistributeItems(Array.from(selectedItems));
      setSelectedItems(new Set());
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error bulk distributing items:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === totalItems) {
      setSelectedItems(new Set());
    } else {
      const allItemIds = flattenedBeneficiaryItems.flatMap(entry => 
        entry.items.filter(item => item.status !== 'distributed').map(item => item.id)
      );
      setSelectedItems(new Set(allItemIds));
    }
  };

  const handleItemSelect = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const renderStatusChip = (status) => {
    const statusConfig = {
      pending: { 
        color: 'warning', 
        icon: <Clock size={14} />,
        bg: alpha(theme.palette.warning.main, 0.1),
        text: theme.palette.warning.dark
      },
      ongoing: { 
        color: 'info', 
        icon: <TrendingUp size={14} />,
        bg: alpha(theme.palette.info.main, 0.1),
        text: theme.palette.info.dark
      },
      completed: { 
        color: 'success', 
        icon: <CheckCircle size={14} />,
        bg: alpha(theme.palette.success.main, 0.1),
        text: theme.palette.success.dark
      },
      cancelled: { 
        color: 'error', 
        icon: <X size={14} />,
        bg: alpha(theme.palette.error.main, 0.1),
        text: theme.palette.error.dark
      },
    };
    
    const config = statusConfig[status] || { 
      color: 'default', 
      icon: <Clock size={14} />,
      bg: alpha(theme.palette.grey[500], 0.1),
      text: theme.palette.text.secondary
    };
    
    return (
      <Chip
        label={status}
        icon={config.icon}
        size="small"
        sx={{ 
          textTransform: 'capitalize', 
          fontWeight: 600,
          bgcolor: config.bg,
          color: config.text,
          border: 'none'
        }}
      />
    );
  };

  const renderApprovalChip = (approvalStatus) => {
    const statusConfig = {
      pending: { 
        color: 'warning', 
        text: 'Pending Approval',
        bg: alpha(theme.palette.warning.main, 0.1),
        textColor: theme.palette.warning.dark
      },
      approved: { 
        color: 'success', 
        text: 'Approved',
        bg: alpha(theme.palette.success.main, 0.1),
        textColor: theme.palette.success.dark
      },
      rejected: { 
        color: 'error', 
        text: 'Rejected',
        bg: alpha(theme.palette.error.main, 0.1),
        textColor: theme.palette.error.dark
      }
    };
    
    const config = statusConfig[approvalStatus] || { 
      color: 'default', 
      text: 'Unknown',
      bg: alpha(theme.palette.grey[500], 0.1),
      textColor: theme.palette.text.secondary
    };
    
    return (
      <Chip
        label={config.text}
        size="small"
        sx={{ 
          textTransform: 'capitalize', 
          fontWeight: 600,
          bgcolor: config.bg,
          color: config.textColor,
          border: 'none'
        }}
      />
    );
  };

  const renderItemStatusChip = (item) => {
    const status = item.status?.toLowerCase();
    const isDistributed = status === 'distributed' || status === 'completed';
    
    return (
      <Chip
        label={isDistributed ? 'Distributed' : 'Pending'}
        size="small"
        icon={isDistributed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
        sx={{
          bgcolor: isDistributed 
            ? alpha(theme.palette.success.main, 0.1) 
            : alpha(theme.palette.warning.main, 0.1),
          color: isDistributed 
            ? theme.palette.success.dark 
            : theme.palette.warning.dark,
          fontWeight: 600,
          border: 'none'
        }}
      />
    );
  };

  const StatCard = ({ icon, label, value, color = 'primary', subValue }) => (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)} 0%, ${alpha(theme.palette[color].main, 0.05)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(theme.palette[color].main, 0.25)}`
        }
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Avatar 
              sx={{ 
                bgcolor: alpha(theme.palette[color].main, 0.2),
                color: theme.palette[color].main,
                width: 48,
                height: 48
              }}
            >
              {icon}
            </Avatar>
            {subValue && (
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {subValue}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} color={`${color}.main`}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="xl" 
        fullWidth
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 400 }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.2)}`
          }
        }}
      >
        <style>
          {`
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .modal-toolbar, .MuiDialogActions-root { display: none !important; }
              .non-printable { display: none !important; }
              .printable-report { display: block !important; }
              .printable-report table { width: 100%; border-collapse: collapse; font-size: 11px; }
              .printable-report th, .printable-report td { border: 1px solid #ddd; padding: 4px 6px; }
              .printable-report th { background: #f5f5f5; font-weight: 600; }
            }
            @media screen { .printable-report { display: none; } }
          `}
        </style>

        {/* Header */}
        <DialogTitle className="modal-toolbar" sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar 
                sx={{ 
                  bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  width: 56,
                  height: 56,
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
                }}
              >
                <FileText size={28} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {program.title}
                </Typography>
                <Stack direction="row" spacing={1} mt={0.5}>
                  {renderStatusChip(program.status)}
                  {renderApprovalChip(program.approval_status)}
                </Stack>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh Data" arrow>
                <IconButton 
                  onClick={() => onRefresh && onRefresh()}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                  }}
                >
                  <RefreshCw size={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print Report" arrow>
                <IconButton 
                  onClick={() => window.print()}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                  }}
                >
                  <Download size={20} />
                </IconButton>
              </Tooltip>
              <IconButton 
                onClick={onClose}
                sx={{ 
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                }}
              >
                <X size={20} />
              </IconButton>
            </Stack>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {/* Printable Report */}
          <Box className="printable-report" sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Program Distribution Report
              </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>Program:</strong> {program.title} | <strong>Status:</strong> {program.status}
              </Typography>
            </Box>
            <table>
              <thead>
                <tr>
                  <th>Beneficiary</th>
                  <th>RSBSA</th>
                  <th>Barangay</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {flattenedBeneficiaryItems.flatMap((entry) => (
                  entry.items.map((item, idx) => (
                    <tr key={`${entry.id}-${idx}`}>
                      <td>{getBeneficiaryName(entry.beneficiary)}</td>
                      <td>{getRSBSANumber(entry.beneficiary)}</td>
                      <td>{getBeneficiaryAddress(entry.beneficiary)}</td>
                      <td>{item.item_name || ''}</td>
                      <td>{item.quantity || 0}</td>
                      <td>{item.status}</td>
                      <td>{formatCurrency(item.total_value || 0)}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </Box>

          {/* Progress Bar */}
          <Box className="non-printable" sx={{ px: 3, pt: 3 }}>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  Distribution Progress
                </Typography>
                <Typography variant="body2" fontWeight={700} color="primary">
                  {distributedItems} / {totalItems} items ({distributionProgress.toFixed(0)}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={distributionProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`
                  }
                }}
              />
            </Box>
          </Box>

          {/* Stats Cards */}
          <Box className="non-printable" sx={{ px: 3, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<BarChart3 size={24} />}
                  label="Items Distributed"
                  value={`${distributedItems}/${totalItems}`}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<Users size={24} />}
                  label="Beneficiaries Served"
                  value={`${beneficiariesWithDistributedItems}/${uniqueBeneficiaries}`}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<Clock size={24} />}
                  label="Pending Items"
                  value={pendingItems}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<TrendingUp size={24} />}
                  label="Total Value"
                  value={formatCurrency(totalProgramValue)}
                  color="info"
                />
              </Grid>
            </Grid>
          </Box>

          {canComplete && pendingItems > 0 && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Alert 
                severity="info" 
                icon={<AlertTriangle size={18} />}
                sx={{ 
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  <strong>{pendingItems}</strong> pending item(s) require distribution before program completion.
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Program Info */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Card 
              elevation={0}
              sx={{ 
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 2
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700} color="primary" display="flex" alignItems="center" gap={1}>
                    <FileText size={20} />
                    Program Information
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {program.description || 'No description available'}
                  </Typography>
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Calendar size={18} color={theme.palette.primary.main} />
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(program.start_date)} → {formatDate(program.end_date)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Beneficiaries Section */}
          <Box sx={{ px: 3, pb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6" fontWeight={700} color="primary" display="flex" alignItems="center" gap={1}>
                  <Users size={22} />
                  Beneficiaries & Distribution
                </Typography>
                <Badge badgeContent={filteredBeneficiaryItems.length} color="primary" max={999}>
                  <Chip label="Total" size="small" />
                </Badge>
              </Stack>
              
              <Stack direction="row" spacing={1}>
                {selectedItems.size > 0 && (
                  <Fade in={selectedItems.size > 0}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Send size={16} />}
                      onClick={handleBulkDistribute}
                      disabled={loading}
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.4)}`
                      }}
                    >
                      Distribute Selected ({selectedItems.size})
                    </Button>
                  </Fade>
                )}
                <Button
                  variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('cards')}
                  startIcon={<Grid3x3 size={16} />}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                  startIcon={<ListIcon size={16} />}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Table
                </Button>
              </Stack>
            </Box>

            <TextField
              fullWidth
              size="medium"
              placeholder="Search by beneficiary name, RSBSA number, barangay, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04)
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} color={theme.palette.primary.main} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <XCircle size={18} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {filteredBeneficiaryItems.length > 0 ? (
              viewMode === 'cards' ? (
                <Stack spacing={2}>
                  {filteredBeneficiaryItems.map((entry) => (
                    <Fade in key={entry.id} timeout={300}>
                      <Card 
                        sx={{ 
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        <CardContent 
                          sx={{ 
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            py: 2
                          }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar 
                                sx={{ 
                                  bgcolor: theme.palette.primary.main,
                                  width: 48,
                                  height: 48,
                                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`
                                }}
                              >
                                <User size={24} />
                              </Avatar>
                              <Box>
                                <Typography variant="h6" fontWeight={700}>
                                  {getBeneficiaryName(entry.beneficiary)}
                                </Typography>
                                <Stack direction="row" spacing={2} mt={0.5}>
                                  <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                    <FileText size={12} />
                                    {getRSBSANumber(entry.beneficiary)}
                                  </Typography>
                                  {getBeneficiaryAddress(entry.beneficiary) && (
                                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                      <MapPin size={12} />
                                      {getBeneficiaryAddress(entry.beneficiary)}
                                    </Typography>
                                  )}
                                </Stack>
                              </Box>
                            </Stack>
                            <Chip
                              label={`${entry.items.filter(i => i.status === 'distributed').length}/${entry.items.length} Items`}
                              color={entry.items.every(i => i.status === 'distributed') ? 'success' : 'default'}
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </CardContent>
                        <CardContent sx={{ p: 2 }}>
                          <Stack spacing={1.5}>
                            {entry.items.map((item) => (
                              <Card 
                                key={item.id}
                                elevation={0}
                                sx={{ 
                                  bgcolor: alpha(theme.palette.background.default, 0.5),
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 1.5,
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                  }
                                }}
                              >
                                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                                      <Avatar 
                                        sx={{ 
                                          width: 40, 
                                          height: 40, 
                                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                                          color: theme.palette.primary.main
                                        }}
                                      >
                                        <Package size={20} />
                                      </Avatar>
                                      <Box flex={1}>
                                        <Typography variant="body1" fontWeight={600}>
                                          {item.item_name || 'Unknown Item'}
                                        </Typography>
                                        <Stack direction="row" spacing={2} mt={0.3}>
                                          <Typography variant="caption" color="text.secondary">
                                            Qty: <strong>{item.quantity || 0}</strong>
                                          </Typography>
                                          <Typography variant="caption" color="primary" fontWeight={600}>
                                            {formatCurrency(item.total_value || 0)}
                                          </Typography>
                                        </Stack>
                                      </Box>
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      {renderItemStatusChip(item)}
                                      {item.status !== 'distributed' && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          color="success"
                                          startIcon={distributingItems.has(item.id) ? <CircularProgress size={14} /> : <Send size={14} />}
                                          onClick={() => handleDistributeItem(item.id, getBeneficiaryName(entry.beneficiary), entry.beneficiary)}
                                          disabled={distributingItems.has(item.id)}
                                          sx={{ 
                                            borderRadius: 1.5,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            minWidth: 100
                                          }}
                                        >
                                          {distributingItems.has(item.id) ? 'Processing...' : 'Distribute'}
                                        </Button>
                                      )}
                                    </Stack>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Fade>
                  ))}
                </Stack>
              ) : (
                <TableContainer 
                  component={Paper} 
                  elevation={0}
                  sx={{ 
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItems.size > 0 && selectedItems.size === flattenedBeneficiaryItems.flatMap(e => e.items.filter(i => i.status !== 'distributed')).length}
                            indeterminate={selectedItems.size > 0 && selectedItems.size < flattenedBeneficiaryItems.flatMap(e => e.items.filter(i => i.status !== 'distributed')).length}
                            onChange={handleSelectAll}
                          />
                        </TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>Beneficiary</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>RSBSA</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>Address</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>Item</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" fontWeight={700}>Quantity</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={700}>Value</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" fontWeight={700}>Status</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" fontWeight={700}>Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredBeneficiaryItems.flatMap((entry) => 
                        entry.items.map((item, idx) => (
                          <TableRow 
                            key={`${entry.id}-${item.id}`} 
                            hover
                            sx={{ 
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.04)
                              }
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onChange={() => handleItemSelect(item.id)}
                                disabled={item.status === 'distributed'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {getBeneficiaryName(entry.beneficiary)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {getRSBSANumber(entry.beneficiary)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {getBeneficiaryAddress(entry.beneficiary) || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {item.item_name || 'Unknown'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={item.quantity || 0} 
                                size="small" 
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} color="primary">
                                {formatCurrency(item.total_value || 0)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {renderItemStatusChip(item)}
                            </TableCell>
                            <TableCell align="center">
                              {item.status === 'distributed' ? (
                                <Chip 
                                  label="Completed" 
                                  color="success" 
                                  size="small"
                                  icon={<CheckCircle size={14} />}
                                  sx={{ fontWeight: 600 }}
                                />
                              ) : (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleDistributeItem(item.id, getBeneficiaryName(entry.beneficiary), entry.beneficiary)}
                                  disabled={distributingItems.has(item.id)}
                                  sx={{ 
                                    borderRadius: 1.5,
                                    textTransform: 'none',
                                    fontWeight: 600
                                  }}
                                >
                                  {distributingItems.has(item.id) ? <CircularProgress size={16} /> : 'Distribute'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            ) : (
              <Card 
                elevation={0}
                sx={{ 
                  py: 8, 
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3
                }}
              >
                <Users size={64} color={theme.palette.text.disabled} />
                <Typography variant="h6" color="text.secondary" mt={2} fontWeight={600}>
                  {searchQuery ? 'No matching results found' : 'No beneficiaries assigned'}
                </Typography>
                <Typography variant="body2" color="text.disabled" mt={1}>
                  {searchQuery ? 'Try adjusting your search criteria' : 'Add beneficiaries to this program'}
                </Typography>
              </Card>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}`, gap: 2 }}>
          {canComplete && (
            <Button
              onClick={handleComplete}
              variant="contained"
              color="success"
              disabled={completing || pendingItems > 0}
              startIcon={completing ? <CircularProgress size={18} /> : <CheckCircle />}
              sx={{ 
                mr: 'auto',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.4)}`
              }}
            >
              {completing ? 'Completing Program...' : 'Complete Program'}
            </Button>
          )}
          <Button 
            onClick={onClose} 
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={4000} 
        onClose={clearMessages}
        TransitionComponent={Slide}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={clearMessages} 
          severity="success"
          variant="filled"
          sx={{ 
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.4)}`
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={4000} 
        onClose={clearMessages}
        TransitionComponent={Slide}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={clearMessages} 
          severity="error"
          variant="filled"
          sx={{ 
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: `0 4px 14px ${alpha(theme.palette.error.main, 0.4)}`
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={handleCancelDistribution} 
        maxWidth="sm" 
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.2)}`
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar 
              sx={{ 
                bgcolor: alpha(theme.palette.warning.main, 0.2),
                color: theme.palette.warning.main,
                width: 56,
                height: 56
              }}
            >
              <AlertTriangle size={28} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Confirm Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verify details before proceeding
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {confirmDialog.item && confirmDialog.beneficiary && (
            <Stack spacing={2}>
              <Card 
                elevation={0}
                sx={{ 
                  p: 2.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 2
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="overline" color="primary" fontWeight={700}>
                    Beneficiary Information
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {getBeneficiaryName(confirmDialog.beneficiary)}
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                      <FileText size={14} />
                      {getRSBSANumber(confirmDialog.beneficiary)}
                    </Typography>
                    {getBeneficiaryAddress(confirmDialog.beneficiary) && (
                      <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                        <MapPin size={14} />
                        {getBeneficiaryAddress(confirmDialog.beneficiary)}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Card>
              
              <Card 
                elevation={0}
                sx={{ 
                  p: 2.5,
                  bgcolor: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  borderRadius: 2
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="overline" color="success.main" fontWeight={700}>
                    Item Details
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {confirmDialog.item.item_name || 'Unknown Item'}
                  </Typography>
                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Quantity
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {confirmDialog.item.quantity || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Value
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="success.main">
                        {formatCurrency(confirmDialog.item.total_value || 0)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Card>
              
              <Alert 
                severity="warning"
                icon={<AlertTriangle size={20} />}
                sx={{ 
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  This action is <strong>permanent</strong> and cannot be undone. Please verify all details carefully.
                </Typography>
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleCancelDistribution} 
            disabled={confirmDialog.confirming}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDistribution}
            variant="contained"
            color="success"
            disabled={confirmDialog.confirming}
            startIcon={confirmDialog.confirming ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.4)}`
            }}
          >
            {confirmDialog.confirming ? 'Confirming...' : 'Confirm Distribution'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

ProgramDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
  onRefresh: PropTypes.func,
  currentView: PropTypes.string,
  program: PropTypes.object
};

export default ProgramDetailsModal;
