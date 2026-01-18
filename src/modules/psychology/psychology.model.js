import mongoose from 'mongoose';

const psychologySchema = new mongoose.Schema({
  // Content type key (book, video, article)
  key: {
    type: String,
    required: [true, 'Key is required'],
    enum: {
      values: ['book', 'video', 'article'],
      message: 'Key must be one of: book, video, article'
    }
  },
  
  // Common fields for all types
  plans: {
    type: [String],
    required: [true, 'Plans array is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  coverImageUrl: {
    type: String,
    required: false
  },
  
  // Type-specific fields
  fileUrl: {
    type: String,
    required: function() {
      return this.key === 'book';
    }
  },
  videoUrl: {
    type: String,
    required: function() {
      return this.key === 'video';
    }
  },
  
  // Legacy fields for backward compatibility
  contentUrl: {
    type: String,
    required: false
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