import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
});

const planSchema = new mongoose.Schema({
  key: {
    type: String,
   
    unique: true,
    trim: true,
    lowercase: true
  },
  price: {
    type: Number,
    required: function() {
      // Only require price if subscriptionOptions is not provided
      // OR if subscriptionOptions doesn't have any prices
      return !this.subscriptionOptions ||
        (
          (!this.subscriptionOptions.monthly?.price &&
          !this.subscriptionOptions.yearly?.price)
        );
    },
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  translations: {
    en: {
      type: translationSchema,
      required: true
    },
    ar: {
      type: translationSchema,
      required: true
    }
  },
  allowedContent: {
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    psychology: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Psychology' }],
    webinars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Webinar' }]
  },
  // NEW FIELDS: durationType and features
  durationType: {
    type: String,
    enum: ['monthly', 'quarterly', 'semiAnnual', 'yearly'],
    default: 'monthly'
  },
  features: {
    type: [{
      en: String,
      ar: String
    }],
    default: []
  },
  // NEW FIELD: subscriptionOptions
  subscriptionOptions: {
    monthly: {
      price: Number,
      enabled: {
        type: Boolean,
        default: true
      }
    },
    quarterly: {
      price: Number,
      enabled: {
        type: Boolean,
        default: false
      }
    },
    semiAnnual: {
      price: Number,
      enabled: {
        type: Boolean,
        default: false
      }
    },
    yearly: {
      price: Number,
      enabled: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Plan', planSchema);
