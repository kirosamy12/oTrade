import cloudinary from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string|Buffer|object} imageSource - Path to the image file, base64 data URL, or file object from multer
 * @param {string} folder - Folder name in Cloudinary to store the image
 * @returns {Promise<string>} - Cloudinary URL of the uploaded image
 */
const uploadImage = async (imageSource, folder = 'courses') => {
  try {
    // Handle different input types
    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 630, crop: 'limit' }
      ]
    };

    if (typeof imageSource === 'string') {
      // Handle file path or base64 data URL
      const result = await cloudinary.v2.uploader.upload(imageSource, uploadOptions);
      return result.secure_url;
    } else if (imageSource instanceof Buffer) {
      // Handle buffer from memory storage using promise wrapper
      return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          uploadOptions, // Keep as 'image' resource type
          (error, result) => {
            if (error) {
              console.error('Error uploading buffer to Cloudinary:', error);
              reject(new Error('Failed to upload image to Cloudinary'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(imageSource);
      });
    } else if (imageSource && typeof imageSource === 'object' && imageSource.buffer) {
      // Handle multer file object with buffer
      return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Error uploading buffer to Cloudinary:', error);
              reject(new Error('Failed to upload image to Cloudinary'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(imageSource.buffer);
      });
    } else {
      throw new Error('Invalid image source provided');
    }
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

const uploadFile = async (fileSource, folder = 'files') => {
  try {
    // Handle different input types
    const uploadOptions = {
      folder: folder,
      resource_type: 'raw'  // Use 'raw' for general file uploads
    };

    if (typeof fileSource === 'string') {
      // Handle file path
      const result = await cloudinary.v2.uploader.upload(fileSource, uploadOptions);
      return result.secure_url;
    } else if (fileSource instanceof Buffer) {
      // Handle buffer from memory storage using promise wrapper
      return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Error uploading buffer to Cloudinary:', error);
              reject(new Error('Failed to upload file to Cloudinary'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(fileSource);
      });
    } else if (fileSource && typeof fileSource === 'object' && fileSource.buffer) {
      // Handle multer file object with buffer
      return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Error uploading buffer to Cloudinary:', error);
              reject(new Error('Failed to upload file to Cloudinary'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(fileSource.buffer);
      });
    } else {
      throw new Error('Invalid file source provided');
    }
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

export { uploadImage, uploadFile, deleteImage, extractPublicId };