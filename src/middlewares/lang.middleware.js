const detectLanguage = (req, res, next) => {
  const acceptLanguage = req.header('Accept-Language');
  
  // Default to Arabic if no Accept-Language header or it's not English
  if (!acceptLanguage) {
    req.lang = 'ar';
    return next();
  }
  
  // Parse the Accept-Language header and check for Arabic first
  const languages = acceptLanguage.split(',').map(lang => lang.trim().toLowerCase());
  
  // Check for Arabic first (ar or ar-*)
  if (languages.some(lang => lang.includes('ar'))) {
    req.lang = 'ar';
  } else {
    // Default to English
    req.lang = 'en';
  }
  
  next();
};

export { detectLanguage };