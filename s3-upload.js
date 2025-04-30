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
    console.log(`File extension: ${fileName.split(".").pop().toLowerCase()}`);
    console.log(
      `File type: ${
        fileName.split(".").pop().toLowerCase() === "jpg" ||
        fileName.split(".").pop().toLowerCase() === "jpeg"
          ? "JPEG Image"
          : fileName.split(".").pop().toLowerCase() === "png"
          ? "PNG Image"
          : fileName.split(".").pop().toLowerCase() === "pdf"
          ? "PDF Document"
          : "Unknown"
      }`
    );

    // Generate a unique ID for the file
    const fileId = uuidv4();
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const key = `${folder}/${fileId}.${fileExtension}`;

    // Determine the correct content type
    let contentType;
    if (fileExtension === "jpg" || fileExtension === "jpeg") {
      contentType = "image/jpeg";
      console.log(`Setting content type for JPG/JPEG file: ${contentType}`);
    } else if (fileExtension === "png") {
      contentType = "image/png";
      console.log(`Setting content type for PNG file: ${contentType}`);
    } else if (fileExtension === "pdf") {
      contentType = "application/pdf";
      console.log(`Setting content type for PDF file: ${contentType}`);
    } else {
      contentType = `image/${fileExtension}`;
      console.log(`Setting content type for other file type: ${contentType}`);
    }

    // Upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET || "mockup-hudlab",
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // ACL removed as the bucket does not support ACLs
    };

    // Log the upload parameters
    console.log(`S3 upload parameters:
    - Bucket: ${params.Bucket}
    - Key: ${params.Key}
    - ContentType: ${params.ContentType}
    - File size: ${fileBuffer.length} bytes`);

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

    // Ensure we're using the latest AWS credentials
    AWS.config.update({
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    // Reinitialize S3 client with updated credentials
    const s3Client = new AWS.S3();

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
    console.log(
      `Using AWS credentials: Access Key ID: ${process.env.AWS_ACCESS_KEY_ID.substring(
        0,
        5
      )}...`
    );
    console.log(`Using AWS region: ${process.env.AWS_REGION || "us-east-1"}`);

    // Verify the object exists before generating a pre-signed URL
    try {
      console.log(`Verifying object exists: Bucket=${bucket}, Key=${key}`);
      const headParams = {
        Bucket: bucket,
        Key: key,
      };

      await s3Client.headObject(headParams).promise();
      console.log(
        "Object exists in S3, proceeding with pre-signed URL generation"
      );
    } catch (headError) {
      console.warn(
        `Warning: Could not verify object existence: ${headError.message}`
      );
      console.log("Continuing with pre-signed URL generation anyway...");
    }

    // Generate pre-signed URL with explicit bucket and key
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: expirationSeconds,
    };

    console.log(
      `Generating pre-signed URL with params: ${JSON.stringify(params)}`
    );

    const presignedUrl = await s3Client.getSignedUrlPromise(
      "getObject",
      params
    );

    // Validate the generated URL
    if (!presignedUrl) {
      console.error("Generated URL is undefined or empty");
      throw new Error("Failed to generate valid pre-signed URL");
    }

    // Check if the URL contains AWS access key parameters
    // It could be either X-Amz-Signature (v4) or AWSAccessKeyId (v2)
    if (
      presignedUrl.includes("X-Amz-Signature=") ||
      presignedUrl.includes("AWSAccessKeyId=")
    ) {
      console.log(
        "Valid pre-signed URL generated with AWS authentication parameters"
      );
    } else {
      console.warn(
        "Generated URL does not contain expected AWS authentication parameters"
      );
      console.log(
        "This might still be valid depending on your AWS configuration"
      );
    }

    console.log(
      `Pre-signed URL generated: ${presignedUrl.substring(0, 100)}...`
    );
    console.log(
      `URL will expire in ${expirationSeconds} seconds (${Math.round(
        expirationSeconds / 86400
      )} days)`
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
