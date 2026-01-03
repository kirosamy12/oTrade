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
  // Legacy field - kept for backward compatibility
  requiredPlan: {
    type: String,
    enum: ['free', 'pro', 'master', 'otrade'],
    default: 'free'
  }
}, {
  timestamps: true
});

const Psychology = mongoose.model('Psychology', psychologySchema);

export default Psychology;