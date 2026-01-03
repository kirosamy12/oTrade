import Strategy from './strategy.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import mongoose from 'mongoose';

const createStrategy = async (req, res) => {
  try {
    const { level, plans, contentUrl, requiredPlan, translations } = req.body;
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Validate contentUrl if provided
    if (contentUrl) {
      const urlValidation = validateContentUrl(contentUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: urlValidation.error });
      }
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Create strategy with new fields
    const strategyData = {};
    
    // Use plans as primary field (single source of truth)
    if (plans !== undefined) {
      strategyData.plans = plans;
    }
    
    // Set level if provided
    if (level !== undefined) {
      strategyData.level = level;
    }
    
    // Set contentUrl if provided
    if (contentUrl !== undefined) {
      strategyData.contentUrl = contentUrl;
    }
    
    // Legacy support: if requiredPlan provided but no plans, use it
    if (requiredPlan !== undefined && plans === undefined) {
      strategyData.requiredPlan = requiredPlan;
    }
    
    const strategy = new Strategy(strategyData);
    await strategy.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'strategy',
      strategy._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'strategy',
      strategy._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations for response
    const createdTranslations = await getTranslationsByEntity('strategy', strategy._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(strategy, createdTranslations);
    
    res.status(201).json({
      message: 'Strategy created successfully.',
      strategy: response
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, plans, contentUrl, requiredPlan, translations } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }
    
    // Validate contentUrl if provided
    if (contentUrl) {
      const urlValidation = validateContentUrl(contentUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: urlValidation.error });
      }
    }
    
    // Find strategy
    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }
    
    // Update strategy fields
    if (level !== undefined) strategy.level = level;
    if (plans !== undefined) strategy.plans = plans;
    if (contentUrl !== undefined) strategy.contentUrl = contentUrl;
    if (requiredPlan !== undefined && plans === undefined) strategy.requiredPlan = requiredPlan;
    
    await strategy.save();
    
    // Update translations if provided
    if (translations && Array.isArray(translations)) {
      for (const translation of translations) {
        await createOrUpdateTranslation(
          'strategy',
          strategy._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations for response
    const updatedTranslations = await getTranslationsByEntity('strategy', strategy._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(strategy, updatedTranslations);
    
    res.status(200).json({
      message: 'Strategy updated successfully.',
      strategy: response
    });
  } catch (error) {
    console.error('Error updating strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }
    
    // Find strategy
    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'strategy',
      entityId: id
    });
    
    // Delete strategy
    await Strategy.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Strategy deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find().sort({ createdAt: -1 });
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for each strategy with access control
    const strategiesWithTranslations = await Promise.all(
      strategies.map(async (strategy) => {
        const translations = await getTranslationsByEntity('strategy', strategy._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          strategy,
          translations,
          req.lang || 'en',
          userPlans,
          isAdmin
        );
        
        // Add strategy-specific fields
        if (strategy.level) content.level = strategy.level;
        if (isAdmin && strategy.plans) content.plans = strategy.plans;
        
        return content;
      })
    );
    
    res.status(200).json({
      strategies: strategiesWithTranslations
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getStrategyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }
    
    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for the strategy
    const translations = await getTranslationsByEntity('strategy', strategy._id);
    
    // Use formatContentResponse with access control
    const response = formatContentResponse(
      strategy,
      translations,
      req.lang || 'en',
      userPlans,
      isAdmin
    );
    
    // Add strategy-specific fields
    if (strategy.level) response.level = strategy.level;
    if (isAdmin && strategy.plans) response.plans = strategy.plans;
    
    res.status(200).json({
      strategy: response
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createStrategy, updateStrategy, deleteStrategy, getAllStrategies, getStrategyById };