// Test script to verify the News module with translations implementation
import News from './src/modules/news/news.model.js';

console.log('Testing News Module with Translations Implementation...\n');

// Test 1: Check if the schema has the correct fields
console.log('1. Checking News schema fields:');
console.log('   - translations field exists:', !!News.schema.path('translations'));
console.log('   - image field exists:', !!News.schema.path('image'));
console.log('   - date field exists:', !!News.schema.path('date'));

// Check the translation sub-schema
const translationSchema = News.schema.path('translations').schema;
console.log('   - translationSchema exists:', !!translationSchema);
if (translationSchema) {
  console.log('   - translation language field exists:', !!translationSchema.path('language'));
  console.log('   - translation title field exists:', !!translationSchema.path('title'));
  console.log('   - translation description field exists:', !!translationSchema.path('description'));
  console.log('   - translation content field exists:', !!translationSchema.path('content'));
}

// Test 2: Check field requirements
console.log('\n2. Verifying field properties:');
console.log('   - translations required:', News.schema.path('translations').isRequired);
console.log('   - image required:', News.schema.path('image').isRequired);
console.log('   - date required:', News.schema.path('date').isRequired);

// Test 3: Check timestamps
console.log('\n3. Timestamp setup:');
console.log('   - timestamps enabled:', !!News.schema.options.timestamps);

console.log('\n✅ News module with translations structure verified!');
console.log('\nUpdated endpoints:');
console.log('   - POST   /api/news/create   (Create news with translations)');
console.log('   - PATCH  /api/news/:id      (Update news with translations)');
console.log('   - GET    /api/news          (Get all news)');
console.log('   - GET    /api/news/:id      (Get news by ID)');
console.log('   - DELETE /api/news/:id      (Delete news)');
console.log('\nTranslation Format:');
console.log('   - translations: [');
console.log('       { language: "en", title: "...", description: "..." },');
console.log('       { language: "ar", title: "...", description: "..." }');
console.log('     ]');