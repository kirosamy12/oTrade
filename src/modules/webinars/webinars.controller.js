import Webinar from './webinar.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import mongoose from 'mongoose';

const createWebinar = async (req, res) => {
  try {
    const { date, isLive, plans, requiredPlan, translations } = req.body;
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Create webinar with new fields
    const webinarData = {};
    
    // Set date if provided
    if (date !== undefined) {
      webinarData.date = date;
    }
    
    // Set isLive if provided
    if (isLive !== undefined) {
      webinarData.isLive = isLive;
    }
    
    // Use plans as primary field (single source of truth)
    if (plans !== undefined) {
      webinarData.plans = plans;
    }
    
    // Legacy support: if requiredPlan provided but no plans, use it
    if (requiredPlan !== undefined && plans === undefined) {
      webinarData.requiredPlan = requiredPlan;
    }
    
    const webinar = new Webinar(webinarData);
    await webinar.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'webinar',
      webinar._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'webinar',
      webinar._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations for response
    const createdTranslations = await getTranslationsByEntity('webinar', webinar._id);
    
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
      message: 'Webinar created successfully.',
      webinar: {
        id: webinar._id,
        date: webinar.date,
        isLive: webinar.isLive,
        plans: webinar.plans,
        translations: translationsObject,
        createdAt: webinar.createdAt,
        updatedAt: webinar.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateWebinar = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, isLive, plans, requiredPlan, translations } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid webinar ID.' });
    }
    
    // Find webinar
    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found.' });
    }
    
    // Update webinar fields
    if (date !== undefined) webinar.date = date;
    if (isLive !== undefined) webinar.isLive = isLive;
    if (plans !== undefined) webinar.plans = plans;
    if (requiredPlan !== undefined && plans === undefined) webinar.requiredPlan = requiredPlan;
    
    await webinar.save();
    
    // Update translations if provided
    if (translations) {
      const normalized = Array.isArray(translations) ? translations : Object.entries(translations).map(([lang, content]) => ({ language: lang, ...content }));
      
      for (const translation of normalized) {
        await createOrUpdateTranslation(
          'webinar',
          webinar._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations for response
    const updatedTranslations = await getTranslationsByEntity('webinar', webinar._id);
    
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
      message: 'Webinar updated successfully.',
      webinar: {
        id: webinar._id,
        date: webinar.date,
        isLive: webinar.isLive,
        plans: webinar.plans,
        translations: translationsObject,
        createdAt: webinar.createdAt,
        updatedAt: webinar.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteWebinar = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid webinar ID.' });
    }
    
    // Find webinar
    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'webinar',
      entityId: id
    });
    
    // Delete webinar
    await Webinar.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Webinar deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllWebinars = async (req, res) => {
  try {
    const webinars = await Webinar.find().sort({ createdAt: -1 });
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for each webinar with access control
    const webinarsWithTranslations = await Promise.all(
      webinars.map(async (webinar) => {
        const translations = await getTranslationsByEntity('webinar', webinar._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          webinar,
          translations,
          req.lang || 'en',
          userPlans,
          isAdmin
        );
        
        // Add webinar-specific fields
        if (webinar.date) content.date = webinar.date;
        if (webinar.isLive !== undefined) content.isLive = webinar.isLive;
        if (isAdmin && webinar.plans) content.plans = webinar.plans;
        
        return content;
      })
    );
    
    res.status(200).json({
      webinars: webinarsWithTranslations
    });
  } catch (error) {
    console.error('Error fetching webinars:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getWebinarById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid webinar ID.' });
    }
    
    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found.' });
    }
    
    // Get translations for the webinar
    const translations = await getTranslationsByEntity('webinar', webinar._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      webinar,
      translations,
      req.lang || 'en',
      userPlans,
      isAdmin
    );
    
    // Add webinar-specific fields
    if (webinar.date) content.date = webinar.date;
    if (webinar.isLive !== undefined) content.isLive = webinar.isLive;
    if (isAdmin && webinar.plans) content.plans = webinar.plans;
    
    res.status(200).json({
      webinar: content
    });
  } catch (error) {
    console.error('Error fetching webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createWebinar, updateWebinar, deleteWebinar, getAllWebinars, getWebinarById };