import { v2 as cloudinary } from 'cloudinary';
import AppError from '../utils/AppError.js';

// Flag to track if Cloudinary has been configured
let cloudinaryConfigured = false;

// Check if Cloudinary configuration is available
const hasCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  
  return cloudName && apiKey && apiSecret;
};

// Initialize Cloudinary configuration (lazy-loaded)
const initializeCloudinary = () => {
  if (cloudinaryConfigured) {
    return true;
  }
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    cloudinaryConfigured = true;
    console.log('✅ Cloudinary configured successfully');
    return true;
  } else {
    console.error('❌ Missing Cloudinary configuration. Please check environment variables.');
    console.error('Debug - Cloudinary config status:');
    console.error(`  - CLOUDINARY_CLOUD_NAME: ${cloudName ? 'Set' : 'Missing'}`);
    console.error(`  - CLOUDINARY_API_KEY: ${apiKey ? 'Set' : 'Missing'}`);
    console.error(`  - CLOUDINARY_API_SECRET: ${apiSecret ? 'Set' : 'Missing'}`);
    return false;
  }
};

export const getUploadSignature = (req, res, next) => {
  try {
    // Initialize Cloudinary configuration if not already done
    if (!initializeCloudinary()) {
      return next(new AppError('Cloudinary is not properly configured on the server.', 503));
    }
    
    const { folder } = req.body;
    if (!folder) {
        return next(new AppError('A folder must be specified for the upload.', 400));
    }
    
    const timestamp = Math.round((new Date).getTime()/1000);

    const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
        folder: folder
    }, process.env.CLOUDINARY_API_SECRET);

    res.status(200).json({ 
      timestamp, 
      signature, 
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });

  } catch (error) {
     console.error("Error generating Cloudinary signature:", error);
     next(new AppError('Could not generate upload signature.', 500));
  }
};