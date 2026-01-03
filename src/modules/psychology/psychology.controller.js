import Psychology from './psychology.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import mongoose from 'mongoose';

const createPsychology = async (req, res) => {
  try {
    const { plans, requiredPlan, translations } = req.body;
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Create psychology article with new fields
    const psychologyData = {};
    
    // Use plans as primary field (single source of truth)
    if (plans !== undefined) {
      psychologyData.plans = plans;
    }
    
    // Legacy support: if requiredPlan provided but no plans, use it
    if (requiredPlan !== undefined && plans === undefined) {
      psychologyData.requiredPlan = requiredPlan;
    }
    
    const psychology = new Psychology(psychologyData);
    await psychology.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'psychology',
      psychology._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'psychology',
      psychology._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations for response
    const createdTranslations = await getTranslationsByEntity('psychology', psychology._id);
    
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
      message: 'Psychology article created successfully.',
      psychology: {
        id: psychology._id,
        plans: psychology.plans,
        translations: translationsObject,
        createdAt: psychology.createdAt,
        updatedAt: psychology.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updatePsychology = async (req, res) => {
  try {
    const { id } = req.params;
    const { plans, requiredPlan, translations } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology article ID.' });
    }
    
    // Find psychology article
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology article not found.' });
    }
    
    // Update psychology article fields
    if (plans !== undefined) psychology.plans = plans;
    if (requiredPlan !== undefined && plans === undefined) psychology.requiredPlan = requiredPlan;
    
    await psychology.save();
    
    // Update translations if provided
    if (translations) {
      const normalized = Array.isArray(translations) ? translations : Object.entries(translations).map(([lang, content]) => ({ language: lang, ...content }));
      
      for (const translation of normalized) {
        await createOrUpdateTranslation(
          'psychology',
          psychology._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations for response
    const updatedTranslations = await getTranslationsByEntity('psychology', psychology._id);
    
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
      message: 'Psychology article updated successfully.',
      psychology: {
        id: psychology._id,
        plans: psychology.plans,
        translations: translationsObject,
        createdAt: psychology.createdAt,
        updatedAt: psychology.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deletePsychology = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology article ID.' });
    }
    
    // Find psychology article
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology article not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'psychology',
      entityId: id
    });
    
    // Delete psychology article
    await Psychology.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Psychology article deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllPsychology = async (req, res) => {
  try {
    const psychologyArticles = await Psychology.find().sort({ createdAt: -1 });
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for each psychology article with access control
    const psychologyWithTranslations = await Promise.all(
      psychologyArticles.map(async (psychology) => {
        const translations = await getTranslationsByEntity('psychology', psychology._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          psychology,
          translations,
          req.lang || 'en',
          userPlans,
          isAdmin
        );
        
        // Add admin plans if admin
        if (isAdmin && psychology.plans) content.plans = psychology.plans;
        
        return content;
      })
    );
    
    res.status(200).json({
      psychology: psychologyWithTranslations
    });
  } catch (error) {
    console.error('Error fetching psychology articles:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getPsychologyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology article ID.' });
    }
    
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology article not found.' });
    }
    
    // Get translations for the psychology article
    const translations = await getTranslationsByEntity('psychology', psychology._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      psychology,
      translations,
      req.lang || 'en',
      userPlans,
      isAdmin
    );
    
    // Add admin plans if admin
    if (isAdmin && psychology.plans) content.plans = psychology.plans;
    
    res.status(200).json({
      psychology: content
    });
  } catch (error) {
    console.error('Error fetching psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createPsychology, updatePsychology, deletePsychology, getAllPsychology, getPsychologyById };