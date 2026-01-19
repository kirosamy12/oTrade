import mongoose from 'mongoose';

const psychologySchema = new mongoose.Schema({
  // ===== Free / Paid =====
  isFree: {
    type: Boolean,
    default: false
  },

  plans: {
    type: [String],
    required: function () {
      return !this.isFree; // 👈 لو مش فري لازم plans
    }
  },

  // ===== Content =====
  key: {
    type: String,
    enum: ['book', 'video', 'article'],
    required: true
  },

  contentUrl: String,
  coverImageUrl: String,

  fileUrl: {
    type: String,
    required: function () {
      return this.key === 'book';
    }
  },

  videoUrl: {
    type: String,
    required: function () {
      return this.key === 'video';
    }
  },

  // ===== محسوبة تلقائي =====
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

const Psychology = mongoose.model('Psychology', psychologySchema);

export default Psychology;
