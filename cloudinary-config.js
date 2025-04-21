const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Name to use for the file
 * @param {string} folder - Folder to upload to
 * @returns {Promise<object>} - Cloudinary upload result
 */
async function uploadToCloudinary(fileBuffer, fileName, folder = 'logos') {
  try {
    console.log(`Uploading file to Cloudinary: ${fileName}`);
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `logo-${Date.now()}`,
          resource_type: 'auto',
          format: 'png'
        },
        (error, result) => {
          if (error) {
            console.error('Error uploading to Cloudinary:', error);
            reject(error);
          } else {
            console.log('File uploaded to Cloudinary:', result.secure_url);
            resolve(result);
          }
        }
      );
      
      // Convert buffer to stream and pipe to uploadStream
      const { Readable } = require('stream');
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error('Error in uploadToCloudinary:', error);
    throw error;
  }
}

/**
 * Generate a mockup using Cloudinary transformations
 * @param {string} logoUrl - URL of the logo in Cloudinary
 * @param {object} options - Options for the mockup
 * @returns {Promise<string>} - URL of the generated mockup
 */
async function generateMockupWithCloudinary(logoUrl, options = {}) {
  try {
    console.log('Generating mockup with Cloudinary...');
    
    const {
      bgUrl = `${process.env.CLOUDINARY_URL || 'https://res.cloudinary.com/' + process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/backgrounds/default-bg.png`,
      width = 1920,
      height = 1080
    } = options;
    
    // Upload background if it doesn't exist in Cloudinary
    let backgroundUrl = bgUrl;
    if (!bgUrl.includes('cloudinary')) {
      // If background is a local file, upload it to Cloudinary
      const fs = require('fs');
      const path = require('path');
      const defaultBgPath = path.join(__dirname, 'public', 'backgrounds', 'default-bg.png');
      
      if (fs.existsSync(defaultBgPath)) {
        const bgBuffer = fs.readFileSync(defaultBgPath);
        const bgResult = await uploadToCloudinary(bgBuffer, 'default-bg.png', 'backgrounds');
        backgroundUrl = bgResult.secure_url;
      }
    }
    
    // Define positions for slippers and labels
    const slippersCenters = [
      { x: 306, y: 330 }, // Par 1 - Pé Direito
      { x: 487, y: 330 }, // Par 1 - Pé Esquerdo
      { x: 897, y: 330 }, // Par 2 - Pé Direito
      { x: 1077, y: 330 }, // Par 2 - Pé Esquerdo
      { x: 1533, y: 330 }, // Par 3 - Pé Direito
      { x: 1716, y: 330 }, // Par 3 - Pé Esquerdo
      { x: 307, y: 789 }, // Par 4 - Pé Direito
      { x: 487, y: 789 }, // Par 4 - Pé Esquerdo
      { x: 895, y: 789 }, // Par 5 - Pé Direito
      { x: 1077, y: 789 }, // Par 5 - Pé Esquerdo
      { x: 1533, y: 789 }, // Par 6 - Pé Direito
      { x: 1713, y: 789 }, // Par 6 - Pé Esquerdo
    ];

    const labelCenters = [
      { x: 154, y: 367 }, // Etiqueta Par 1
      { x: 738, y: 367 }, // Etiqueta Par 2
      { x: 1377, y: 367 }, // Etiqueta Par 3
      { x: 154, y: 825 }, // Etiqueta Par 4
      { x: 738, y: 825 }, // Etiqueta Par 5
      { x: 1377, y: 825 }, // Etiqueta Par 6
    ];
    
    // Define size limits for chinelos and etiquetas
    const defaultSlipperHeight = 100; // altura padrão para chinelos
    const defaultLabelHeight = 60; // altura padrão para etiquetas
    const maxSlipperWidth = 163; // largura máxima para chinelos
    const maxLabelWidth = 64; // largura máxima para etiquetas
    
    // Create a transformation for the background
    let transformation = [
      { width, height, crop: 'fill' }
    ];
    
    // Add transformations for slippers
    slippersCenters.forEach((center, index) => {
      transformation.push({
        overlay: new URL(logoUrl).pathname.substring(1),
        width: maxSlipperWidth,
        height: defaultSlipperHeight,
        crop: 'fit',
        gravity: 'north_west',
        x: center.x - (maxSlipperWidth / 2),
        y: center.y - (defaultSlipperHeight / 2)
      });
    });
    
    // Add transformations for labels
    labelCenters.forEach((center, index) => {
      transformation.push({
        overlay: new URL(logoUrl).pathname.substring(1),
        width: maxLabelWidth,
        height: defaultLabelHeight,
        crop: 'fit',
        gravity: 'north_west',
        x: center.x - (maxLabelWidth / 2),
        y: center.y - (defaultLabelHeight / 2)
      });
    });
    
    // Generate the mockup URL
    const mockupUrl = cloudinary.url(new URL(backgroundUrl).pathname.substring(1), {
      transformation,
      sign_url: true
    });
    
    console.log('Mockup URL generated:', mockupUrl);
    
    return mockupUrl;
  } catch (error) {
    console.error('Error generating mockup with Cloudinary:', error);
    throw error;
  }
}

/**
 * Save mockup URL to database or metadata
 * @param {string} mockupUrl - URL of the mockup
 * @param {string} email - Email of the user
 * @returns {Promise<string>} - Public URL of the mockup
 */
async function saveMockupUrl(mockupUrl, email) {
  try {
    console.log(`Saving mockup URL for email: ${email}`);
    
    // Generate a unique ID for the mockup
    const mockupId = `mockup-${Date.now()}`;
    
    // In a production environment, you would save this to a database
    // For now, we'll just return the URL
    
    return mockupUrl;
  } catch (error) {
    console.error('Error saving mockup URL:', error);
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  generateMockupWithCloudinary,
  saveMockupUrl
};
