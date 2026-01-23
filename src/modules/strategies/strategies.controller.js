import Strategy from './strategy.model.js';
import Plan from '../plans/plan.model.js';
import Translation from '../translations/translation.model.js';

import {
  createOrUpdateTranslation,
  getTranslationsByEntity,
  hasAccess,
  formatContentResponseMultiLang
} from '../translations/translation.service.js';

import {
  validateTranslationsForCreate,
  validateContentUrl
} from '../../utils/translationValidator.js';

import { formatAdminResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import { generateSlug } from '../../utils/translationHelper.js';

import mongoose from 'mongoose';

/* ======================================================
   CREATE STRATEGY
====================================================== */
const createStrategy = async (req, res) => {
  try {
    console.log('\n===== CREATE STRATEGY DEBUG =====');
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
    console.log('================================\n');

    // ===== Parse isFree correctly =====
    const isFree = ['true', true, '1', 1].includes(req.body.isFree);

    let plans = [];
    let videoUrl = '';
    let coverImageUrl = '';
    let translations = [];

    // ===== Plans Logic =====
    if (!isFree) {
      if (req.body.plans) plans = Array.isArray(req.body.plans) ? req.body.plans : [req.body.plans];
      else if (req.body['plans[]']) plans = Array.isArray(req.body['plans[]']) ? req.body['plans[]'] : [req.body['plans[]']];

      plans = plans.map(p => p.toString().trim()).filter(Boolean);

      if (!plans.length)
        return res.status(400).json({ error: 'Plans are required when strategy is not free' });

      const fetchedPlans = await Plan.find({ _id: { $in: plans } });
      if (fetchedPlans.length !== plans.length)
        return res.status(400).json({ error: 'Invalid Plan ID found' });
    }

    // ===== Video URL =====
    videoUrl = req.body.videoUrl?.trim() || '';
    if (videoUrl) {
      const validation = validateContentUrl(videoUrl);
      if (!validation.valid)
        return res.status(400).json({ error: validation.error });
    }

    // ===== Cover Image =====
    if (req.files?.coverImage) {
      coverImageUrl = await uploadImage(req.files.coverImage[0], 'strategies');
    } else {
      coverImageUrl = req.body.coverImageUrl || '';
    }

    // ===== Translations =====
    const titles = req.body.title || {};
    const descriptions = req.body.description || {};

    if (titles.en || descriptions.en)
      translations.push({ language: 'en', title: titles.en || '', description: descriptions.en || '' });

    if (titles.ar || descriptions.ar)
      translations.push({ language: 'ar', title: titles.ar || '', description: descriptions.ar || '' });

    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const { en, ar } = validation.data;
    const slug = en?.title ? generateSlug(en.title) : undefined;

    // ===== Payment Flags =====
    let isPaid = false;
    let isInSubscription = false;

    if (!isFree) {
      const plansData = await Plan.find({ _id: { $in: plans } });
      isInSubscription = plansData.some(plan =>
        plan.subscriptionOptions &&
        Object.values(plan.subscriptionOptions).some(opt => opt?.price > 0)
      );
      isPaid = plansData.some(plan => plan.price > 0) || isInSubscription;
    }

    // ===== Create Strategy =====
    const strategy = new Strategy({
      isFree,
      plans: isFree ? [] : plans,
      videoUrl,
      coverImageUrl,
      slug,
      isPaid,
      isInSubscription
    });

    await strategy.save();

    // ===== Save Translations =====
    await createOrUpdateTranslation('strategy', strategy._id, 'en', en.title, en.description);
    await createOrUpdateTranslation('strategy', strategy._id, 'ar', ar.title, ar.description);

    // ===== Link Strategy to Plans =====
    if (!isFree) {
      for (const planId of plans) {
        const plan = await Plan.findById(planId);
        if (plan) {
          // حماية ضد undefined
          plan.allowedContent = plan.allowedContent || {};
          plan.allowedContent.strategies = plan.allowedContent.strategies || [];

          if (!plan.allowedContent.strategies.includes(strategy._id)) {
            plan.allowedContent.strategies.push(strategy._id);
            await plan.save();
          }
        }
      }
    }

    const createdTranslations = await getTranslationsByEntity('strategy', strategy._id);
    const response = formatAdminResponse(strategy, createdTranslations);

    return res.status(201).json({
      message: 'Strategy created successfully',
      strategy: response
    });

  } catch (error) {
    console.error('CREATE STRATEGY ERROR:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



/* ======================================================
   GET ALL STRATEGIES
====================================================== */
const getAllStrategies = async (req, res) => {
  try {
    const requestedLangs = (req.get('Accept-Language') || 'en')
      .split(/[,|\s]/)
      .map(l => l.trim())
      .filter(Boolean);

    const strategies = await Strategy.find().sort({ createdAt: -1 });

    const isAdmin =
      req.user && ['admin', 'super_admin'].includes(req.user.role);

    const userPlans =
      req.user && req.user.activePlans ? req.user.activePlans : ['free'];

    const response = await Promise.all(
      strategies.map(async strategy => {
        const translations = await getTranslationsByEntity('strategy', strategy._id);

        const content = formatContentResponseMultiLang(
          strategy,
          translations,
          requestedLangs,
          userPlans,
          isAdmin
        );

        content.coverImageUrl = strategy.coverImageUrl;
        content.videoUrl = strategy.videoUrl;

        return content;
      })
    );

    res.status(200).json({ strategies: response });
  } catch (error) {
    console.error('GET STRATEGIES ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* ======================================================
   GET STRATEGY BY ID
====================================================== */
const getStrategyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'Invalid strategy ID' });

    const requestedLang = req.get('Accept-Language') || 'en';
    const strategy = await Strategy.findById(id);
    if (!strategy)
      return res.status(404).json({ error: 'Strategy not found' });

    const translations = await getTranslationsByEntity('strategy', strategy._id);
    const translation =
      translations.find(t => t.language === requestedLang) ||
      translations.find(t => t.language === 'en') ||
      translations[0];

    const isAdmin =
      req.user && ['admin', 'super_admin'].includes(req.user.role);

    /* ===== FREE ===== */
    if (!strategy.isPaid) {
      return res.status(200).json({
        strategy: {
          id: strategy._id,
          title: translation?.title || '',
          description: translation?.description || '',
          coverImageUrl: strategy.coverImageUrl,
          videoUrl: strategy.videoUrl,
          locked: false
        }
      });
    }

    /* ===== PAID ===== */
    if (!req.user)
      return res.status(401).json({ error: 'Authentication required' });

    if (isAdmin) {
      return res.status(200).json({
        strategy: {
          id: strategy._id,
          title: translation?.title || '',
          description: translation?.description || '',
          coverImageUrl: strategy.coverImageUrl,
          videoUrl: strategy.videoUrl,
          locked: false
        }
      });
    }

    const hasAccess = strategy.plans.some(planId =>
      req.user.activePlans?.some(p => p.toString() === planId.toString())
    );

    if (hasAccess) {
      return res.status(200).json({
        strategy: {
          id: strategy._id,
          title: translation?.title || '',
          description: translation?.description || '',
          coverImageUrl: strategy.coverImageUrl,
          videoUrl: strategy.videoUrl,
          locked: false
        }
      });
    }

    return res.status(200).json({
      strategy: {
        id: strategy._id,
        title: translation?.title || '',
        description: translation?.description || '',
        coverImageUrl: strategy.coverImageUrl,
        locked: true
      }
    });

  } catch (error) {
    console.error('GET STRATEGY ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const getFreeStrategies = async (req, res) => {
  try {
    console.log('\n================ GET FREE STRATEGIES DEBUG =================');
    console.log('Accept-Language:', req.get('Accept-Language'));
    console.log('User:', req.user);
    console.log('===========================================================\n');

    const requestedLang = req.get('Accept-Language') || 'en';

    const strategies = await Strategy.find({
      $or: [
        { isFree: true },
        { plans: { $exists: true, $size: 0 } },
        { plans: { $eq: null } },
        { isPaid: false }
      ]
    }).sort({ createdAt: -1 });

    const isAdmin =
      req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

    const userPlans =
      req.user && req.user.activePlans ? req.user.activePlans : [];

    const strategiesWithTranslations = await Promise.all(
      strategies.map(async (strategy) => {
        const translations = await getTranslationsByEntity('strategy', strategy._id);

        const content = formatContentResponseMultiLang(
          strategy,
          translations,
          requestedLang,
          userPlans,
          isAdmin
        );

        content.locked = false;

        if (!isAdmin && content.plans) {
          delete content.plans;
        }

        return content;
      })
    );

    res.status(200).json({
      strategies: strategiesWithTranslations
    });
  } catch (error) {
    console.error('Error fetching free strategies:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
const getPaidStrategies = async (req, res) => {
  try {
    console.log('\n================ GET PAID STRATEGIES CATALOG DEBUG =================');
    console.log('Accept-Language:', req.get('Accept-Language'));
    console.log('User:', req.user);
    console.log('===============================================================\n');

    const requestedLang = req.get('Accept-Language') || 'en';
    const isAdmin =
      req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    const userPlans = req.user && req.user.activePlans ? req.user.activePlans : [];

    const strategies = await Strategy.find({
      isPaid: true,
      plans: { $exists: true, $ne: [], $not: { $size: 0 } }
    }).sort({ createdAt: -1 });

    const strategiesCatalog = await Promise.all(
      strategies.map(async (strategy) => {
        const translations = await getTranslationsByEntity('strategy', strategy._id);

        const translation =
          translations.find(t => t.language === requestedLang) ||
          translations.find(t => t.language === 'en') ||
          translations[0];

        const userHasAccess = isAdmin || hasAccess(userPlans, strategy.plans);

        return {
          id: strategy._id,
          title: translation?.title || '',
          description: translation?.description || '',
          coverImageUrl: strategy.coverImageUrl , // تظهر الصورة فقط لو عنده صلاحية
          videoUrl: userHasAccess ? strategy.videoUrl || '' : '',           // يظهر الفيديو فقط لو عنده صلاحية
          isPaid: true,
          locked: !userHasAccess
        };
      })
    );

    res.status(200).json({
      strategies: strategiesCatalog
    });
  } catch (error) {
    console.error('Error fetching paid strategies catalog:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};



const updateStrategy = async (req, res) => {
  try {
    console.log('\n===== UPDATE STRATEGY DEBUG =====');
    console.log('PARAMS:', req.params);
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
    console.log('================================\n');

    const { id } = req.params;

    // ===== Validate ObjectId =====
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }

    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }

    // ===== isFree =====
    const isFree =
      req.body.isFree === true ||
      req.body.isFree === 'true';

    // ===== Plans =====
    let plans = strategy.plans;

    if (!isFree) {
      if (req.body.plans) {
        plans = Array.isArray(req.body.plans)
          ? req.body.plans
          : [req.body.plans];
      } else if (req.body['plans[]']) {
        plans = Array.isArray(req.body['plans[]'])
          ? req.body['plans[]']
          : [req.body['plans[]']];
      }

      plans = plans.map(p => p.toString().trim()).filter(Boolean);

      if (!plans.length) {
        return res.status(400).json({ error: 'Plans are required when strategy is not free' });
      }

      const fetchedPlans = await Plan.find({ _id: { $in: plans } });
      if (fetchedPlans.length !== plans.length) {
        return res.status(400).json({ error: 'Invalid Plan ID found' });
      }
    } else {
      plans = [];
    }

    // ===== Video URL =====
    if (req.body.videoUrl !== undefined) {
      strategy.videoUrl = req.body.videoUrl?.trim() || '';
    }

    // ===== Content URL (optional) =====
    if (req.body.contentUrl !== undefined) {
      strategy.contentUrl = req.body.contentUrl?.trim() || '';
    }

    // ===== Cover Image =====
    if (req.files?.coverImage) {
      strategy.coverImageUrl = await uploadImage(req.files.coverImage[0], 'strategies');
    } else if (req.body.coverImageUrl?.startsWith('data:image')) {
      strategy.coverImageUrl = await uploadImage(req.body.coverImageUrl, 'strategies');
    } else if (req.body.coverImageUrl !== undefined) {
      strategy.coverImageUrl = req.body.coverImageUrl;
    }

    // ===== Translations =====
    const { title, description } = req.body;

    if (title || description) {
      // EN
      if (title?.en || description?.en) {
        await Translation.findOneAndUpdate(
          { entityType: 'strategy', entityId: id, language: 'en' },
          {
            title: title?.en,
            description: description?.en
          },
          { new: true, upsert: true }
        );
      }

      // AR
      if (title?.ar || description?.ar) {
        await Translation.findOneAndUpdate(
          { entityType: 'strategy', entityId: id, language: 'ar' },
          {
            title: title?.ar,
            description: description?.ar
          },
          { new: true, upsert: true }
        );
      }
    }

    // ===== Payment Flags =====
    let isPaid = false;
    let isInSubscription = false;

    if (!isFree) {
      const plansData = await Plan.find({ _id: { $in: plans } });

      isInSubscription = plansData.some(plan =>
        plan.subscriptionOptions &&
        (
          plan.subscriptionOptions.monthly?.price > 0 ||
          plan.subscriptionOptions.quarterly?.price > 0 ||
          plan.subscriptionOptions.semiAnnual?.price > 0 ||
          plan.subscriptionOptions.yearly?.price > 0
        )
      );

      isPaid = plansData.some(plan => plan.price > 0) || isInSubscription;
    }

    // ===== Update Strategy =====
    strategy.isFree = isFree;
    strategy.plans = plans;
    strategy.isPaid = isPaid;
    strategy.isInSubscription = isInSubscription;

    await strategy.save();

    res.status(200).json({
      message: 'Strategy updated successfully'
    });

  } catch (error) {
    console.error('UPDATE STRATEGY ERROR:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;

    // ===== Validate ObjectId =====
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }

    // ===== Find strategy =====
    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }

    // ===== Delete translations =====
    await Translation.deleteMany({
      entityType: 'strategy',
      entityId: id
    });

    // ===== Remove strategy from plans =====
    await Plan.updateMany(
      { 'allowedContent.strategies': id },
      { $pull: { 'allowedContent.strategies': id } }
    );

    // ===== Delete strategy =====
    await Strategy.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Strategy deleted successfully.'
    });

  } catch (error) {
    console.error('DELETE STRATEGY ERROR:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};



export {
  createStrategy,
  updateStrategy,
  deleteStrategy,
  getAllStrategies,
  getStrategyById,
  getFreeStrategies,
  getPaidStrategies
};

