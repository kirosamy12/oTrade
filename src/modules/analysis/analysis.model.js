import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  market: {
    type: String,
    enum: ['Forex', 'Egyptian Stocks', 'Gulf Stocks', 'Indices', 'Gold', 'BTC'],
    required: false
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
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
  // Legacy field - kept for backward compatibility
  requiredPlan: {
    type: String,
    enum: ['free', 'pro', 'master', 'otrade'],
    default: 'free'
  }
}, {
  timestamps: true
});

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;