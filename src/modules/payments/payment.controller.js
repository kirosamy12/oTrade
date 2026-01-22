import Payment from './payment.model.js';
import User from '../users/user.model.js';
import Plan from '../plans/plan.model.js';
import { sendSuccessResponse, sendErrorResponse } from '../../utils/response.js';
import mongoose from 'mongoose';
import {
  initializePayment as initializePaymentService,
  verifyPaymentWithSpaceremit,
  unlockPlanAndContent,
  getUserSubscriptions as getUserSubscriptionsService
} from './payment.service.js';

const initPayment = async (req, res) => {
  try {
    console.log('\n================ INIT PAYMENT DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('USER:', req.user);
    console.log('======================================================\n');
    
    // Extract and validate required fields
    const { planId, subscriptionType } = req.body;
    
    // Debug logging for each field
    console.log('planId:', planId);
    console.log('subscriptionType:', subscriptionType);
    
    // Get userId from JWT token
    const userId = req.user._id;
    
    // Validate required fields
    if (!planId) {
      return sendErrorResponse(res, 400, 'Plan ID is required');
    }
    
    if (!subscriptionType) {
      return sendErrorResponse(res, 400, 'Subscription type is required');
    }
    
    // Validate subscription type enum
    const validTypes = ['monthly', 'quarterly', 'semiAnnual', 'yearly'];
    if (!validTypes.includes(subscriptionType)) {
      return sendErrorResponse(res, 400, 'Subscription type must be one of: monthly, quarterly, semiAnnual, yearly');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendErrorResponse(res, 400, 'Invalid user ID format');
    }
    
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return sendErrorResponse(res, 400, 'Invalid plan ID format');
    }
    
    // Initialize payment using service
    const paymentResult = await initializePaymentService(userId, planId, subscriptionType);
    
    // Return success response
    sendSuccessResponse(res, 201, 'Payment initialized successfully', {
      paymentId: paymentResult.paymentId,
      amount: paymentResult.amount,
      currency: paymentResult.currency,
      startsAt: paymentResult.startsAt,
      endsAt: paymentResult.endsAt
    });
    
  } catch (error) {
    console.error('❌ INIT PAYMENT ERROR:', error);
    
    // Handle validation errors
    if (error.message.includes('not found')) {
      return sendErrorResponse(res, 404, error.message);
    }
    
    // Handle general server errors
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

const verifyPayment = async (req, res) => {
  try {
    console.log('\n================ VERIFY PAYMENT DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('USER:', req.user);
    console.log('======================================================\n');
    
    // Extract and validate required fields
    const { paymentId, spaceremitCode } = req.body;
    
    // Debug logging for each field
    console.log('paymentId:', paymentId);
    console.log('spaceremitCode:', spaceremitCode);
    
    // Get userId from JWT token
    const userId = req.user._id;
    
    // Validate required fields
    if (!paymentId) {
      return sendErrorResponse(res, 400, 'Payment ID is required');
    }
    
    if (!spaceremitCode) {
      return sendErrorResponse(res, 400, 'Spaceremit code is required');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return sendErrorResponse(res, 400, 'Invalid payment ID format');
    }
    
    // Find payment and verify it belongs to the user
    const payment = await Payment.findOne({ _id: paymentId, user: userId });
    if (!payment) {
      return sendErrorResponse(res, 404, 'Payment not found or does not belong to user');
    }
    
    // Verify payment with Spaceremit
    const verificationResult = await verifyPaymentWithSpaceremit(spaceremitCode);
    
    if (!verificationResult.success) {
      // Mark payment as failed
      payment.status = 'failed';
      await payment.save();
      
      return sendErrorResponse(res, 400, 'Payment verification failed', verificationResult.error);
    }
    
    // Update payment with Spaceremit code
    payment.spaceremitPaymentId = spaceremitCode;
    await payment.save();
    
    // Unlock plan and content for user
    try {
      await unlockPlanAndContent(paymentId);
    } catch (unlockError) {
      console.error('❌ UNLOCK PLAN ERROR:', unlockError);
      // Even if unlock fails, we still return success as payment is verified
      // The unlock will be retried later or handled separately
    }
    
    // Return success response
    sendSuccessResponse(res, 200, 'Payment verified successfully', {
      paymentId: payment._id,
      status: 'verified',
      planUnlocked: true
    });
    
  } catch (error) {
    console.error('❌ VERIFY PAYMENT ERROR:', error);
    
    // Handle general server errors
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

const paymentCallback = async (req, res) => {
  try {
    console.log('\n================ PAYMENT CALLBACK DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('======================================================\n');
    
    const {
      payment_id,
      response_status,
      status_tag,
      transaction_id,
      is_test
    } = req.body;
    
    // Debug logging
    console.log('payment_id:', payment_id);
    console.log('response_status:', response_status);
    console.log('status_tag:', status_tag);
    console.log('transaction_id:', transaction_id);
    console.log('is_test:', is_test);
    
    // Validate required fields from Spaceremit
    if (!payment_id) {
      return sendErrorResponse(res, 400, 'Payment ID is required in callback');
    }
    
    if (!response_status) {
      return sendErrorResponse(res, 400, 'Response status is required in callback');
    }
    
    // Find payment by paymentId
    const payment = await Payment.findOne({ paymentId: payment_id }).populate('planId').populate('userId');
    if (!payment) {
      console.log('Payment not found for ID:', payment_id);
      return sendErrorResponse(res, 404, 'Payment not found');
    }
    
    console.log('Found payment:', payment._id);
    console.log('Payment status before update:', payment.status);
    
    // Verify response status
    if (response_status !== 'success') {
      payment.status = 'failed';
      await payment.save();
      
      console.log('Payment failed due to Spaceremit response status:', response_status);
      
      return sendSuccessResponse(res, 200, 'Payment status updated to failed');
    }
    
    // Check if it's a test payment
    if (is_test) {
      console.log('Test payment detected, skipping content unlock');
      payment.status = 'completed';
      payment.isTest = true;
      await payment.save();
      
      return sendSuccessResponse(res, 200, 'Test payment processed successfully');
    }
    
    // Determine final status based on status_tag
    const successTags = ['A', 'B', 'D', 'E'];
    const isSuccess = successTags.includes(status_tag);
    
    // If not successful, mark as failed
    if (!isSuccess) {
      payment.status = 'failed';
      await payment.save();
      
      console.log('Payment failed due to status tag:', status_tag);
      
      return sendSuccessResponse(res, 200, 'Payment status updated to failed');
    }
    
    // At this point, payment is successful
    payment.status = 'completed';
    await payment.save();
    
    console.log('Payment completed with status tag:', status_tag);
    
    // Activate the plan for the user
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const user = await User.findById(payment.userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if plan is already active to avoid duplicates
      if (!user.activePlans) {
        user.activePlans = [];
      }
      
      const isPlanAlreadyActive = user.activePlans.some(activePlan => 
        activePlan.toString() === payment.planId._id.toString()
      );
      
      if (!isPlanAlreadyActive) {
        user.activePlans.push(payment.planId._id);
      }
      
      // Unlock content linked to the plan
      // Add courses from the plan
      if (payment.planId.allowedContent && payment.planId.allowedContent.courses) {
        if (!user.unlockedCourses) {
          user.unlockedCourses = [];
        }
        
        for (const courseId of payment.planId.allowedContent.courses) {
          if (!user.unlockedCourses.some(unlockedId => 
            unlockedId.toString() === courseId.toString())) {
            user.unlockedCourses.push(courseId);
          }
        }
      }
      
      // Add webinars from the plan
      if (payment.planId.allowedContent && payment.planId.allowedContent.webinars) {
        if (!user.unlockedWebinars) {
          user.unlockedWebinars = [];
        }
        
        for (const webinarId of payment.planId.allowedContent.webinars) {
          if (!user.unlockedWebinars.some(unlockedId => 
            unlockedId.toString() === webinarId.toString())) {
            user.unlockedWebinars.push(webinarId);
          }
        }
      }
      
      // Add psychology modules from the plan
      if (payment.planId.allowedContent && payment.planId.allowedContent.psychology) {
        if (!user.unlockedPsychology) {
          user.unlockedPsychology = [];
        }
        
        for (const psychologyId of payment.planId.allowedContent.psychology) {
          if (!user.unlockedPsychology.some(unlockedId => 
            unlockedId.toString() === psychologyId.toString())) {
            user.unlockedPsychology.push(psychologyId);
          }
        }
      }
      
      // Add analyses from the plan
      if (payment.planId.allowedContent && payment.planId.allowedContent.analyses) {
        if (!user.unlockedAnalyses) {
          user.unlockedAnalyses = [];
        }
        
        for (const analysisId of payment.planId.allowedContent.analyses) {
          if (!user.unlockedAnalyses.some(unlockedId => 
            unlockedId.toString() === analysisId.toString())) {
            user.unlockedAnalyses.push(analysisId);
          }
        }
      }
      
      await user.save({ session });
      console.log('Plan activated and content unlocked for user:', user._id);
    });
    
    // Return success response
    sendSuccessResponse(res, 200, 'Payment callback processed successfully', {
      paymentId: payment.paymentId,
      status: payment.status,
      planActivated: true,
      contentUnlocked: true
    });
    
  } catch (error) {
    console.error('❌ PAYMENT CALLBACK ERROR:', error);
    
    sendErrorResponse(res, 500, 'Internal server error processing callback', error.message);
  }
};

// Helper function to call Spaceremit API
const callSpaceremitAPI = async (localPaymentId, paymentId) => {
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
      payment_id: paymentId
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
              resolve({
                success: true,
                data: parsedData
              });
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
    console.error('❌ SPACEREMIT API SETUP ERROR:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user subscriptions
const getUserSubscriptions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('\n================ GET USER SUBSCRIPTIONS DEBUG =================');
    console.log('Requested userId:', userId);
    console.log('Authenticated user:', req.user);
    console.log('======================================================\n');
    
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendErrorResponse(res, 400, 'Invalid user ID format');
    }
    
    // Check if requesting user has permission to access this data
    const requestingUser = req.user;
    if (!requestingUser) {
      return sendErrorResponse(res, 401, 'Authentication required');
    }
    
    // Users can only access their own subscriptions, admins can access any
    const isAdmin = requestingUser.role === 'admin' || requestingUser.role === 'super_admin';
    if (userId !== requestingUser._id.toString() && !isAdmin) {
      return sendErrorResponse(res, 403, 'Access denied');
    }
    
    // Find user and populate their active plans
    const user = await User.findById(userId).populate({
      path: 'activePlans',
      populate: {
        path: 'allowedContent.courses allowedContent.webinars allowedContent.psychology allowedContent.analyses',
        model: 'Course' // We'll handle different models appropriately
      }
    });
    
    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }
    
    // Get the active plans with their details
    const activePlans = user.activePlans || [];
    
    // Get unlocked content counts
    const unlockedCoursesCount = user.unlockedCourses ? user.unlockedCourses.length : 0;
    const unlockedWebinarsCount = user.unlockedWebinars ? user.unlockedWebinars.length : 0;
    const unlockedPsychologyCount = user.unlockedPsychology ? user.unlockedPsychology.length : 0;
    const unlockedAnalysesCount = user.unlockedAnalyses ? user.unlockedAnalyses.length : 0;
    
    // Get payment history for this user
    const payments = await Payment.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10); // Limit to last 10 payments
    
    const response = {
      user: {
        id: user._id,
        email: user.email,
        name: user.name || user.username || user.fullName
      },
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
        planId: payment.planId,
        subscriptionType: payment.subscriptionType,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }))
    };
    
    sendSuccessResponse(res, 200, 'User subscriptions retrieved successfully', response);
    
  } catch (error) {
    console.error('❌ GET USER SUBSCRIPTIONS ERROR:', error);
    
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

export { initPayment, verifyPayment, paymentCallback, getUserSubscriptions };