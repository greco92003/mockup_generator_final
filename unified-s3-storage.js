/**
 * Unified S3 Storage Module
 *
 * This module provides functions for uploading files to AWS S3 and generating pre-signed URLs.
 */

const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");

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
 * @param {boolean} isUncompressed - Whether this is an uncompressed original file
 * @returns {Promise<object>} - S3 upload result with URL
 */
async function uploadToS3(
  fileBuffer,
  fileName,
  folder = "logos",
  isUncompressed = false
) {
  try {
    console.log(`Uploading file to S3: ${fileName}`);

    // Get file extension
    const fileExtension = fileName.split(".").pop().toLowerCase();

    // Check if this is a PDF file
    const isPdf = fileExtension === "pdf";

    // Check if this is a PNG converted from PDF
    const isPngFromCloudConvert =
      fileExtension === "png" &&
      (fileName.toLowerCase().includes("converted") ||
        fileName.toLowerCase().includes("pdf-to-png") ||
        fileName.toLowerCase().match(/\.pdf\.png$/) ||
        fileName.toLowerCase().endsWith("-converted.png"));

    // If this is a converted PNG and it's being uploaded to logo-uncompressed or logo-pdf,
    // redirect it to the logos folder instead
    if (
      isPngFromCloudConvert &&
      (folder === "logo-uncompressed" || folder === "logo-pdf")
    ) {
      console.log(`Detected converted PNG being uploaded to ${folder} folder`);
      console.log(`Redirecting to logos folder instead`);
      folder = "logos";
      isUncompressed = false;
    }

    // Handle PDF files - they should go to logo-pdf folder
    if (isPdf && isUncompressed) {
      folder = "logo-pdf";
      console.log(`Using logo-pdf folder for original PDF file`);
    }
    // Handle JPG/PNG files - they should go to logo-uncompressed folder if marked as uncompressed
    else if (!isPdf && isUncompressed && folder !== "logo-uncompressed") {
      folder = "logo-uncompressed";
      console.log(`Using logo-uncompressed folder for original JPG/PNG file`);
    }
    // If folder is already set to logo-uncompressed or logo-pdf, keep it
    else if (folder === "logo-uncompressed" || folder === "logo-pdf") {
      console.log(`Folder already set to ${folder}, keeping it`);
    }

    // Ensure PNG files from PDF conversion go to logos folder, not logo-pdf
    if (isPngFromCloudConvert && folder === "logo-pdf") {
      folder = "logos";
      console.log(`Redirecting converted PNG from logo-pdf to logos folder`);
      isUncompressed = false;
    }

    // Generate a unique ID for the file
    const fileId = uuidv4();
    const key = `${folder}/${fileId}.${fileExtension}`;

    // Determine content type
    let contentType;
    switch (fileExtension) {
      case "jpg":
      case "jpeg":
        contentType = "image/jpeg";
        break;
      case "png":
        contentType = "image/png";
        break;
      case "pdf":
        contentType = "application/pdf";
        break;
      default:
        contentType = "application/octet-stream";
    }

    // Upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET || "mockup-hudlab",
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    // Add metadata for all files
    params.Metadata = {
      "original-filename": fileName,
      "file-type": fileExtension,
    };

    // Reuse the isPngFromCloudConvert variable defined earlier
    // No need to redefine it here

    // Add appropriate metadata based on file type and source
    if (isPngFromCloudConvert) {
      // Add metadata for converted files
      params.Metadata.uncompressed = "false";
      params.Metadata["is-original"] = "false";
      params.Metadata["converted-from"] = "pdf";
      params.Metadata["conversion-source"] = "pdf";
      params.Metadata["conversion-type"] = "cloudconvert";
    } else if (isUncompressed || folder === "logo-uncompressed") {
      // Add metadata for uncompressed original files
      params.Metadata.uncompressed = "true";
      params.Metadata["is-original"] = "true";
    } else {
      // Add metadata for processed files
      params.Metadata.uncompressed = "false";
      params.Metadata["is-original"] = "false";
    }

    // Check if metadata size exceeds 2KB limit
    const metadataSize = Object.entries(params.Metadata).reduce(
      (size, [key, value]) => size + key.length + (value ? value.length : 0),
      0
    );

    if (metadataSize > 2048) {
      console.warn(
        `Metadata size (${metadataSize} bytes) exceeds 2KB limit. Some metadata may be truncated.`
      );
      // Remove less important metadata if necessary
      delete params.Metadata["conversion-source"];
      delete params.Metadata["conversion-type"];
    }

    // Upload to S3
    const result = await s3.upload(params).promise();

    console.log("File uploaded to S3:");
    console.log("- Location:", result.Location);
    console.log("- Key:", result.Key);
    console.log("- Folder:", folder);

    // Create a result object with additional information
    const uploadResult = {
      url: result.Location,
      directUrl: result.Location,
      key: result.Key,
      contentType: contentType,
      fileExtension: fileExtension,
      isOriginalUncompressed: isUncompressed || folder === "logo-uncompressed",
      originalFileName: fileName,
      folder: folder,
    };

    return uploadResult;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

/**
 * Upload a file from disk to S3
 * @param {string} filePath - Path to the file to upload
 * @param {string} fileName - Name to save the file as (optional, uses original filename if not provided)
 * @param {string} folder - Folder to upload to
 * @param {boolean} isUncompressed - Whether this is an uncompressed original file
 * @returns {Promise<object>} - S3 upload result with URL
 */
async function uploadFileToS3(
  filePath,
  fileName = null,
  folder = "mockups",
  isUncompressed = false
) {
  try {
    console.log(`Uploading file to S3 from path: ${filePath}`);

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Use provided fileName or extract from filePath
    const actualFileName = fileName || path.basename(filePath);

    // Upload to S3
    const result = await uploadToS3(
      fileContent,
      actualFileName,
      folder,
      isUncompressed
    );

    console.log("File uploaded to S3:", result.url);

    return result;
  } catch (error) {
    console.error("Error in uploadFileToS3:", error);
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

    const presignedUrl = await s3.getSignedUrlPromise("getObject", params);

    console.log(
      `Pre-signed URL generated: ${presignedUrl.substring(0, 100)}...`
    );

    return presignedUrl;
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
    const urlObj = new URL(url);
    let key = "";
    let bucket = process.env.S3_BUCKET || "mockup-hudlab";

    // Handle different S3 URL formats
    if (urlObj.hostname.includes("s3.amazonaws.com")) {
      // Format: https://bucket-name.s3.amazonaws.com/key
      key = urlObj.pathname.substring(1); // Remove leading slash
    } else if (
      urlObj.hostname.includes("s3.") &&
      urlObj.hostname.includes(".amazonaws.com")
    ) {
      // Format: https://bucket-name.s3.region.amazonaws.com/key
      key = urlObj.pathname.substring(1); // Remove leading slash
    } else if (
      urlObj.hostname === "s3.amazonaws.com" ||
      urlObj.hostname.match(/s3\.[a-z0-9-]+\.amazonaws\.com/)
    ) {
      // Format: https://s3.region.amazonaws.com/bucket-name/key
      const pathParts = urlObj.pathname.substring(1).split("/");
      bucket = pathParts[0];
      key = pathParts.slice(1).join("/");
    } else {
      // Try to extract key from pathname
      key = urlObj.pathname.substring(1); // Remove leading slash
    }

    // Generate pre-signed URL with explicit bucket and key
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: expirationSeconds,
    };

    const presignedUrl = await s3.getSignedUrlPromise("getObject", params);

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

/**
 * Save mockup to S3 Storage or local directory based on environment
 * @param {string} mockupPath - Path to the mockup file
 * @param {string} email - Email of the user
 * @param {object} metadata - Additional metadata to store
 * @returns {Promise<string>} - Public URL of the mockup
 */
async function saveMockup(mockupPath, email, metadata = {}) {
  try {
    const fileName = `mockup-${Date.now()}.png`;

    // Check if we're in production
    if (process.env.NODE_ENV === "production") {
      try {
        // Try to upload to S3
        const result = await uploadFileToS3(mockupPath, fileName);
        return result.url;
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
    let metadataCollection = [];

    if (fs.existsSync(metadataPath)) {
      try {
        metadataCollection = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      } catch (error) {
        console.error("Error reading metadata file:", error);
      }
    }

    metadataCollection.push({
      email,
      fileName,
      url: publicUrl,
      created_at: new Date().toISOString(),
      ...metadata,
    });

    fs.writeFileSync(metadataPath, JSON.stringify(metadataCollection, null, 2));

    return publicUrl;
  } catch (error) {
    console.error("Error saving mockup:", error);
    throw error;
  }
}

/**
 * Delete PNG files from logo-pdf folder that were created from PDF conversion
 * @param {string} pdfFilename - Original PDF filename
 * @returns {Promise<void>}
 */
async function cleanupLogoPdfFolder(pdfFilename) {
  try {
    console.log(`Cleaning up logo-pdf folder for PDF: ${pdfFilename}`);

    // Extract the base name without extension
    const baseName = pdfFilename.replace(/\.pdf$/i, "");

    // Folder to clean up
    const folder = "logo-pdf";
    console.log(`Cleaning up ${folder} folder...`);

    // List objects in the folder
    const params = {
      Bucket: process.env.S3_BUCKET || "mockup-hudlab",
      Prefix: `${folder}/`,
    };

    const listedObjects = await s3.listObjectsV2(params).promise();

    if (listedObjects.Contents.length === 0) {
      console.log(`No objects found in ${folder} folder`);
      return;
    }

    // Find PNG files that match the PDF name pattern
    const pngFilesToDelete = listedObjects.Contents.filter((obj) => {
      const key = obj.Key;
      // Check if this is a PNG file
      if (!key.toLowerCase().endsWith(".png")) {
        return false;
      }

      // Check if this PNG file is related to our PDF
      // This is a heuristic - we're looking for PNG files that might have been
      // created from our PDF based on naming patterns
      const keyBaseName = key
        .split("/")
        .pop()
        .replace(/\.png$/i, "");

      return (
        key.includes(baseName) ||
        key.includes(pdfFilename) ||
        key.includes(`${baseName}.pdf`) ||
        key.includes(`${baseName}-converted`) ||
        key.includes(`${baseName}.pdf.png`)
      );
    });

    if (pngFilesToDelete.length === 0) {
      console.log(
        `No PNG files found in ${folder} folder that match the PDF name pattern`
      );
      return;
    }

    console.log(
      `Found ${pngFilesToDelete.length} PNG files to delete from ${folder} folder`
    );

    // Delete each PNG file
    for (const obj of pngFilesToDelete) {
      console.log(`Deleting file: ${obj.Key}`);
      await s3
        .deleteObject({
          Bucket: process.env.S3_BUCKET || "mockup-hudlab",
          Key: obj.Key,
        })
        .promise();
    }

    console.log(`Cleanup of ${folder} folder completed successfully`);
  } catch (error) {
    console.error("Error cleaning up logo-pdf folder:", error);
    // We don't want to throw the error as this is a cleanup operation
    // and shouldn't affect the main workflow
  }
}

/**
 * Extrai a chave do objeto a partir de uma URL do S3
 * @param {string} url - URL do S3
 * @returns {string} - Chave do objeto
 */
function extractKeyFromS3Url(url) {
  try {
    console.log(`Extraindo chave do objeto da URL: ${url}`);

    const urlObj = new URL(url);
    let key = "";

    // Lidar com diferentes formatos de URL do S3
    if (urlObj.hostname.includes("s3.amazonaws.com")) {
      // Formato: https://bucket-name.s3.amazonaws.com/key
      // ou https://bucket-name.s3.region.amazonaws.com/key
      key = urlObj.pathname.substring(1); // Remover barra inicial
    } else if (
      urlObj.hostname === "s3.amazonaws.com" ||
      urlObj.hostname.match(/s3\.[a-z0-9-]+\.amazonaws\.com/)
    ) {
      // Formato: https://s3.region.amazonaws.com/bucket-name/key
      const pathParts = urlObj.pathname.substring(1).split("/");
      // Ignorar o nome do bucket (primeiro segmento)
      key = pathParts.slice(1).join("/");
    } else {
      // Tentar extrair a chave do pathname
      key = urlObj.pathname.substring(1);
    }

    console.log(`Chave extraída: ${key}`);
    return key;
  } catch (error) {
    console.error("Erro ao extrair chave da URL:", error);
    // Se não conseguir extrair, retornar a URL original
    return url;
  }
}

/**
 * Wait for an S3 object to exist and then return its URL
 * @param {string} key - S3 object key
 * @param {number} maxRetries - Maximum number of retries (default: 10)
 * @param {number} initialDelay - Initial delay in ms (default: 2000)
 * @param {number} maxDelay - Maximum delay in ms (default: 20000)
 * @param {number} expirationSeconds - Expiration time in seconds for the URL (default: 7 days)
 * @returns {Promise<string>} - URL of the object
 */
async function waitForObjectAndGetUrl(
  key,
  maxRetries = 10,
  initialDelay = 2000,
  maxDelay = 20000,
  expirationSeconds = DEFAULT_EXPIRATION
) {
  try {
    console.log(`Waiting for S3 object to exist: ${key}`);

    const bucket = process.env.S3_BUCKET || "mockup-hudlab";
    let attempt = 0;
    let lastError;

    // We no longer use placeholder URLs
    // If the key contains an email, we can use it to find the mockup
    if (key.includes("mockups/") && key.includes("-at-")) {
      // Extract the email part from the key
      const keyParts = key.split("/");
      if (keyParts.length > 1) {
        const filename = keyParts[keyParts.length - 1];
        const emailPart =
          filename.split("-at-")[0] +
          "-at-" +
          filename.split("-at-")[1].split("-")[0];
        const baseKey = `mockups/${emailPart}`;
        console.log(
          `Using email part to create base key for searching: ${baseKey}`
        );
        key = baseKey;
      }
    }

    while (attempt <= maxRetries) {
      try {
        // Instead of checking for a specific object, list objects with the prefix
        // to find any matching mockups for this email
        console.log(
          `Listing objects with prefix (attempt ${attempt + 1}/${
            maxRetries + 1
          }): Bucket=${bucket}, Prefix=${key}`
        );

        const listParams = {
          Bucket: bucket,
          Prefix: key,
          MaxKeys: 10,
        };

        const listedObjects = await s3.listObjectsV2(listParams).promise();

        if (listedObjects.Contents && listedObjects.Contents.length > 0) {
          // Sort by LastModified to get the most recent one
          listedObjects.Contents.sort(
            (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
          );

          // Get the most recent object
          const latestObject = listedObjects.Contents[0];
          console.log(
            `Found ${listedObjects.Contents.length} objects with prefix ${key}`
          );
          console.log(
            `Using most recent object: ${latestObject.Key} (Modified: ${latestObject.LastModified})`
          );

          // Generate direct URL without pre-signed parameters
          const directUrl = `https://${bucket}.s3.us-east-1.amazonaws.com/${latestObject.Key}`;
          console.log(`Generated direct URL: ${directUrl}`);

          return directUrl;
        }

        console.log(`No objects found with prefix ${key}`);
        attempt++;

        // If we've reached max retries, break
        if (attempt > maxRetries) {
          console.warn(`No objects found after ${maxRetries} retries`);
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          maxDelay,
          initialDelay * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2)
        );

        console.log(
          `No objects found yet, retrying in ${Math.round(delay)}ms...`
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        lastError = error;
        console.error(
          `Error listing objects: ${error.code} - ${error.message}`
        );

        attempt++;

        // If we've reached max retries, break
        if (attempt > maxRetries) {
          console.warn(`Error after ${maxRetries} retries`);
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          maxDelay,
          initialDelay * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2)
        );

        console.log(`Error occurred, retrying in ${Math.round(delay)}ms...`);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    console.error(`Failed to find object after ${maxRetries} retries`);

    // We no longer generate fallback URLs
    // Return null to indicate that no object was found
    console.log("No fallback URL will be generated. Returning null.");
    return null;
  } catch (error) {
    console.error(`Error in waitForObjectAndGetUrl: ${error}`);
    throw error;
  }
}

/**
 * Find the latest object with a given prefix in S3
 * @param {string} prefix - Prefix to search for
 * @param {number} maxKeys - Maximum number of keys to return (default: 20)
 * @returns {Promise<string|null>} - URL of the latest object or null if not found
 */
async function findLatestObjectWithPrefix(prefix, maxKeys = 20) {
  try {
    console.log(`Finding latest object with prefix: ${prefix}`);

    const bucket = process.env.S3_BUCKET || "mockup-hudlab";

    // List objects with the given prefix
    const params = {
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    };

    // Make multiple attempts to list objects
    let attempt = 0;
    const maxAttempts = 3;
    let listedObjects = null;

    while (attempt < maxAttempts) {
      try {
        console.log(
          `Attempt ${
            attempt + 1
          }/${maxAttempts} to list objects with prefix: ${prefix}`
        );
        listedObjects = await s3.listObjectsV2(params).promise();

        if (listedObjects.Contents && listedObjects.Contents.length > 0) {
          break; // Success, exit the loop
        }

        console.log(
          `No objects found on attempt ${attempt + 1}, waiting before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        attempt++;
      } catch (listError) {
        console.error(
          `Error listing objects on attempt ${attempt + 1}:`,
          listError
        );
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        attempt++;
      }
    }

    // If we still don't have any objects after all attempts
    if (
      !listedObjects ||
      !listedObjects.Contents ||
      listedObjects.Contents.length === 0
    ) {
      console.log(
        `No objects found with prefix: ${prefix} after ${maxAttempts} attempts`
      );

      // Try a more direct approach - if this is a mockup prefix, try to construct a URL
      if (prefix.startsWith("mockups/") && prefix.includes("-at-")) {
        // Extract the email part from the prefix
        const emailPart = prefix.replace("mockups/", "");

        // Construct a direct URL based on the email and current timestamp
        const timestamp = Date.now();
        const mockupKey = `mockups/${emailPart}-${timestamp}.png`;
        const constructedUrl = `https://${bucket}.s3.us-east-1.amazonaws.com/${mockupKey}`;

        console.log(`Constructed direct URL as fallback: ${constructedUrl}`);
        return constructedUrl;
      }

      return null;
    }

    console.log(
      `Found ${listedObjects.Contents.length} objects with prefix: ${prefix}`
    );

    // Sort by LastModified to get the most recent one
    listedObjects.Contents.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    );

    // Get the most recent object
    const latestObject = listedObjects.Contents[0];
    console.log(
      `Latest object: ${latestObject.Key} (Modified: ${latestObject.LastModified})`
    );

    // Generate direct URL
    const directUrl = `https://${bucket}.s3.us-east-1.amazonaws.com/${latestObject.Key}`;
    console.log(`Generated direct URL: ${directUrl}`);

    return directUrl;
  } catch (error) {
    console.error(`Error finding latest object with prefix: ${error}`);

    // Try a more direct approach as a fallback
    if (prefix.startsWith("mockups/") && prefix.includes("-at-")) {
      try {
        // Extract the email part from the prefix
        const emailPart = prefix.replace("mockups/", "");

        // Construct a direct URL based on the email and current timestamp
        const timestamp = Date.now();
        const mockupKey = `mockups/${emailPart}-${timestamp}.png`;
        const constructedUrl = `https://${bucket}.s3.us-east-1.amazonaws.com/${mockupKey}`;

        console.log(
          `Constructed direct URL as error fallback: ${constructedUrl}`
        );
        return constructedUrl;
      } catch (fallbackError) {
        console.error(`Error constructing fallback URL: ${fallbackError}`);
      }
    }

    return null;
  }
}

module.exports = {
  uploadToS3,
  uploadFileToS3,
  generatePresignedUrl,
  getPresignedUrlFromS3Url,
  saveMockup,
  cleanupLogoPdfFolder,
  DEFAULT_EXPIRATION,
  waitForObjectAndGetUrl,
  extractKeyFromS3Url,
  findLatestObjectWithPrefix,
};
