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

// Default expiration time for pre-signed URLs (7 days in seconds)
const DEFAULT_EXPIRATION = 7 * 24 * 60 * 60;

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

    // Generate pre-signed URL for the uploaded file
    const presignedUrl = await generatePresignedUrl(result.Key);
    console.log("- Pre-signed URL:", presignedUrl.substring(0, 100) + "...");

    return {
      url: presignedUrl, // Return pre-signed URL instead of direct URL
      directUrl: result.Location, // Also include the direct URL for reference
      key: result.Key,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for an S3 object
 * @param {string} key - S3 object key
 * @param {number} expirationSeconds - Expiration time in seconds (default: 7 days)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function generatePresignedUrl(
  key,
  expirationSeconds = DEFAULT_EXPIRATION
) {
  try {
    console.log(`Generating pre-signed URL for S3 object: ${key}`);
    console.log(
      `URL will expire in ${expirationSeconds} seconds (${Math.round(
        expirationSeconds / 86400
      )} days)`
    );

    const params = {
      Bucket: process.env.S3_BUCKET || "mockup-hudlab",
      Key: key,
      Expires: expirationSeconds,
    };

    const url = await s3.getSignedUrlPromise("getObject", params);
    console.log(`Pre-signed URL generated: ${url.substring(0, 100)}...`);

    return url;
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    throw error;
  }
}

/**
 * Get a pre-signed URL for an existing S3 object
 * @param {string} url - S3 object URL
 * @param {number} expirationSeconds - Expiration time in seconds (default: 7 days)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getPresignedUrlFromS3Url(
  url,
  expirationSeconds = DEFAULT_EXPIRATION
) {
  try {
    console.log(`Getting pre-signed URL for S3 URL: ${url}`);

    // Extract the key from the S3 URL
    // URL format could be one of:
    // 1. https://bucket-name.s3.amazonaws.com/key
    // 2. https://bucket-name.s3.region.amazonaws.com/key
    // 3. https://s3.region.amazonaws.com/bucket-name/key

    const urlObj = new URL(url);
    let key = "";
    let bucket = process.env.S3_BUCKET || "mockup-hudlab";

    console.log(
      `URL hostname: ${urlObj.hostname}, pathname: ${urlObj.pathname}`
    );

    if (urlObj.hostname.includes("s3.amazonaws.com")) {
      // Format: https://bucket-name.s3.amazonaws.com/key or https://bucket-name.s3.region.amazonaws.com/key
      const pathParts = urlObj.pathname
        .split("/")
        .filter((part) => part.length > 0);
      key = pathParts.join("/");

      // Extract bucket name from hostname if it's in the format bucket-name.s3.region.amazonaws.com
      if (urlObj.hostname.split(".")[0] !== "s3") {
        bucket = urlObj.hostname.split(".")[0];
      }
    } else if (
      urlObj.hostname === "s3.amazonaws.com" ||
      urlObj.hostname.startsWith("s3.")
    ) {
      // Format: https://s3.region.amazonaws.com/bucket-name/key
      const pathParts = urlObj.pathname
        .split("/")
        .filter((part) => part.length > 0);
      bucket = pathParts[0];
      key = pathParts.slice(1).join("/");
    }

    console.log(`Extracted bucket: ${bucket}, key: ${key}`);

    // Generate pre-signed URL with explicit bucket and key
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: expirationSeconds,
    };

    console.log(
      `Generating pre-signed URL with params: ${JSON.stringify(params)}`
    );

    const presignedUrl = await s3.getSignedUrlPromise("getObject", params);
    console.log(
      `Pre-signed URL generated: ${presignedUrl.substring(0, 100)}...`
    );

    return presignedUrl;
  } catch (error) {
    console.error("Error getting pre-signed URL from S3 URL:", error);
    throw error;
  }
}

module.exports = {
  uploadToS3,
  generatePresignedUrl,
  getPresignedUrlFromS3Url,
};
