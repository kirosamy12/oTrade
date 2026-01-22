import Payment from './payment.model.js';
import User from '../users/user.model.js';
import Plan from '../plans/plan.model.js';
import mongoose from 'mongoose';

// Service to initialize a payment
const initializePayment = async (userId, planId, subscriptionType) => {
  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Validate plan exists
  const plan = await Plan.findById(planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  // Validate subscription type and calculate amount
  if (!['monthly', 'quarterly', 'semiAnnual', 'yearly'].includes(subscriptionType)) {
    throw new Error('Invalid subscription type');
  }

  let amount = 0;
  if (plan.subscriptionOptions && plan.subscriptionOptions[subscriptionType]) {
    const subscriptionOption = plan.subscriptionOptions[subscriptionType];
    if (!subscriptionOption.enabled) {
      throw new Error(`Subscription type ${subscriptionType} is not available for this plan`);
    }
    amount = subscriptionOption.price;
  } else {
    throw new Error(`Subscription type ${subscriptionType} is not available for this plan`);
  }

  // Calculate subscription period
  let daysToAdd = 0;
  switch (subscriptionType) {
    case 'monthly':
      daysToAdd = 30;
      break;
    case 'quarterly':
      daysToAdd = 90;
      break;
    case 'semiAnnual':
      daysToAdd = 180;
      break;
    case 'yearly':
      daysToAdd = 365;
      break;
    default:
      daysToAdd = 30; // Default to monthly
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + daysToAdd);

  // Create payment record
  const payment = new Payment({
    user: userId,
    plan: planId,
    subscriptionType,
    amount,
    currency: 'USD',
    status: 'pending',
    startsAt,
    endsAt
  });

  const savedPayment = await payment.save();
  
  return {
    paymentId: savedPayment._id,
    amount: savedPayment.amount,
    currency: savedPayment.currency,
    startsAt: savedPayment.startsAt,
    endsAt: savedPayment.endsAt
  };
};

// Service to verify payment with Spaceremit
const verifyPaymentWithSpaceremit = async (spaceremitCode) => {
  try {
    const spaceremitSecretKey = process.env.SPACEREMIT_SECRET_KEY;
    
    if (!spaceremitSecretKey) {
      throw new Error('SPACEREMIT_SECRET_KEY environment variable not configured');
    }
    
    // Using Node's built-in https module instead of fetch
    const https = await import('https');
    const { URL } = await import('url');
    
    const postData = JSON.stringify({
      private_key: spaceremitSecretKey,
      payment_id: spaceremitCode
    });
    
    const options = {
      hostname: 'spaceremit.com',
      port: 443,
      path: '/api/v2/payment_info/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              // Validate response status and status tag
              if (parsedData.response_status === 'success') {
                const validStatusTags = ['A', 'B', 'D', 'E'];
                if (validStatusTags.includes(parsedData.status_tag)) {
                  resolve({
                    success: true,
                    data: parsedData
                  });
                } else {
                  resolve({
                    success: false,
                    error: `Invalid status tag: ${parsedData.status_tag}. Valid tags: A, B, D, E`
                  });
                }
              } else {
                resolve({
                  success: false,
                  error: `Invalid response status: ${parsedData.response_status}`
                });
              }
            } else {
              resolve({
                success: false,
                error: `Spaceremit API error: ${parsedData.message || res.statusMessage}`
              });
            }
          } catch (parseError) {
            resolve({
              success: false,
              error: 'Failed to parse Spaceremit API response'
            });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ SPACEREMIT API REQUEST ERROR:', error);
        resolve({
          success: false,
          error: error.message
        });
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error('❌ SPACEREMIT VERIFICATION SETUP ERROR:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Service to unlock plan and content for user
const unlockPlanAndContent = async (paymentId) => {
  const session = await mongoose.startSession();
  let payment;
  
  try {
    await session.withTransaction(async () => {
      // Get payment details
      payment = await Payment.findById(paymentId).populate('plan user').session(session);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Check if already processed
      if (payment.status !== 'pending') {
        throw new Error('Payment has already been processed');
      }

      // Get user and plan
      const user = await User.findById(payment.user._id).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      // Update payment status and details
      payment.status = 'paid';
      payment.spaceremitPaymentId = payment.spaceremitPaymentId || `sp_${Date.now()}`;
      payment.startsAt = payment.startsAt || new Date();
      await payment.save({ session });

      // Add plan to user's active plans if not already present
      if (!user.activePlans) {
        user.activePlans = [];
      }
      
      const isPlanAlreadyActive = user.activePlans.some(activePlan => 
        activePlan.toString() === payment.plan._id.toString()
      );
      
      if (!isPlanAlreadyActive) {
        user.activePlans.push(payment.plan._id);
      }

      // Unlock content linked to the plan
      // Add courses from the plan
      if (payment.plan.allowedContent && payment.plan.allowedContent.courses) {
        if (!user.unlockedCourses) {
          user.unlockedCourses = [];
        }
        
        for (const courseId of payment.plan.allowedContent.courses) {
          if (!user.unlockedCourses.some(unlockedId => 
            unlockedId.toString() === courseId.toString())) {
            user.unlockedCourses.push(courseId);
          }
        }
      }
      
      // Add webinars from the plan
      if (payment.plan.allowedContent && payment.plan.allowedContent.webinars) {
        if (!user.unlockedWebinars) {
          user.unlockedWebinars = [];
        }
        
        for (const webinarId of payment.plan.allowedContent.webinars) {
          if (!user.unlockedWebinars.some(unlockedId => 
            unlockedId.toString() === webinarId.toString())) {
            user.unlockedWebinars.push(webinarId);
          }
        }
      }
      
      // Add psychology modules from the plan
      if (payment.plan.allowedContent && payment.plan.allowedContent.psychology) {
        if (!user.unlockedPsychology) {
          user.unlockedPsychology = [];
        }
        
        for (const psychologyId of payment.plan.allowedContent.psychology) {
          if (!user.unlockedPsychology.some(unlockedId => 
            unlockedId.toString() === psychologyId.toString())) {
            user.unlockedPsychology.push(psychologyId);
          }
        }
      }
      
      // Add analyses from the plan
      if (payment.plan.allowedContent && payment.plan.allowedContent.analyses) {
        if (!user.unlockedAnalyses) {
          user.unlockedAnalyses = [];
        }
        
        for (const analysisId of payment.plan.allowedContent.analyses) {
          if (!user.unlockedAnalyses.some(unlockedId => 
            unlockedId.toString() === analysisId.toString())) {
            user.unlockedAnalyses.push(analysisId);
          }
        }
      }

      // Store subscription end date for easy checking
      if (!user.subscriptionEndsAt || user.subscriptionEndsAt < payment.endsAt) {
        user.subscriptionEndsAt = payment.endsAt;
      }

      await user.save({ session });
      console.log('Plan activated and content unlocked for user:', user._id);
    });
    
    return { success: true, payment };
  } catch (error) {
    console.error('❌ UNLOCK PLAN AND CONTENT ERROR:', error);
    throw error;
  } finally {
    await session.endSession();
  }
};

// Service to check if user has active subscription for a plan
const checkUserPlanAccess = async (userId, planId) => {
  const user = await User.findById(userId);
  if (!user) {
    return false;
  }

  // Check if user has the plan in active plans
  if (!user.activePlans) {
    return false;
  }

  const hasActivePlan = user.activePlans.some(activePlan => 
    activePlan.toString() === planId.toString()
  );

  // Also check if subscription hasn't expired
  const now = new Date();
  const isNotExpired = !user.subscriptionEndsAt || user.subscriptionEndsAt > now;

  return hasActivePlan && isNotExpired;
};

// Service to get user's active subscriptions
const getUserSubscriptions = async (userId) => {
  const user = await User.findById(userId).populate({
    path: 'activePlans',
    populate: {
      path: 'allowedContent.courses allowedContent.webinars allowedContent.psychology allowedContent.analyses',
      model: 'Course' // We'll handle different models appropriately
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get the active plans with their details
  const activePlans = user.activePlans || [];

  // Get unlocked content counts
  const unlockedCoursesCount = user.unlockedCourses ? user.unlockedCourses.length : 0;
  const unlockedWebinarsCount = user.unlockedWebinars ? user.unlockedWebinars.length : 0;
  const unlockedPsychologyCount = user.unlockedPsychology ? user.unlockedPsychology.length : 0;
  const unlockedAnalysesCount = user.unlockedAnalyses ? user.unlockedAnalyses.length : 0;

  // Get payment history for this user
  const payments = await Payment.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(10); // Limit to last 10 payments

  // Check if any subscription is still active
  const now = new Date();
  const hasActiveSubscription = !user.subscriptionEndsAt || user.subscriptionEndsAt > now;

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name || user.username || user.fullName
    },
    hasActiveSubscription,
    subscriptionEndsAt: user.subscriptionEndsAt,
    activePlans: activePlans.map(plan => ({
      id: plan._id,
      key: plan.key,
      name: plan.translations?.en?.title || plan.translations?.ar?.title || plan.key,
      price: plan.price,
      subscriptionOptions: plan.subscriptionOptions,
      isActive: true
    })),
    unlockedContent: {
      courses: unlockedCoursesCount,
      webinars: unlockedWebinarsCount,
      psychology: unlockedPsychologyCount,
      analyses: unlockedAnalysesCount
    },
    paymentHistory: payments.map(payment => ({
      id: payment._id,
      planId: payment.plan,
      subscriptionType: payment.subscriptionType,
      amount: payment.amount,
      status: payment.status,
      startsAt: payment.startsAt,
      endsAt: payment.endsAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    }))
  };
};

export {
  initializePayment,
  verifyPaymentWithSpaceremit,
  unlockPlanAndContent,
  checkUserPlanAccess,
  getUserSubscriptions
};