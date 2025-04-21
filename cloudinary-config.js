const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
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
 * Generate a mockup using Cloudinary transformations
 * @param {string} logoUrl - URL of the logo in Cloudinary
 * @param {object} options - Options for the mockup
 * @returns {Promise<string>} - URL of the generated mockup
 */
async function generateMockupWithCloudinary(logoUrl, options = {}) {
  try {
    console.log("Generating mockup with Cloudinary...");
    console.log("Logo URL:", logoUrl);

    // Extract the public ID from the logo URL
    let logoPublicId = "";

    // Handle different Cloudinary URL formats
    if (logoUrl.includes("asset.cloudinary.com")) {
      // Format: https://asset.cloudinary.com/dupepsmcm/f636ed2ebf5c458969c6650e38c841cb
      const parts = logoUrl.split("/");
      const assetId = parts[parts.length - 1];
      // For asset URLs, we need to use the folder and filename pattern we used during upload
      logoPublicId = `logos/logo-${Date.now()}`;
      console.log("Using constructed public ID for asset URL:", logoPublicId);
    } else if (logoUrl.includes("res.cloudinary.com")) {
      // Format: https://res.cloudinary.com/dupepsmcm/image/upload/v1/logos/logo-123456.png
      const urlObj = new URL(logoUrl);
      const pathParts = urlObj.pathname.split("/");
      // Remove the first empty string, 'image', 'upload', and version
      pathParts.splice(0, 4);
      logoPublicId = pathParts.join("/");
      console.log("Extracted logo public ID from res URL:", logoPublicId);
    } else {
      // Try to extract public ID from any URL format
      const urlObj = new URL(logoUrl);
      logoPublicId = urlObj.pathname.split("/").pop();
      console.log("Extracted logo public ID from generic URL:", logoPublicId);

      // If we couldn't extract a meaningful ID, use a default pattern
      if (!logoPublicId || logoPublicId.length < 5) {
        logoPublicId = `logos/logo-${Date.now()}`;
        console.log("Using default public ID pattern:", logoPublicId);
      }
    }

    // Background image - use the one you uploaded to Cloudinary
    const backgroundPublicId = "backgrounds/default-bg";
    console.log(`Using background image: ${backgroundPublicId}`);

    // Create a new image with Cloudinary's image overlay capabilities
    // We'll use a simpler approach with fewer transformations

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

    // Create a simpler transformation
    // Instead of trying to do everything in one URL, we'll create a new image
    // with the background and logo overlays

    // Create a new transformation for uploading a composed image
    const transformation = {
      transformation: [{ width: 1920, height: 1080, crop: "fill" }],
    };

    // Add slipper overlays
    for (const pos of slipperPositions) {
      transformation.transformation.push({
        overlay: `l_${logoPublicId}`,
        width: slipperWidth,
        height: slipperHeight,
        x: pos.x - slipperWidth / 2,
        y: pos.y - slipperHeight / 2,
        gravity: "north_west",
        crop: "scale",
      });
    }

    // Add label overlays
    for (const pos of labelPositions) {
      transformation.transformation.push({
        overlay: `l_${logoPublicId}`,
        width: labelWidth,
        height: labelHeight,
        x: pos.x - labelWidth / 2,
        y: pos.y - labelHeight / 2,
        gravity: "north_west",
        crop: "scale",
      });
    }

    // Generate a unique ID for this mockup
    const mockupId = `mockup-${Date.now()}`;

    // Use a structured approach for generating the transformation URL
    // This will create a properly formatted Cloudinary URL

    // Create a new transformation array
    const transformations = [];

    // Add the background image transformation
    transformations.push({
      width: 1920,
      height: 1080,
      crop: "fill",
    });

    // Generate the URL using the Cloudinary SDK's url method with proper formatting
    const mockupUrl = cloudinary.url(backgroundPublicId, {
      transformation: [
        { width: 1920, height: 1080, crop: "fill" },
        ...slipperPositions.map((pos) => ({
          overlay: logoPublicId,
          width: slipperWidth,
          height: slipperHeight,
          crop: "scale",
          gravity: "north_west",
          x: Math.floor(pos.x - slipperWidth / 2),
          y: Math.floor(pos.y - slipperHeight / 2),
        })),
        ...labelPositions.map((pos) => ({
          overlay: logoPublicId,
          width: labelWidth,
          height: labelHeight,
          crop: "scale",
          gravity: "north_west",
          x: Math.floor(pos.x - labelWidth / 2),
          y: Math.floor(pos.y - labelHeight / 2),
        })),
      ],
      sign_url: true,
      secure: true,
    });

    console.log(
      "Generated mockup URL with structured transformations:",
      mockupUrl
    );

    // Return the URL directly
    const result = { secure_url: mockupUrl };

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
    console.error("Error saving mockup URL:", error);
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  generateMockupWithCloudinary,
  saveMockupUrl,
};
