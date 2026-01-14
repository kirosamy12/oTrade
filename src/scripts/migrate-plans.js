/**
 * Migration script to convert legacy plan strings to Plan references
 * This script creates Plan documents for existing plan strings and updates content to use requiredPlans
 */

import mongoose from 'mongoose';
import Plan from '../modules/plans/plan.model.js';
import Course from '../modules/courses/course.model.js';
import Psychology from '../modules/psychology/psychology.model.js';
import Webinar from '../modules/webinars/webinar.model.js';

const LEGACY_PLAN_MAPPINGS = {
  free: {
    key: 'free',
    price: 0,
    translations: {
      en: {
        title: 'Free Access',
        description: 'Basic free access to content'
      },
      ar: {
        title: 'وصول مجاني',
        description: 'وصول أساسي مجاني إلى المحتوى'
      }
    }
  },
  pro: {
    key: 'pro',
    price: 29.99,
    translations: {
      en: {
        title: 'Pro Plan',
        description: 'Professional subscription with advanced content'
      },
      ar: {
        title: 'الخطة الاحترافية',
        description: 'اشتراك احترافي بمحتوى متقدم'
      }
    }
  },
  master: {
    key: 'master',
    price: 99.99,
    translations: {
      en: {
        title: 'Master Trader Plan',
        description: 'Complete access to all trading courses and resources'
      },
      ar: {
        title: 'خطة متداول الماستر',
        description: 'وصول كامل لجميع دورات التداول والمصادر'
      }
    }
  },
  otrade: {
    key: 'o_trade',
    price: 49.99,
    translations: {
      en: {
        title: 'O TRADE Plan',
        description: 'Exclusive access to O TRADE content and features'
      },
      ar: {
        title: 'خطة أو تريدينج',
        description: 'وصول حصري لمحتوى أو تريدينج والميزات'
      }
    }
  }
};

async function migrateLegacyPlans() {
  try {
    console.log('Starting plan migration...');

    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to database');
    }

    // Create Plan documents for legacy plans
    console.log('Creating Plan documents for legacy plans...');
    const createdPlans = {};
    
    for (const [legacyKey, planData] of Object.entries(LEGACY_PLAN_MAPPINGS)) {
      let plan = await Plan.findOne({ key: planData.key });
      if (!plan) {
        plan = await Plan.create(planData);
        console.log(`Created plan: ${planData.key}`);
      } else {
        console.log(`Plan already exists: ${planData.key}`);
      }
      createdPlans[legacyKey] = plan._id;
    }

    // Update Courses to use requiredPlans instead of plans
    console.log('Updating Courses...');
    const courses = await Course.find({});
    for (const course of courses) {
      if (course.plans && course.plans.length > 0) {
        const requiredPlanIds = [];
        for (const planName of course.plans) {
          if (createdPlans[planName]) {
            requiredPlanIds.push(createdPlans[planName]);
          }
        }
        if (requiredPlanIds.length > 0) {
          await Course.updateOne(
            { _id: course._id },
            { $set: { requiredPlans: requiredPlanIds } }
          );
          console.log(`Updated course ${course._id} with requiredPlans`);
        }
      }
    }

    // Update Psychology content to use requiredPlans
    console.log('Updating Psychology content...');
    const psychologyItems = await Psychology.find({});
    for (const psychology of psychologyItems) {
      if (psychology.plans && psychology.plans.length > 0) {
        const requiredPlanIds = [];
        for (const planName of psychology.plans) {
          if (createdPlans[planName]) {
            requiredPlanIds.push(createdPlans[planName]);
          }
        }
        if (requiredPlanIds.length > 0) {
          await Psychology.updateOne(
            { _id: psychology._id },
            { $set: { requiredPlans: requiredPlanIds } }
          );
          console.log(`Updated psychology ${psychology._id} with requiredPlans`);
        }
      }
    }

    // Update Webinars to use requiredPlans
    console.log('Updating Webinars...');
    const webinars = await Webinar.find({});
    for (const webinar of webinars) {
      if (webinar.plans && webinar.plans.length > 0) {
        const requiredPlanIds = [];
        for (const planName of webinar.plans) {
          if (createdPlans[planName]) {
            requiredPlanIds.push(createdPlans[planName]);
          }
        }
        if (requiredPlanIds.length > 0) {
          await Webinar.updateOne(
            { _id: webinar._id },
            { $set: { requiredPlans: requiredPlanIds } }
          );
          console.log(`Updated webinar ${webinar._id} with requiredPlans`);
        }
      }
    }

    console.log('Migration completed successfully!');
    console.log('Created Plans:', Object.keys(createdPlans));
    console.log('Note: Legacy fields remain for backward compatibility during transition period.');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from database');
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateLegacyPlans().catch(console.error);
}

export default migrateLegacyPlans;