const detectLanguage = (req, res, next) => {
  const acceptLanguage = req.header('Accept-Language');
  
  // Default to English if no Accept-Language header
  if (!acceptLanguage) {
    req.language = 'en';
    return next();
  }
  
  // Parse the Accept-Language header (simple implementation)
  const languages = acceptLanguage.split(',').map(lang => lang.trim().toLowerCase());
  
  // Check for Arabic first
  if (languages.some(lang => lang.includes('ar'))) {
    req.language = 'ar';
  } else {
    // Default to English
    req.language = 'en';
  }
  
  next();
};

export { detectLanguage };