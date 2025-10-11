/* eslint-disable no-useless-escape */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  Box,
  Chip,
  FormHelperText,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PetsIcon from '@mui/icons-material/Pets';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';

// ============================================
// LIVESTOCK SPECIES OPTIONS
// ============================================
const LIVESTOCK_SPECIES = [
  'Bovine',
  'Bubaline', 
  'Caprine',
  'Ovine',
  'Porcine',
  'Equine',
  'Canine',
  'Feline',
  'Poultry'
];

// ============================================
// UNIT OPTIONS
// ============================================
const UNIT_OPTIONS = [
  'head',
  'heads'
];

const AddWalkInParticipantModal = ({ 
  open, 
  onClose, 
  onAdd, 
  serviceCatalog,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    owner_name: '',
    owner_contact: '',
    target_category: '',
    quantity: '',
    unit: 'head'
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        owner_name: '',
        owner_contact: '',
        target_category: '',
        quantity: '',
        unit: 'head'
      });
      setErrors({});
      setSubmitError('');
    }
  }, [open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev, 
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Owner name validation
    if (!formData.owner_name || !formData.owner_name.trim()) {
      newErrors.owner_name = 'Owner name is required';
    } else if (formData.owner_name.trim().length < 2) {
      newErrors.owner_name = 'Owner name must be at least 2 characters';
    }

    // Contact validation (optional but if provided, should be valid)
    if (formData.owner_contact && formData.owner_contact.trim()) {
      const phoneRegex = /^(\+63|0)[0-9]{10}$/;
      if (!phoneRegex.test(formData.owner_contact.replace(/\s/g, ''))) {
        newErrors.owner_contact = 'Please enter a valid Philippine phone number';
      }
    }

    // Species validation
    if (!formData.target_category) {
      newErrors.target_category = 'Species is required';
    }

    // Quantity validation
    if (!formData.quantity || formData.quantity === '') {
      newErrors.quantity = 'Quantity is required';
    } else {
      const qty = parseFloat(formData.quantity);
      if (isNaN(qty) || qty < 1) {
        newErrors.quantity = 'Quantity must be at least 1';
      } else if (!Number.isInteger(qty)) {
        newErrors.quantity = 'Quantity must be a whole number';
      }
    }

    // Unit validation
    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitError('');
    
    // Check if onAdd function is provided
    if (!onAdd || typeof onAdd !== 'function') {
      setSubmitError('onAdd function is not provided');
      return;
    }

    // Check if service catalog is provided
    if (!serviceCatalog || !serviceCatalog.id) {
      setSubmitError('Service catalog information is missing');
      return;
    }

    try {
      const participantData = {
        owner_name: formData.owner_name.trim(),
        owner_contact: formData.owner_contact ? formData.owner_contact.trim() : '',
        target_category: formData.target_category,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        service_catalog_id: serviceCatalog.id
      };

      console.log('Submitting participant data:', participantData);

      await onAdd(participantData);
      
      // Close modal on success
      handleClose();
    } catch (error) {
      console.error('Error adding participant:', error);
      
      // Handle different error types
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          // Laravel validation errors
          const serverErrors = error.response.data.errors;
          setErrors(serverErrors);
        } else if (error.response.data.error) {
          setSubmitError(error.response.data.error);
        } else {
          setSubmitError('Failed to add participant');
        }
      } else if (error.message) {
        setSubmitError(error.message);
      } else {
        setSubmitError('An unexpected error occurred');
      }
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={isLoading}
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography variant="h6" fontWeight="600">
          Register Walk-in Livestock
        </Typography>
        {serviceCatalog && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Typography variant="body2" color="text.secondary">
              Service:
            </Typography>
            <Chip 
              label={serviceCatalog.name || 'Unknown Service'} 
              color="primary"
              size="small"
              variant="outlined"
            />
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {submitError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Owner Information Section */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PersonIcon sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle1" fontWeight="600">
                Owner Information
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Animal Owner Name"
                  value={formData.owner_name}
                  onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  onKeyPress={handleKeyPress}
                  error={!!errors.owner_name}
                  helperText={errors.owner_name || 'Full name of livestock owner'}
                  disabled={isLoading}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Number"
                  value={formData.owner_contact}
                  onChange={(e) => handleInputChange('owner_contact', e.target.value)}
                  onKeyPress={handleKeyPress}
                  error={!!errors.owner_contact}
                  helperText={errors.owner_contact || 'Phone number (optional)'}
                  disabled={isLoading}
                  placeholder="e.g., 09171234567"
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Animal Information Section */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PetsIcon sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle1" fontWeight="600">
                Animal Information
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.target_category}>
                  <InputLabel>Species *</InputLabel>
                  <Select
                    value={formData.target_category}
                    label="Species *"
                    onChange={(e) => handleInputChange('target_category', e.target.value)}
                    disabled={isLoading}
                  >
                    {LIVESTOCK_SPECIES.map((species) => (
                      <MenuItem key={species} value={species}>
                        {species}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {errors.target_category || 'Species of livestock animal'}
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Quantity & Details Section */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <FormatListNumberedIcon sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle1" fontWeight="600">
                Quantity & Details
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Animals"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  onKeyPress={handleKeyPress}
                  error={!!errors.quantity}
                  helperText={errors.quantity || 'Total count of animals'}
                  inputProps={{ 
                    min: 1,
                    step: 1
                  }}
                  disabled={isLoading}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.unit}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={formData.unit}
                    label="Unit"
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    disabled={isLoading}
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {errors.unit || 'Unit of measurement'}
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* Info Alert */}
          <Grid item xs={12}>
            <Alert severity="info" variant="outlined">
              <Typography variant="body2">
                <strong>Registration Only:</strong> Service details (medicines used, completion status) 
                will be recorded after the service is provided.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        <Button 
          onClick={handleClose} 
          disabled={isLoading}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isLoading || !formData.owner_name || !formData.target_category || !formData.quantity}
          sx={{ textTransform: 'none' }}
        >
          {isLoading ? 'Registering...' : 'Register Participant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddWalkInParticipantModal;