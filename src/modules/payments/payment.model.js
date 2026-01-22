import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: [true, 'Plan ID is required']
  },
  subscriptionType: {
    type: String,
    required: [true, 'Subscription type is required'],
    enum: {
      values: ['monthly', 'quarterly', 'semiAnnual', 'yearly'],
      message: 'Subscription type must be one of: monthly, quarterly, semiAnnual, yearly'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD'
  },
  spaceremitPaymentId: {
    type: String
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  startsAt: {
    type: Date
  },
  endsAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Payment', paymentSchema);