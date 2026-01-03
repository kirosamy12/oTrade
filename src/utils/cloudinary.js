import cloudinary from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} imagePath - Path to the image file or base64 data URL
 * @param {string} folder - Folder name in Cloudinary to store the image
 * @returns {Promise<string>} - Cloudinary URL of the uploaded image
 */
const uploadImage = async (imagePath, folder = 'courses') => {
  try {
    const result = await cloudinary.v2.uploader.upload(imagePath, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 630, crop: 'limit' }
      ]
    }); 
    
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image in Cloudinary
 * @returns {Promise<void>}
 */
const deleteImage = async (publicId) => {
  try {
    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw error as it's not critical for the operation
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
const extractPublicId = (url) => {
  if (!url) return null;
  
  // Extract public ID from Cloudinary URL
  const regex = /\/([^\/]+)\/([^\/]+)\.[^\/]+$/;
  const match = url.match(regex);
  
  if (match) {
    // Format: folder/public_id
    return match[1] + '/' + match[2];
  }
  
  return null;
};

export { uploadImage, deleteImage, extractPublicId };