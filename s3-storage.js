const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const s3Upload = require("./s3-upload");

/**
 * Upload a file to S3 Storage
 * @param {string} filePath - Path to the file to upload
 * @param {string} fileName - Name to save the file as
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function uploadFileToS3(filePath, fileName) {
  try {
    console.log(`Uploading file to S3: ${fileName}`);

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Upload to S3
    const result = await s3Upload.uploadToS3(fileContent, fileName, "mockups");

    console.log("File uploaded to S3:", result.url);

    return result.url;
  } catch (error) {
    console.error("Error in uploadFileToS3:", error);
    throw error;
  }
}

/**
 * Save mockup to S3 Storage or local directory based on environment
 * @param {string} mockupPath - Path to the mockup file
 * @param {string} email - Email of the user
 * @returns {Promise<string>} - Public URL of the mockup
 */
async function saveMockup(mockupPath, email) {
  try {
    const fileName = `mockup-${Date.now()}.png`;

    // Check if we're in production
    if (process.env.NODE_ENV === "production") {
      try {
        // Try to upload to S3
        return await uploadFileToS3(mockupPath, fileName);
      } catch (s3Error) {
        console.error(
          "Error uploading to S3, falling back to local storage:",
          s3Error
        );
        // Fall back to local storage if S3 fails
      }
    }

    // Local storage fallback
    const mockupsDir = path.join(__dirname, "public", "mockups");
    if (!fs.existsSync(mockupsDir)) {
      fs.mkdirSync(mockupsDir, { recursive: true });
    }

    const fileContent = fs.readFileSync(mockupPath);
    const filePath = path.join(mockupsDir, fileName);

    // Write file to public directory
    fs.writeFileSync(filePath, fileContent);

    // Generate public URL
    let baseUrl;
    if (process.env.NODE_ENV === "production") {
      baseUrl = process.env.BASE_URL || "https://seu-dominio.com";
    } else {
      baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    }
    const publicUrl = `${baseUrl}/mockups/${fileName}`;

    console.log("Mockup saved to public directory:", publicUrl);

    // Save metadata to JSON file
    const metadataPath = path.join(mockupsDir, "metadata.json");
    let metadata = [];

    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      } catch (error) {
        console.error("Error reading metadata file:", error);
      }
    }

    metadata.push({
      email,
      fileName,
      url: publicUrl,
      created_at: new Date().toISOString(),
    });

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return publicUrl;
  } catch (error) {
    console.error("Error saving mockup:", error);
    throw error;
  }
}

module.exports = {
  uploadFileToS3,
  saveMockup,
};
