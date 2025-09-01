// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line react/button-has-type
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { referenceDataService } from '../../../../api/rsbsaService';
import {
  Grid,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  TextField,
  Paper,
  Chip,
  Divider
} from '@mui/material';
import {
  Agriculture as AgricultureIcon,
  CheckCircle as CheckCircleIcon,
  Work as WorkIcon,
  WaterDrop as WaterDropIcon,
  School as SchoolIcon
} from '@mui/icons-material';

// Activity configurations to reduce repetitive code
const ACTIVITY_CONFIGS = {
  1: { // Farmer
    section: 'farmerActivities',
    title: 'Farmer Activities',
    subtitle: 'Tell us about your farming activities and specializations',
    color: 'success',
    icon: AgricultureIcon,
    fields: {
      crops: {
        title: 'What crops do you grow?',
        chipLabel: 'Crop Production',
        items: [
          { key: 'rice', label: 'Rice', description: 'Cultivating rice varieties' },
          { key: 'corn', label: 'Corn', description: 'Growing corn/maize crops' },
          { 
            key: 'other_crops', 
            label: 'Other Crops', 
            description: 'Specialty or other crops',
            hasSpecify: true,
            specifyKey: 'other_crops_specify',
            specifyLabel: 'Specify Other Crops',
            specifyPlaceholder: 'e.g., Coffee, Cacao, Sugarcane, etc.'
          }
        ]
      },
      animals: {
        title: 'Do you raise livestock or poultry?',
        chipLabel: 'Animal Production',
        chipColor: 'info',
        items: [
          { 
            key: 'livestock', 
            label: 'Livestock', 
            description: 'Cattle, goats, swine, carabao',
            hasSpecify: true,
            specifyKey: 'livestock_specify',
            specifyLabel: 'Specify Livestock Types',
            specifyPlaceholder: 'e.g., Cattle, Goat, Swine, Carabao, etc.'
          },
          { 
            key: 'poultry', 
            label: 'Poultry', 
            description: 'Chickens, ducks, geese',
            hasSpecify: true,
            specifyKey: 'poultry_specify',
            specifyLabel: 'Specify Poultry Types',
            specifyPlaceholder: 'e.g., Chicken, Duck, Goose, Turkey, etc.'
          }
        ]
      }
    }
  },
  2: { // Farm Worker
    section: 'farmworkerActivities',
    title: 'Farmworker Activities',
    subtitle: 'Tell us about your farm work specializations',
    color: 'info',
    icon: WorkIcon,
    fields: {
      services: {
        title: 'What farm work do you specialize in?',
        chipLabel: 'Farm Services',
        items: [
          { key: 'land_preparation', label: 'Land Preparation', description: 'Plowing, tilling, soil preparation' },
          { key: 'planting', label: 'Planting', description: 'Seed/seedling planting' },
          { key: 'cultivation', label: 'Cultivation', description: 'Weeding, fertilizing, crop maintenance' },
          { key: 'harvesting', label: 'Harvesting', description: 'Crop gathering and post-harvest' },
          { 
            key: 'others', 
            label: 'Others', 
            description: 'Other farm work activities',
            hasSpecify: true,
            specifyKey: 'others_specify',
            specifyLabel: 'Specify Other Farm Work Activities',
            specifyPlaceholder: 'e.g., Pest Control, Post-harvest Processing, etc.'
          }
        ]
      }
    }
  },
  3: { // Fisherfolk
    section: 'fisherfolkActivities',
    title: 'Fisherfolk Activities',
    subtitle: 'Tell us about your fishing and aquaculture activities',
    color: 'primary',
    icon: WaterDropIcon,
    fields: {
      fishing: {
        title: 'What fishing activities are you involved in?',
        chipLabel: 'Fishing & Aquaculture',
        items: [
          { key: 'fish_capture', label: 'Fish Capture', description: 'Ocean, river, lake fishing' },
          { key: 'aquaculture', label: 'Aquaculture', description: 'Fish farming, pond culture' },
          { key: 'seaweed_farming', label: 'Seaweed Farming', description: 'Marine algae cultivation' },
          { key: 'gleaning', label: 'Gleaning', description: 'Collecting shellfish, seaweed' },
          { key: 'fish_processing', label: 'Fish Processing', description: 'Drying, smoking, packaging' }
        ]
      }
    }
  },
  4: { // Agri-Youth
    section: 'agriYouthActivities',
    title: 'Agri-Youth Activities',
    subtitle: 'Tell us about your agricultural youth involvement',
    color: 'warning',
    icon: SchoolIcon,
    fields: {
      youth: {
        title: 'Are you an Agri-Youth?',
        chipLabel: 'Youth Development',
        items: [
          { key: 'is_agri_youth', label: 'I am an Agri-Youth (18-30 years old)', description: 'Youth involved in agriculture' }
        ]
      },
      additional: {
        title: 'Additional Information',
        conditional: 'is_agri_youth',
        items: [
          { key: 'is_part_of_farming_household', label: 'Part of Farming Household', description: 'Member of a farming family' },
          { key: 'is_formal_agri_course', label: 'Formal Agricultural Course', description: 'Enrolled in formal agricultural education' },
          { key: 'is_nonformal_agri_course', label: 'Non-formal Agricultural Training', description: 'Workshops, seminars, training programs' },
          { key: 'is_agri_program_participant', label: 'Agricultural Program Participant', description: 'Government or NGO agricultural programs' }
        ]
      }
    }
  }
};

const FarmProfileSection = ({ formData, errors, updateField }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [livelihoodCategories, setLivelihoodCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default categories fallback
  const defaultCategories = useMemo(() => [
    { id: 1, category_name: 'Farmer', description: 'Crop cultivation and livestock raising' },
    { id: 2, category_name: 'Farm Worker', description: 'Agricultural labor and farm services' },
    { id: 3, category_name: 'Fisherfolk', description: 'Fishing and aquaculture activities' },
    { id: 4, category_name: 'Agri-Youth', description: 'Young agricultural practitioners' }
  ], []);

  // Enhanced categories with icons and colors
  const enhancedCategories = useMemo(() => {
    const categories = livelihoodCategories.length > 0 ? livelihoodCategories : defaultCategories;
    return categories.map(category => {
      const config = ACTIVITY_CONFIGS[category.id];
      return {
        ...category,
        icon: config?.icon || AgricultureIcon,
        color: config?.color || 'primary'
      };
    });
  }, [livelihoodCategories, defaultCategories]);

  // Fetch livelihood categories
  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const result = await referenceDataService.getLivelihoodCategories();
        if (isMounted && result.success && result.data) {
          const categoriesArray = Array.isArray(result.data) ? result.data : Object.values(result.data);
          setLivelihoodCategories(categoriesArray);
        }
      } catch (error) {
        console.error('Failed to fetch livelihood categories:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCategories();
    return () => { isMounted = false; };
  }, []);

  // Initialize form data
  useEffect(() => {
    if (!formData || isLoading) return;

    const initializeData = () => {
      // Initialize farmProfile
      if (!formData.farmProfile?.livelihood_category_id && enhancedCategories.length > 0) {
        updateField('farmProfile', 'livelihood_category_id', enhancedCategories[0].id);
      }

      // Initialize activity sections based on configs
      Object.values(ACTIVITY_CONFIGS).forEach(config => {
        if (!formData[config.section]) {
          // Initialize all fields for this section
          Object.values(config.fields).forEach(fieldGroup => {
            fieldGroup.items.forEach(item => {
              updateField(config.section, item.key, false);
              if (item.hasSpecify && item.specifyKey) {
                updateField(config.section, item.specifyKey, '');
              }
            });
          });
        }
      });
    };

    initializeData();
  }, [formData, updateField, enhancedCategories, isLoading]);

  // Sync selected tab with livelihood category
  useEffect(() => {
    if (enhancedCategories.length === 0) return;
    
    const currentId = formData?.farmProfile?.livelihood_category_id;
    if (currentId) {
      const index = enhancedCategories.findIndex(cat => cat.id === currentId);
      if (index >= 0 && index !== selectedTab) {
        setSelectedTab(index);
      }
    }
  }, [formData?.farmProfile?.livelihood_category_id, enhancedCategories, selectedTab]);

  // Memoized helper functions
  const getActivityValue = useCallback((section, field, defaultValue = false) => {
    return formData?.[section]?.[field] ?? defaultValue;
  }, [formData]);

  const handleTabChange = useCallback((event, newValue) => {
    setSelectedTab(newValue);
    const selectedCategory = enhancedCategories[newValue];
    if (selectedCategory) {
      updateField('farmProfile', 'livelihood_category_id', selectedCategory.id);
    }
  }, [enhancedCategories, updateField]);

  const handleFieldChange = useCallback((section, field, value) => {
    updateField(section, field, value);
  }, [updateField]);

  // Reusable CheckboxField component
  const CheckboxField = React.memo(({ label, description, checked, onChange }) => (
    <Card 
      variant="outlined" 
      sx={{ 
        height: '100%',
        border: checked ? '2px solid' : '1px solid',
        borderColor: checked ? 'primary.main' : 'divider',
        bgcolor: checked ? 'primary.50' : 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: checked ? 'primary.50' : 'grey.50'
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={onChange}
              color="primary"
              size="medium"
            />
          }
          label={
            <Box sx={{ ml: 1 }}>
              <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            </Box>
          }
          sx={{ 
            width: '100%', 
            alignItems: 'flex-start',
            margin: 0
          }}
        />
      </CardContent>
    </Card>
  ));

  // Generic field group renderer
  const renderFieldGroup = useCallback((config, fieldGroupKey, fieldGroup) => {
    const { section, color } = config;
    const shouldShow = !fieldGroup.conditional || getActivityValue(section, fieldGroup.conditional);

    if (!shouldShow) return null;

    return (
      <Card variant="outlined" key={fieldGroupKey} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {fieldGroup.conditional && <Divider sx={{ mb: 3 }} />}
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Chip 
              label={fieldGroup.chipLabel || fieldGroup.title} 
              color={fieldGroup.chipColor || color} 
              variant="outlined" 
              sx={{ mr: 2 }}
            />
            <Typography variant="h6" fontWeight="600">
              {fieldGroup.title}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {fieldGroup.items.map((item) => (
              <Grid item xs={12} sm={6} md={fieldGroup.items.length > 4 ? 4 : 6} key={item.key}>
                <CheckboxField
                  label={item.label}
                  description={item.description}
                  checked={getActivityValue(section, item.key)}
                  onChange={() => handleFieldChange(section, item.key, !getActivityValue(section, item.key))}
                />
              </Grid>
            ))}
          </Grid>

          {/* Render specify fields */}
          {fieldGroup.items.map((item) => {
            if (!item.hasSpecify || !getActivityValue(section, item.key)) return null;
            
            return (
              <Box key={item.specifyKey} sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <TextField
                  fullWidth
                  label={item.specifyLabel}
                  placeholder={item.specifyPlaceholder}
                  value={getActivityValue(section, item.specifyKey, '')}
                  onChange={(e) => handleFieldChange(section, item.specifyKey, e.target.value)}
                  error={!!errors[`${section}.${item.specifyKey}`]}
                  helperText={errors[`${section}.${item.specifyKey}`] || `Please specify ${item.label.toLowerCase()}`}
                  size="small"
                />
              </Box>
            );
          })}

          {/* Special success message for Agri-Youth */}
          {section === 'agriYouthActivities' && getActivityValue(section, 'is_agri_youth') && fieldGroupKey === 'additional' && (
            <Alert severity="success" sx={{ mt: 3, borderRadius: 2 }}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
              Welcome, Agri-Youth! 🌱 You're the future of agriculture.
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }, [getActivityValue, handleFieldChange]);

  // Render content based on selected category
  const renderTabContent = useCallback(() => {
    const currentId = formData?.farmProfile?.livelihood_category_id;
    const config = ACTIVITY_CONFIGS[currentId];
    
    if (!config) return null;

    const IconComponent = config.icon;

    return (
      <Box>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: 64, 
            height: 64, 
            bgcolor: `${config.color}.main`, 
            borderRadius: '50%',
            mb: 2
          }}>
            <IconComponent sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Typography variant="h4" fontWeight="600" color={`${config.color}.main`} gutterBottom>
            {config.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {config.subtitle}
          </Typography>
        </Box>

        {Object.entries(config.fields).map(([fieldGroupKey, fieldGroup]) =>
          renderFieldGroup(config, fieldGroupKey, fieldGroup)
        )}
      </Box>
    );
  }, [formData?.farmProfile?.livelihood_category_id, renderFieldGroup]);

  // Safety check
  if (!formData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          Form data is not available. Please refresh the page.
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Loading livelihood categories...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 48, 
          height: 48, 
          bgcolor: 'primary.main', 
          borderRadius: '50%',
          mr: 2
        }}>
          <AgricultureIcon sx={{ fontSize: 24, color: 'white' }} />
        </Box>
        <Box>
          <Typography variant="h4" component="h2" fontWeight="bold" color="primary">
            Farm Profile & Livelihood
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select your primary livelihood category and tell us about your activities.
          </Typography>
        </Box>
      </Box>

      {/* Current Selection Display */}
      {formData.farmProfile?.livelihood_category_id && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>Selected:</strong> {enhancedCategories.find(cat => cat.id === formData.farmProfile.livelihood_category_id)?.category_name}
          </Typography>
        </Alert>
      )}

      {/* Error Display for Livelihood Category */}
      {errors['farmProfile.livelihood_category_id'] && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2">
            {errors['farmProfile.livelihood_category_id']}
          </Typography>
        </Alert>
      )}

      {/* Enhanced Livelihood Tabs */}
      <Paper sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            bgcolor: 'background.default',
            '& .MuiTab-root': {
              minHeight: 80,
              textTransform: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 'bold'
              }
            },
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: 2
            }
          }}
        >
          {enhancedCategories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <Tab
                key={category.id}
                icon={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 32, 
                      height: 32, 
                      bgcolor: selectedTab === index ? `${category.color}.main` : 'grey.300',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease'
                    }}>
                      <IconComponent sx={{ fontSize: 18, color: 'white' }} />
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" fontWeight="inherit">
                        {category.category_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {category.description}
                      </Typography>
                    </Box>
                  </Box>
                }
                wrapped
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ minHeight: 400 }}>
        {renderTabContent()}
      </Box>
    </Box>
  );
};

export default FarmProfileSection;