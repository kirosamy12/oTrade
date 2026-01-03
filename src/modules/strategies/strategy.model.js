import mongoose from 'mongoose';

const strategySchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
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

const Strategy = mongoose.model('Strategy', strategySchema);

export default Strategy;