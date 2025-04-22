const AWS = require("aws-sdk");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");

// Load environment variables
dotenv.config();

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize S3 client
const s3 = new AWS.S3();

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Original file name
 * @param {string} folder - Folder to upload to
 * @returns {Promise<object>} - S3 upload result with URL
 */
async function uploadToS3(fileBuffer, fileName, folder = "logos") {
  try {
    console.log(`Uploading file to S3: ${fileName}`);

    // Generate a unique ID for the file
    const fileId = uuidv4();
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const key = `${folder}/${fileId}.${fileExtension}`;

    // Upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET || "mockup-hudlab",
      Key: key,
      Body: fileBuffer,
      ContentType: `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`,
      // ACL removed as the bucket does not support ACLs
    };

    // Upload to S3
    const result = await s3.upload(params).promise();

    console.log("File uploaded to S3:");
    console.log("- Location:", result.Location);
    console.log("- Key:", result.Key);

    return {
      url: result.Location,
      key: result.Key,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

module.exports = {
  uploadToS3,
};
