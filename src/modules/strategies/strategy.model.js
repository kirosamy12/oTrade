import mongoose from 'mongoose';

const strategySchema = new mongoose.Schema({
  isFree: {
    type: Boolean,
    default: false
  },

  plans: {
    type: [String],
    required: function () {
      return !this.isFree;
    }
  },

  coverImageUrl: String,
  videoUrl: String,

  // محسوبة تلقائي
  isPaid: {
    type: Boolean,
    default: false
  },
  isInSubscription: {
    type: Boolean,
    default: false
  },

  slug: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

const Strategy = mongoose.model('Strategy', strategySchema);
export default Strategy;
