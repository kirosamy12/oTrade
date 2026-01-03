import Analysis from './analysis.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate } from '../../utils/translationValidator.js';
import mongoose from 'mongoose';

const createAnalysis = async (req, res) => {
  try {
    const { market, type, plans, category, requiredPlan, translations } = req.body;
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Create analysis with new fields
    const analysisData = {};
    
    // Set market if provided
    if (market !== undefined) {
      analysisData.market = market;
    }
    
    // Set type if provided
    if (type !== undefined) {
      analysisData.type = type;
    }
    
    // Use plans as primary field (single source of truth)
    if (plans !== undefined) {
      analysisData.plans = plans;
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
    
    // Format translations as object for admin response
    const translationsObject = {};
    createdTranslations.forEach(t => {
      translationsObject[t.language] = {
        title: t.title,
        description: t.description,
        content: t.content
      };
    });
    
    res.status(201).json({
      message: 'Analysis created successfully.',
      analysis: {
        id: analysis._id,
        market: analysis.market,
        type: analysis.type,
        plans: analysis.plans,
        translations: translationsObject,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating analysis:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { market, type, plans, requiredPlan, translations } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analysis ID.' });
    }
    
    // Find analysis
    const analysis = await Analysis.findById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }
    
    // Update analysis fields
    if (market !== undefined) analysis.market = market;
    if (type !== undefined) analysis.type = type;
    if (plans !== undefined) analysis.plans = plans;
    if (requiredPlan !== undefined && plans === undefined) analysis.requiredPlan = requiredPlan;
    
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
    
    // Format translations as object for admin response
    const translationsObject = {};
    updatedTranslations.forEach(t => {
      translationsObject[t.language] = {
        title: t.title,
        description: t.description,
        content: t.content
      };
    });
    
    res.status(200).json({
      message: 'Analysis updated successfully.',
      analysis: {
        id: analysis._id,
        market: analysis.market,
        type: analysis.type,
        plans: analysis.plans,
        translations: translationsObject,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      }
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
    
    // Find the translation matching the requested language, fallback to English
    const requestedTranslation = 
      translations.find(t => t.language === req.lang) ||
      translations.find(t => t.language === 'en');
    
    res.status(200).json({
      analysis: {
        id: analysis._id,
        market: analysis.market,
        type: analysis.type,
        plans: analysis.plans,
        title: requestedTranslation ? requestedTranslation.title : '',
        description: requestedTranslation ? requestedTranslation.description : '',
        content: requestedTranslation ? requestedTranslation.content : '',
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createAnalysis, updateAnalysis, deleteAnalysis, getAllAnalysis, getAnalysisById };