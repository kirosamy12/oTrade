import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: [
      'course',
      'strategy',
      'analysis',
      'webinar',
      'psychology',
      'analyst'
    ],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  language: {
    type: String,
    enum: ['ar', 'en'],
    required: true
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  content: {
    type: String
  }
}, {
  timestamps: true
});

// Compound unique index on (entityType, entityId, language)
translationSchema.index({ entityType: 1, entityId: 1, language: 1 }, { unique: true });

const Translation = mongoose.model('Translation', translationSchema);

export default Translation;