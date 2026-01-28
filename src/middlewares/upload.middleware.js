import multer from 'multer';

// Use memory storage to avoid local file system
const storage = multer.memoryStorage();

// File filter to allow only images
const imageFilter = (req, file, cb) => {
  // Allow images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter to allow PDF files
const pdfFilter = (req, file, cb) => {
  // Allow PDF files only
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

// Combined file filter for both images and PDFs
const mixedFilter = (req, file, cb) => {
  // Allow both images and PDFs
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed!'), false);
  }
};
 
// Create different upload configurations
const upload = multer({ 
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create upload configurations for different needs
const uploadImages = multer({ 
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadMixed = multer({ 
  storage: storage,
  fileFilter: mixedFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  }
});

// Export both single field upload and none for mixed handling
export default upload;
export const uploadWithOptionalImage = upload.fields([{ name: 'coverImage', maxCount: 1 }]);
export const uploadWebinar = upload.fields([
  { name: 'speakerImage', maxCount: 1 }
]);
export const uploadPsychology = uploadMixed.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'file', maxCount: 1 }  // For PDF uploads in psychology module
]);
export const uploadAny = upload.none(); // For requests without files