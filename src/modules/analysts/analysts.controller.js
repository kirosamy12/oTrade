import Analyst from './analyst.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate } from '../../utils/translationValidator.js';
import mongoose from 'mongoose';

const createAnalyst = async (req, res) => {
  try {
    const { requiredPlan, translations } = req.body;
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Create analyst
    const analyst = new Analyst({
      requiredPlan: requiredPlan || 'free'
    });
    await analyst.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'analyst',
      analyst._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'analyst',
      analyst._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    res.status(201).json({
      message: 'Analyst created successfully.',
      analyst: {
        id: analyst._id,
        requiredPlan: analyst.requiredPlan,
        createdAt: analyst.createdAt,
        updatedAt: analyst.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating analyst:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateAnalyst = async (req, res) => {
  try {
    const { id } = req.params;
    const { requiredPlan, translations } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analyst ID.' });
    }
    
    // Find analyst
    const analyst = await Analyst.findById(id);
    if (!analyst) {
      return res.status(404).json({ error: 'Analyst not found.' });
    }
    
    // Update analyst
    if (requiredPlan !== undefined) analyst.requiredPlan = requiredPlan;
    await analyst.save();
    
    // Update translations if provided
    if (translations && Array.isArray(translations)) {
      for (const translation of translations) {
        await createOrUpdateTranslation(
          'analyst',
          analyst._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    res.status(200).json({
      message: 'Analyst updated successfully.',
      analyst: {
        id: analyst._id,
        requiredPlan: analyst.requiredPlan,
        createdAt: analyst.createdAt,
        updatedAt: analyst.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating analyst:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteAnalyst = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analyst ID.' });
    }
    
    // Find analyst
    const analyst = await Analyst.findById(id);
    if (!analyst) {
      return res.status(404).json({ error: 'Analyst not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'analyst',
      entityId: id
    });
    
    // Delete analyst
    await Analyst.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Analyst deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting analyst:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllAnalysts = async (req, res) => {
  try {
    const analysts = await Analyst.find().sort({ createdAt: -1 });
    
    // Get translations for each analyst and return only the requested language
    const analystsWithTranslations = await Promise.all(
      analysts.map(async (analyst) => {
        const translations = await getTranslationsByEntity('analyst', analyst._id);
        
        // Find the translation matching the requested language, fallback to English
        const requestedTranslation = 
          translations.find(t => t.language === req.lang) ||
          translations.find(t => t.language === 'en');
        
        return {
          id: analyst._id,
          requiredPlan: analyst.requiredPlan,
          title: requestedTranslation ? requestedTranslation.title : '',
          description: requestedTranslation ? requestedTranslation.description : '',
          content: requestedTranslation ? requestedTranslation.content : '',
          createdAt: analyst.createdAt,
          updatedAt: analyst.updatedAt
        };
      })
    );
    
    res.status(200).json({
      analysts: analystsWithTranslations
    });
  } catch (error) {
    console.error('Error fetching analysts:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAnalystById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analyst ID.' });
    }
    
    const analyst = await Analyst.findById(id);
    if (!analyst) {
      return res.status(404).json({ error: 'Analyst not found.' });
    }
    
    // Get translations for the analyst
    const translations = await getTranslationsByEntity('analyst', analyst._id);
    
    // Find the translation matching the requested language, fallback to English
    const requestedTranslation = 
      translations.find(t => t.language === req.lang) ||
      translations.find(t => t.language === 'en');
    
    res.status(200).json({
      analyst: {
        id: analyst._id,
        requiredPlan: analyst.requiredPlan,
        title: requestedTranslation ? requestedTranslation.title : '',
        description: requestedTranslation ? requestedTranslation.description : '',
        content: requestedTranslation ? requestedTranslation.content : '',
        createdAt: analyst.createdAt,
        updatedAt: analyst.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching analyst:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createAnalyst, updateAnalyst, deleteAnalyst, getAllAnalysts, getAnalystById };