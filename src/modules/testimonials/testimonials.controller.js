import mongoose from 'mongoose';
import Testimonial from './testimonial.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity, deleteTranslationsByEntity } from '../translations/translation.service.js';
import { uploadImage } from '../../utils/cloudinary.js';
import { formatContentResponse, formatAdminResponse } from '../../utils/accessControl.js';

/**
 * Create a new testimonial
 * POST /api/testimonials/create
 * Admin only with testimonials:create permission
 */
export const createTestimonial = async (req, res) => {
  try {
    console.log('=== CREATE TESTIMONIAL DEBUG ===');
    console.log('Request Body:', req.body);
    console.log('Files:', req.files);
    
    let image;
    let translations = [];

    // Handle image upload
    if (req.files?.image) {
      const imageFile = req.files.image[0];
      image = await uploadImage(imageFile, 'testimonials');
    } else if (req.body.image?.startsWith('data:image')) {
      image = await uploadImage(req.body.image, 'testimonials');
    } else {
      image = req.body.image;
    }

    if (!image) {
      return res.status(400).json({ error: 'Image is required.' });
    }

    const { companyName } = req.body;

    if (!companyName?.trim()) {
      return res.status(400).json({ error: 'Company name is required.' });
    }

    // Handle translations
    if (req.body.translations) {
      try {
        translations = typeof req.body.translations === 'string'
          ? JSON.parse(req.body.translations)
          : req.body.translations;
      } catch {
        translations = [];
      }
    } else {
      // Handle nested objects: title, description
      const titles = req.body.title || {};
      const descriptions = req.body.description || {};

      if (titles.en || descriptions.en) {
        translations.push({
          language: 'en',
          title: titles.en?.trim() || '',
          description: descriptions.en?.trim() || ''
        });
      }

      if (titles.ar || descriptions.ar) {
        translations.push({
          language: 'ar',
          title: titles.ar?.trim() || '',
          description: descriptions.ar?.trim() || ''
        });
      }
    }

    console.log('Processed translations:', translations);

    // Validate that both EN and AR translations exist
    const hasEnTranslation = translations.some(t => t.language === 'en' && (t.title || t.description));
    const hasArTranslation = translations.some(t => t.language === 'ar' && (t.title || t.description));

    if (!hasEnTranslation || !hasArTranslation) {
      return res.status(400).json({ 
        error: 'Both English and Arabic translations are required.' 
      });
    }

    // Create testimonial
    const testimonial = new Testimonial({
      image,
      companyName: companyName.trim(),
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    await testimonial.save();

    // Create translations
    for (const translation of translations) {
      await createOrUpdateTranslation(
        'testimonial',
        testimonial._id,
        translation.language,
        translation.title,
        translation.description,
        null // content not used for testimonials
      );
    }

    const createdTranslations = await getTranslationsByEntity('testimonial', testimonial._id);
    
    // Debug log after saving to confirm image URL exists
    console.log('=== TESTIMONIAL SAVE DEBUG ===');
    console.log('Saved testimonial image:', testimonial.image);
    console.log('Saved testimonial company:', testimonial.companyName);
    console.log('Saved testimonial isActive:', testimonial.isActive);
    console.log('Created translations:', createdTranslations);
    
    const response = formatAdminResponse(testimonial, createdTranslations);
    console.log('Formatted response:', JSON.stringify(response, null, 2));

    res.status(201).json({
      message: 'Testimonial created successfully',
      testimonial: response
    });

  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all active testimonials
 * GET /api/testimonials
 * Public endpoint with language support
 */
export const getAllTestimonials = async (req, res) => {
  try {
    console.log('=== GET ALL TESTIMONIALS DEBUG ===');
    console.log('Query params:', req.query);

    // قراءة لغة الهيدر
    const requestedLang = req.get('Accept-Language'); // ممكن يكون 'en' أو 'ar'
    console.log('Requested language:', requestedLang);

    // fetch testimonials المفعلة فقط
    const testimonials = await Testimonial.find({ isActive: true }).sort({ createdAt: -1 });
    console.log('Found testimonials:', testimonials.length);

    const testimonialsWithTranslations = await Promise.all(
      testimonials.map(async (testimonial) => {
        const translations = await getTranslationsByEntity('testimonial', testimonial._id);

        // Format كل الترجمات المتاحة
        const formattedTranslations = {};
        translations.forEach(t => {
          formattedTranslations[t.language] = {
            title: t.title,
            description: t.description
          };
        });

        // لو الهيدر موجود ورغبة في لغة واحدة فقط
        let finalTranslations = formattedTranslations;
        if (requestedLang && formattedTranslations[requestedLang]) {
          finalTranslations = { [requestedLang]: formattedTranslations[requestedLang] };
        }

        return {
          id: testimonial._id,
          translations: finalTranslations,
          companyName: testimonial.companyName,
          image: testimonial.image
        };
      })
    );

    res.status(200).json({
      testimonials: testimonialsWithTranslations
    });

  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



/**
 * Update testimonial
 * PUT /api/testimonials/update/:id
 * Admin only with testimonials:update permission
 */
export const updateTestimonial = async (req, res) => {
  try {
    console.log('=== UPDATE TESTIMONIAL DEBUG ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid testimonial ID.' });
    }

    // Find testimonial
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found.' });
    }

    let image = testimonial.image;
    let translations = [];

    // Handle image update
    if (req.files?.image) {
      const imageFile = req.files.image[0];
      image = await uploadImage(imageFile, 'testimonials');
    } else if (req.body.image?.startsWith('data:image')) {
      image = await uploadImage(req.body.image, 'testimonials');
    } else if (req.body.image !== undefined) {
      image = req.body.image;
    }

    // Update testimonial fields
    testimonial.image = image;
    if (req.body.companyName !== undefined) {
      testimonial.companyName = req.body.companyName.trim();
    }
    if (req.body.isActive !== undefined) {
      // Convert string to boolean properly
      testimonial.isActive = req.body.isActive === true || 
                           req.body.isActive === 'true' || 
                           req.body.isActive === '1' || 
                           req.body.isActive === 'on';
    }

    await testimonial.save();

    // Handle translations update if provided
    if (req.body.translations || req.body.title || req.body.description) {
      if (req.body.translations) {
        try {
          translations = typeof req.body.translations === 'string'
            ? JSON.parse(req.body.translations)
            : req.body.translations;
        } catch {
          translations = [];
        }
      } else {
        // Handle nested objects: title, description
        const titles = req.body.title || {};
        const descriptions = req.body.description || {};

        if (titles.en || descriptions.en) {
          translations.push({
            language: 'en',
            title: titles.en?.trim() || '',
            description: descriptions.en?.trim() || ''
          });
        }

        if (titles.ar || descriptions.ar) {
          translations.push({
            language: 'ar',
            title: titles.ar?.trim() || '',
            description: descriptions.ar?.trim() || ''
          });
        }
      }

      // Update translations if provided
      if (translations.length > 0) {
        for (const translation of translations) {
          await createOrUpdateTranslation(
            'testimonial',
            testimonial._id,
            translation.language,
            translation.title,
            translation.description,
            null
          );
        }
      }
    }

    // Fetch updated translations
    const updatedTranslations = await getTranslationsByEntity('testimonial', testimonial._id);
    
    // Create response with all required fields
    const response = formatAdminResponse(testimonial, updatedTranslations);
    
    // Ensure image is included in response (should be handled by formatAdminResponse)
    console.log('=== UPDATE RESPONSE DEBUG ===');
    console.log('Response image:', response.image);
    console.log('Response structure:', JSON.stringify(response, null, 2));

    res.status(200).json({
      message: 'Testimonial updated successfully',
      testimonial: response
    });

  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
 
/**
 * Delete testimonial
 * DELETE /api/testimonials/delete/:id
 * Admin only with testimonials:delete permission
 */
export const deleteTestimonial = async (req, res) => {
  try {
    console.log('=== DELETE TESTIMONIAL DEBUG ===');
    console.log('Params:', req.params);

    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid testimonial ID.' });
    }

    // Find testimonial
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found.' });
    }

    // Delete associated translations
    await deleteTranslationsByEntity('testimonial', id);

    // Delete testimonial
    await Testimonial.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Testimonial deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
