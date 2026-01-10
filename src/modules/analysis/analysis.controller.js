import Analysis from './analysis.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import mongoose from 'mongoose';

const createAnalysis = async (req, res) => {
  try {
    // Handle FormData request
    let market, type, plans, category, requiredPlan, translations, contentUrl, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse market, type, category, requiredPlan from FormData
      market = req.body.market;
      type = req.body.type;
      category = req.body.category;
      requiredPlan = req.body.requiredPlan;
      
      // Parse plans from FormData (handle both single value, array, and multiple entries like plans[])
      if (req.body.plans !== undefined) {
        if (Array.isArray(req.body.plans)) {
          // Handle multiple plans[] entries or already formed array
          plans = req.body.plans.filter(p => p !== ''); // Remove empty values
        } else {
          // Handle single plan value
          plans = [req.body.plans].filter(p => p !== ''); // Remove empty values
        }
      } else if (req.body['plans[]'] !== undefined) {
        // Handle case where plans are sent as 'plans[]' in FormData
        if (Array.isArray(req.body['plans[]'])) {
          plans = req.body['plans[]'].filter(p => p !== ''); // Remove empty values
        } else {
          plans = [req.body['plans[]']].filter(p => p !== ''); // Remove empty values
        }
      }
      
      // Parse contentUrl if provided
      contentUrl = req.body.contentUrl;
      
      // Parse translations from FormData
      if (req.body.translations) {
        if (typeof req.body.translations === 'string') {
          try {
            // If it's a JSON string, parse it
            translations = JSON.parse(req.body.translations);
          } catch (e) {
            // If it's not a JSON string, it might be individual translation fields
            translations = [];
            // Look for translation fields like translations[0], translations[1], etc.
            Object.keys(req.body).forEach(key => {
              if (key.startsWith('translations[')) {
                try {
                  const translation = JSON.parse(req.body[key]);
                  translations.push(translation);
                } catch (e) {
                  // Ignore invalid translation strings
                }
              }
            });
          }
        } else {
          translations = req.body.translations;
        }
      } else {
        // Support the format: title[en], title[ar], description[en], description[ar], content[en], content[ar]
        const enTitle = req.body['title[en]'] || req.body['title.en'];
        const arTitle = req.body['title[ar]'] || req.body['title.ar'];
        const enDescription = req.body['description[en]'] || req.body['description.en'];
        const arDescription = req.body['description[ar]'] || req.body['description.ar'];
        const enContent = req.body['content[en]'] || req.body['content.en'];
        const arContent = req.body['content[ar]'] || req.body['content.ar'];
        
        if (enTitle !== undefined || arTitle !== undefined || 
            enDescription !== undefined || arDescription !== undefined ||
            enContent !== undefined || arContent !== undefined) {
          translations = [];
          
          if (enTitle !== undefined || enDescription !== undefined || enContent !== undefined) {
            translations.push({
              language: 'en',
              title: enTitle || '',
              description: enDescription || '',
              content: enContent || ''
            });
          }
          
          if (arTitle !== undefined || arDescription !== undefined || arContent !== undefined) {
            translations.push({
              language: 'ar',
              title: arTitle || '',
              description: arDescription || '',
              content: arContent || ''
            });
          }
        }
      }
      
      // Upload cover image to Cloudinary
      if (coverImageFile) {
        try {
          coverImageUrl = await uploadImage(coverImageFile, 'analysis');
          // With memory storage, no temporary file cleanup needed
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ market, type, plans, category, requiredPlan, translations, contentUrl, coverImageUrl } = req.body);
      
      // Validate contentUrl if provided
      if (contentUrl) {
        const urlValidation = validateContentUrl(contentUrl);
        if (!urlValidation.valid) {
          return res.status(400).json({ error: urlValidation.error });
        }
      }
      
      // Handle cover image upload if provided as base64
      if (coverImageUrl && coverImageUrl.startsWith('data:image')) {
        try {
          coverImageUrl = await uploadImage(coverImageUrl, 'analysis');
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    }
    
    // Validate input
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ error: 'Plans array is required.' });
    }
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Create analysis with new fields
    const analysisData = {
      plans
    };
    
    // Set market if provided
    if (market !== undefined) {
      analysisData.market = market;
    }
    
    // Set type if provided
    if (type !== undefined) {
      analysisData.type = type;
    }
    
    // Set contentUrl if provided
    if (contentUrl !== undefined) {
      analysisData.contentUrl = contentUrl;
    }
    
    // Set coverImageUrl if provided
    if (coverImageUrl !== undefined) {
      analysisData.coverImageUrl = coverImageUrl;
    }
    
    // Legacy support: if requiredPlan provided but no plans, use it
    if (requiredPlan !== undefined && plans === undefined) {
      analysisData.requiredPlan = requiredPlan;
    }
    
    const analysis = new Analysis(analysisData);
    await analysis.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'analysis',
      analysis._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'analysis',
      analysis._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations for response
    const createdTranslations = await getTranslationsByEntity('analysis', analysis._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(analysis, createdTranslations);
    
    res.status(201).json({
      message: 'Analysis created successfully.',
      analysis: response
    });
  } catch (error) {
    console.error('Error creating analysis:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analysis ID.' });
    }
    
    // Find analysis
    const analysis = await Analysis.findById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }
    
    // Handle FormData request
    let market, type, plans, requiredPlan, translations, contentUrl, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse market, type, requiredPlan from FormData
      market = req.body.market;
      type = req.body.type;
      requiredPlan = req.body.requiredPlan;
      
      // Parse plans from FormData (handle both single value, array, and multiple entries like plans[])
      if (req.body.plans !== undefined) {
        if (Array.isArray(req.body.plans)) {
          // Handle multiple plans[] entries or already formed array
          plans = req.body.plans.filter(p => p !== ''); // Remove empty values
        } else {
          // Handle single plan value
          plans = [req.body.plans].filter(p => p !== ''); // Remove empty values
        }
      } else if (req.body['plans[]'] !== undefined) {
        // Handle case where plans are sent as 'plans[]' in FormData
        if (Array.isArray(req.body['plans[]'])) {
          plans = req.body['plans[]'].filter(p => p !== ''); // Remove empty values
        } else {
          plans = [req.body['plans[]']].filter(p => p !== ''); // Remove empty values
        }
      }
      
      // Parse contentUrl if provided
      contentUrl = req.body.contentUrl;
      
      // Parse translations from FormData
      if (req.body.translations) {
        if (typeof req.body.translations === 'string') {
          try {
            // If it's a JSON string, parse it
            translations = JSON.parse(req.body.translations);
          } catch (e) {
            // If it's not a JSON string, it might be individual translation fields
            translations = [];
            // Look for translation fields like translations[0], translations[1], etc.
            Object.keys(req.body).forEach(key => {
              if (key.startsWith('translations[')) {
                try {
                  const translation = JSON.parse(req.body[key]);
                  translations.push(translation);
                } catch (e) {
                  // Ignore invalid translation strings
                }
              }
            });
          }
        } else {
          translations = req.body.translations;
        }
      }
      
      // Upload cover image to Cloudinary
      if (coverImageFile) {
        try {
          coverImageUrl = await uploadImage(coverImageFile.path, 'analysis');
          // Clean up temporary file after upload
          // Note: In a real implementation, you might want to delete the temp file
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ market, type, plans, requiredPlan, translations, contentUrl, coverImageUrl } = req.body);
      
      // Validate contentUrl if provided
      if (contentUrl) {
        const urlValidation = validateContentUrl(contentUrl);
        if (!urlValidation.valid) {
          return res.status(400).json({ error: urlValidation.error });
        }
      }
      
      // Handle cover image upload if provided as base64
      if (coverImageUrl && coverImageUrl.startsWith('data:image')) {
        try {
          coverImageUrl = await uploadImage(coverImageUrl, 'analysis');
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    }
    
    // Update analysis fields
    if (market !== undefined) analysis.market = market;
    if (type !== undefined) analysis.type = type;
    if (plans !== undefined) {
      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ error: 'Plans array is required and cannot be empty.' });
      }
      analysis.plans = plans;
    }
    if (requiredPlan !== undefined && plans === undefined) analysis.requiredPlan = requiredPlan;
    if (contentUrl !== undefined) analysis.contentUrl = contentUrl;
    if (coverImageUrl !== undefined) analysis.coverImageUrl = coverImageUrl;
    
    await analysis.save();
    
    // Update translations if provided
    if (translations) {
      const normalized = Array.isArray(translations) ? translations : Object.entries(translations).map(([lang, content]) => ({ language: lang, ...content }));
      
      for (const translation of normalized) {
        await createOrUpdateTranslation(
          'analysis',
          analysis._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations for response
    const updatedTranslations = await getTranslationsByEntity('analysis', analysis._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(analysis, updatedTranslations);
    
    res.status(200).json({
      message: 'Analysis updated successfully.',
      analysis: response
    });
  } catch (error) {
    console.error('Error updating analysis:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analysis ID.' });
    }
    
    // Find analysis
    const analysis = await Analysis.findById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'analysis',
      entityId: id
    });
    
    // Delete analysis
    await Analysis.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Analysis deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllAnalysis = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Valid categories
    const validCategories = ['forex', 'egyptian-stocks', 'gulf-stocks', 'indices', 'gold', 'btc'];
    
    let filter = {};
    if (category) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: `Category must be one of: ${validCategories.join(', ')}` });
      }
      // For now, we'll use the category as a filter if it exists in translations
      // In a real implementation, you might want to add a category field to the analysis model
    }
    
    const analysisItems = await Analysis.find().sort({ createdAt: -1 });
    
    // Get translations for each analysis and return only the requested language
    const analysisWithTranslations = await Promise.all(
      analysisItems.map(async (analysis) => {
        const translations = await getTranslationsByEntity('analysis', analysis._id);
        
        // Find the translation matching the requested language, fallback to English
        const requestedTranslation = 
          translations.find(t => t.language === req.lang) ||
          translations.find(t => t.language === 'en');
        
        return {
          id: analysis._id,
          market: analysis.market,
          type: analysis.type,
          plans: analysis.plans,
          title: requestedTranslation ? requestedTranslation.title : '',
          description: requestedTranslation ? requestedTranslation.description : '',
          content: requestedTranslation ? requestedTranslation.content : '',
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt
        };
      })
    );
    
    res.status(200).json({
      analysis: analysisWithTranslations
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAnalysisById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analysis ID.' });
    }
    
    const analysis = await Analysis.findById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }
    
    // Get translations for the analysis
    const translations = await getTranslationsByEntity('analysis', analysis._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.userType === 'admin' && req.role === 'admin';
    const isSuperAdmin = req.userType === 'admin' && req.role === 'super_admin';
    const isAdminUser = isAdmin || isSuperAdmin;
    
    // Get user plans from user object if it exists (regular user)
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      analysis,
      translations,
      req.lang || 'en',
      userPlans,
      isAdminUser
    );
    
    // Add analysis-specific fields
    content.market = analysis.market;
    content.type = analysis.type;
    if (isAdminUser && analysis.plans) content.plans = analysis.plans;
    
    res.status(200).json({
      analysis: content
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createAnalysis, updateAnalysis, deleteAnalysis, getAllAnalysis, getAnalysisById };