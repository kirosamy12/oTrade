import News from './news.model.js';
import { uploadImage } from '../../utils/cloudinary.js';
import mongoose from 'mongoose';

/**
 * Create a new news item
 * POST /api/news
 */
export const createNews = async (req, res) => {
  try {
    console.log('=== CREATE NEWS DEBUG ===');
    console.log('Request Body:', req.body);
    console.log('Files:', req.files);

    let image;

    // Handle image upload
    if (req.files?.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      image = await uploadImage(imageFile, 'news');
    } else if (req.body.image?.startsWith('data:image')) {
      image = await uploadImage(req.body.image, 'news');
    } else {
      image = req.body.image;
    }

    // Validate required fields
    if (!image) {
      return res.status(400).json({
        message: 'Image is required.'
      });
    }

    let { translations, date } = req.body;

    // Trim date
    if (!date || !date.trim()) {
      return res.status(400).json({ message: 'Date is required.' });
    }
    const newsDate = new Date(date.trim());
    if (isNaN(newsDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format.'
      });
    }

    // 🔥 Normalize translations (Object → Array)
    if (translations && !Array.isArray(translations)) {
      translations = Object.values(translations);
    }

    // Trim all strings in translations
    translations = translations.map(t => ({
      language: t.language?.trim().toLowerCase(),
      title: t.title?.trim(),
      description: t.description?.trim(),
      content: t.content?.trim() || ''
    }));

    // Validate translations
    if (!translations || translations.length === 0) {
      return res.status(400).json({
        message: 'Translations are required.'
      });
    }

    const languages = translations.map(t => t.language);
    if (!languages.includes('en') || !languages.includes('ar')) {
      return res.status(400).json({
        message: 'Both English and Arabic translations are required.'
      });
    }

    // Validate each translation
    for (const translation of translations) {
      if (!translation.language || !['en', 'ar'].includes(translation.language)) {
        return res.status(400).json({
          message: 'Language must be "en" or "ar".'
        });
      }

      if (!translation.title) {
        return res.status(400).json({
          message: `Title is required for ${translation.language} translation.`
        });
      }

      if (!translation.description) {
        return res.status(400).json({
          message: `Description is required for ${translation.language} translation.`
        });
      }
    }

    const news = new News({
      translations,
      image,
      date: newsDate
    });

    await news.save();

    res.status(201).json({
      message: 'News created successfully',
      news
    });

  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};



/**
 * Get all news items
 * GET /api/news
 */
export const getAllNews = async (req, res) => {
  try {
    console.log('=== GET ALL NEWS DEBUG ===');
    console.log('Query params:', req.query);

    const { startDate, endDate } = req.query;

    // Accept-Language header ممكن يكون "en", "ar" أو "ar|en"
    const acceptLangHeader = req.headers['accept-language'] || 'en';
    const acceptLangs = acceptLangHeader
      .split('|')                 // افصل بالـ "|"
      .map(l => l.trim().toLowerCase()) // trim & lowercase
      .filter(Boolean);           // شيل أي فارغ

    let filter = {};

    // Optional date range filtering
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate.trim());
        if (!isNaN(start.getTime())) filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate.trim());
        if (!isNaN(end.getTime())) filter.date.$lte = end;
      }
    }

    const newsItems = await News.find(filter).sort({ date: -1, createdAt: -1 });

    // Map each news to only include requested languages
    const mappedNews = newsItems.map(n => {
      const filteredTranslations = n.translations.filter(t =>
        acceptLangs.includes(t.language)
      );

      // لو مفيش لغة موجودة في requested langs، خلي fallback لأول ترجمة
      return {
        _id: n._id,
        image: n.image,
        date: n.date,
        translations: filteredTranslations.length > 0 ? filteredTranslations : [n.translations[0]]
      };
    });

    res.status(200).json({
      message: 'News retrieved successfully',
      news: mappedNews,
      count: mappedNews.length
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};



/**
 * Get news by ID
 * GET /api/news/:id
 */
export const getNewsById = async (req, res) => {
  try {
    console.log('=== GET NEWS BY ID DEBUG ===');
    console.log('Params:', req.params);

    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid news ID.'
      });
    }

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found.'
      });
    }

    res.status(200).json({
      message: 'News retrieved successfully',
      news
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

/**
 * Update news
 * PATCH /api/news/:id
 */
export const updateNews = async (req, res) => {
  try {
    console.log('=== UPDATE NEWS DEBUG ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid news ID.'
      });
    }

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found.'
      });
    }

    let image = news.image; // Keep existing image if not updated

    // Handle image update if provided
    if (req.files?.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      image = await uploadImage(imageFile, 'news');
    } else if (req.body.image?.startsWith('data:image')) {
      image = await uploadImage(req.body.image, 'news');
    } else if (req.body.image !== undefined) {
      image = req.body.image;
    }

    const updateData = {};

    // Update translations if provided
    if (req.body.translations !== undefined) {
      let { translations } = req.body;

      // 🔥 Normalize translations (Object → Array)
      if (translations && !Array.isArray(translations)) {
        translations = Object.values(translations);
      }

      // Trim all fields in translations
      translations = translations.map(t => ({
        language: t.language?.trim().toLowerCase(),
        title: t.title?.trim(),
        description: t.description?.trim(),
        content: t.content?.trim() || ''
      }));

      // Validate translations
      if (!translations || translations.length === 0) {
        return res.status(400).json({ message: 'Translations are required.' });
      }

      const languages = translations.map(t => t.language);
      if (!languages.includes('en') || !languages.includes('ar')) {
        return res.status(400).json({
          message: 'Both English and Arabic translations are required.'
        });
      }

      for (const translation of translations) {
        if (!translation.language || !['en', 'ar'].includes(translation.language)) {
          return res.status(400).json({
            message: 'Language must be "en" or "ar".'
          });
        }

        if (!translation.title) {
          return res.status(400).json({
            message: `Title is required for ${translation.language} translation.`
          });
        }

        if (!translation.description) {
          return res.status(400).json({
            message: `Description is required for ${translation.language} translation.`
          });
        }
      }

      updateData.translations = translations;
    }

    // Update date if provided
    if (req.body.date !== undefined) {
      if (!req.body.date || !req.body.date.trim()) {
        return res.status(400).json({ message: 'Date is required.' });
      }

      const newsDate = new Date(req.body.date.trim());
      if (isNaN(newsDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format.' });
      }
      updateData.date = newsDate;
    }

    // Update image if exists
    if (image) {
      updateData.image = image;
    }

    const updatedNews = await News.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      message: 'News updated successfully',
      news: updatedNews
    });

  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};


/**
 * Delete news
 * DELETE /api/news/:id
 */
export const deleteNews = async (req, res) => {
  try {
    console.log('=== DELETE NEWS DEBUG ===');
    console.log('Params:', req.params);

    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid news ID.'
      });
    }

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found.'
      });
    }

    await News.findByIdAndDelete(id);

    res.status(200).json({
      message: 'News deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};