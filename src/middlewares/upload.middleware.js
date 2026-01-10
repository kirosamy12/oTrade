import multer from 'multer';

// Use memory storage to avoid local file system
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  // Allow images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
}; 
 
// Create different upload configurations
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Export both single field upload and none for mixed handling
export default upload;
export const uploadWithOptionalImage = upload.fields([{ name: 'coverImage', maxCount: 1 }]);
export const uploadAny = upload.none(); // For requests without files