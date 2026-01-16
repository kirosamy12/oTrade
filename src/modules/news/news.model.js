import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    enum: ['en', 'ar']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  content: {
    type: String,
    trim: true,
    default: ''
  }
});

const newsSchema = new mongoose.Schema({
  translations: {
    type: [translationSchema],
    required: [true, 'Translations are required'],
    validate: {
      validator: function(translations) {
        const languages = translations.map(t => t.language);
        return languages.includes('en') && languages.includes('ar');
      },
      message: 'Both English and Arabic translations are required'
    }
  },
  image: {
    type: String,
    required: [true, 'Image is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  }
}, {
  timestamps: true
});

export default mongoose.model('News', newsSchema);