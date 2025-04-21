const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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
async function uploadToCloudinary(fileBuffer, fileName, folder = "logos") {
  try {
    console.log(`Uploading file to Cloudinary: ${fileName}`);

    // Generate a unique ID for the file
    const publicId = `logo-${Date.now()}`;
    console.log(`Generated public ID: ${publicId}`);

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        public_id: publicId,
        resource_type: "auto",
        format: "png",
        transformation: [
          { background: "transparent", flags: "preserve_transparency" },
        ],
      };

      console.log("Upload options:", JSON.stringify(uploadOptions));

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error("Error uploading to Cloudinary:", error);
            reject(error);
          } else {
            console.log("File uploaded to Cloudinary:");
            console.log("- Public ID:", result.public_id);
            console.log("- Secure URL:", result.secure_url);
            console.log("- Format:", result.format);
            console.log("- Resource type:", result.resource_type);
            resolve(result);
          }
        }
      );

      // Convert buffer to stream and pipe to uploadStream
      const { Readable } = require("stream");
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Error in uploadToCloudinary:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Generate a mockup using Cloudinary's named transformations
 * @param {string} logoUrl - URL of the logo in Cloudinary
 * @param {object} options - Options for the mockup
 * @returns {Promise<string>} - URL of the generated mockup
 */
async function generateMockupWithCloudinary(logoUrl, options = {}) {
  try {
    console.log("Generating mockup with Cloudinary using named transformations...");
    console.log("Logo URL:", logoUrl);

    // Extract the public ID from the logo URL
    let logoPublicId = "";

    // Handle different Cloudinary URL formats
    if (logoUrl.includes("res.cloudinary.com")) {
      try {
        // Format: https://res.cloudinary.com/dupepsmcm/image/upload/v1/logos/logo-123456.png
        const urlObj = new URL(logoUrl);
        const pathParts = urlObj.pathname.split("/");
        
        // Find the index after 'upload'
        let uploadIndex = -1;
        for (let i = 0; i < pathParts.length; i++) {
          if (pathParts[i] === "upload") {
            uploadIndex = i;
            break;
          }
        }
        
        if (uploadIndex >= 0 && uploadIndex + 2 < pathParts.length) {
          // Skip the version part (usually starts with v) and get everything after
          logoPublicId = pathParts.slice(uploadIndex + 2).join("/");
          
          // Remove file extension if present
          if (logoPublicId.includes(".")) {
            logoPublicId = logoPublicId.substring(0, logoPublicId.lastIndexOf("."));
          }
          
          console.log("Extracted logo public ID from res URL:", logoPublicId);
        } else {
          // Fallback to just the filename
          logoPublicId = pathParts[pathParts.length - 1];
          
          // Remove file extension if present
          if (logoPublicId.includes(".")) {
            logoPublicId = logoPublicId.substring(0, logoPublicId.lastIndexOf("."));
          }
          
          console.log("Extracted logo filename as public ID:", logoPublicId);
        }
      } catch (e) {
        console.error("Error parsing res.cloudinary.com URL:", e);
        throw new Error("Failed to extract logo public ID from URL");
      }
    } else {
      throw new Error("Unsupported logo URL format. Expected res.cloudinary.com URL.");
    }

    // Generate a unique ID for this mockup
    const mockupId = `mockup-${Date.now()}`;
    const mockupPublicId = `mockups/${mockupId}`;
    
    console.log("Creating new mockup with ID:", mockupPublicId);
    
    // Define positions for slippers and labels
    const slipperPositions = [
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

    const labelPositions = [
      { x: 154, y: 367 }, // Etiqueta Par 1
      { x: 738, y: 367 }, // Etiqueta Par 2
      { x: 1377, y: 367 }, // Etiqueta Par 3
      { x: 154, y: 825 }, // Etiqueta Par 4
      { x: 738, y: 825 }, // Etiqueta Par 5
      { x: 1377, y: 825 }, // Etiqueta Par 6
    ];

    // Define size limits
    const slipperWidth = 163;
    const slipperHeight = 100;
    const labelWidth = 64;
    const labelHeight = 60;
    
    // Instead of trying to create a complex transformation, we'll create a new image
    // by uploading the logo directly with eager transformations to position it on the background
    
    // First, let's create a new image with the background
    console.log("Creating base image with background...");
    
    // We'll use a completely different approach - create a new image from scratch
    // by uploading the logo and applying transformations to position it on the background
    
    // First, let's create a new image with just the logo
    console.log("Uploading logo for mockup generation...");
    
    // Create a transformation for the mockup
    // We'll use text overlays as a simpler approach
    const mockupTransformation = {
      width: 1920,
      height: 1080,
      crop: "fill",
      background: "white"
    };
    
    // Create the mockup using the Cloudinary API
    const result = await new Promise((resolve, reject) => {
      // Create a new image with the background
      cloudinary.uploader.upload(
        "https://res.cloudinary.com/" + process.env.CLOUDINARY_CLOUD_NAME + "/image/upload/backgrounds/default-bg",
        {
          public_id: mockupPublicId,
          overwrite: true,
          format: "png",
          eager: [
            // Add logo overlays for slippers
            ...slipperPositions.map(pos => ({
              overlay: logoPublicId,
              width: slipperWidth,
              height: slipperHeight,
              x: pos.x - Math.floor(slipperWidth / 2),
              y: pos.y - Math.floor(slipperHeight / 2),
              gravity: "north_west"
            })),
            // Add logo overlays for labels
            ...labelPositions.map(pos => ({
              overlay: logoPublicId,
              width: labelWidth,
              height: labelHeight,
              x: pos.x - Math.floor(labelWidth / 2),
              y: pos.y - Math.floor(labelHeight / 2),
              gravity: "north_west"
            }))
          ]
        },
        (error, result) => {
          if (error) {
            console.error("Error creating mockup with Cloudinary:", error);
            console.error("Error details:", JSON.stringify(error));
            reject(error);
          } else {
            console.log("Mockup created successfully:");
            console.log("- Public ID:", result.public_id);
            console.log("- Secure URL:", result.secure_url);
            console.log("- Format:", result.format);
            
            if (result.eager && result.eager.length > 0) {
              console.log("- Eager URL:", result.eager[0].secure_url);
              resolve({ secure_url: result.eager[0].secure_url });
            } else {
              resolve(result);
            }
          }
        }
      );
    });
    
    // Return the secure URL of the generated mockup
    return result.secure_url;
  } catch (error) {
    console.error("Error generating mockup with Cloudinary:", error);
    console.error("Error stack:", error.stack);
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
