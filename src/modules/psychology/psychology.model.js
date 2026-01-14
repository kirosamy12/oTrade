import mongoose from 'mongoose';

const psychologySchema = new mongoose.Schema({
  plans: {
    type: [String],
    enum: ['free', 'pro', 'master', 'otrade'],
    default: ['free']
  },
  contentUrl: {
    type: String,
    required: false
  },
  coverImageUrl: {
    type: String,
    required: false
  },
  // NEW FIELD: References to required plans
  requiredPlans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }],
  // Legacy field - kept for backward compatibility
  requiredPlan: {
    type: String,
    enum: ['free', 'pro', 'master', 'otrade'],
    default: 'free'
  },
  slug: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

const Psychology = mongoose.model('Psychology', psychologySchema);

export default Psychology;