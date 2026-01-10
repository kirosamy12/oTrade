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
    required: true
  },
  contentUrl: {
    type: String,
    required: false
  },
  coverImageUrl: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;