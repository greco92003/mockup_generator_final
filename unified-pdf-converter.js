/**
 * Unified PDF Converter Module
 *
 * This module provides functions for converting PDF files to PNG using CloudConvert.
 */

const path = require("path");
const fs = require("fs");
const CloudConvert = require("cloudconvert");
const https = require("https");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize CloudConvert with API key from environment variables
// Make sure we're not including the variable name in the API key
const apiKey = process.env.CLOUDCONVERT_API_KEY || "";
// Remove any "CLOUDCONVERT_API_KEY=" prefix if it exists
const cleanApiKey = apiKey.replace(/^CLOUDCONVERT_API_KEY=/, "");

console.log(
  "Initializing CloudConvert with API key (first 10 chars):",
  cleanApiKey.substring(0, 10) + "..."
);

const cloudConvert = new CloudConvert(
  cleanApiKey,
  false // false = production mode
);

// Define directories
const tempDir =
  process.env.NODE_ENV === "production" ? "/tmp" : path.join(__dirname, "temp");

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Convert PDF buffer to PNG using CloudConvert
 * @param {Buffer} buffer - PDF buffer
 * @param {string} filename - Original filename
 * @param {object} options - Conversion options
 * @returns {Promise<string>} - Path to the converted PNG file
 */
async function pdfBufferToPng(buffer, filename, options = {}) {
  try {
    console.log("Converting PDF to PNG using CloudConvert...");

    const {
      width = 326,
      height = null,
      pixelDensity = 72,
      alpha = true,
      fit = null,
      addMetadata = true,
    } = options;

    // Create conversion tasks
    const tasks = {
      upload_logo: {
        operation: "import/upload",
      },
      convert_logo: {
        operation: "convert",
        input: "upload_logo",
        output_format: "png",
        input_format: "pdf",
        engine: "mupdf", // Use MuPDF engine instead of GraphicsMagick
        pixel_density: pixelDensity,
        alpha: alpha,
        pages: "1", // Explicitly convert only the first page
        filename: filename.replace(/\.pdf$/i, ".png"),
      },
    };

    // Add width and height if provided
    if (width) {
      tasks.convert_logo.width = width;
    }

    if (height) {
      tasks.convert_logo.height = height;
    }

    // Add fit parameter if provided
    if (fit) {
      tasks.convert_logo.fit = fit;
    }

    // Add metadata task if requested
    if (addMetadata) {
      tasks.add_metadata = {
        operation: "metadata/write",
        input: "convert_logo",
        metadata: {
          "is-original": "false",
          uncompressed: "false",
          "file-type": "png",
          "original-filename": filename.replace(/\.pdf$/i, ".png"),
          "converted-from": filename,
          "conversion-source": "pdf",
          "conversion-type": "cloudconvert",
          "target-folder": "logos", // Ensure this goes to the logos folder
        },
      };
      tasks.export_logo = {
        operation: "export/url",
        input: "add_metadata",
      };
    } else {
      tasks.export_logo = {
        operation: "export/url",
        input: "convert_logo",
      };
    }

    // Create job with tasks
    const job = await cloudConvert.jobs.create({ tasks });
    console.log("Job created:", job.id);

    // Upload the file
    const uploadTask = job.tasks.find((t) => t.name === "upload_logo");
    await cloudConvert.tasks.upload(
      uploadTask,
      buffer,
      filename,
      buffer.length
    );
    console.log("File uploaded to CloudConvert");

    // Wait for completion
    console.log("Waiting for conversion to complete...");
    const completed = await cloudConvert.jobs.wait(job.id);
    console.log("Conversion completed");

    // Download the generated PNG
    const file = cloudConvert.jobs.getExportUrls(completed)[0];
    console.log("Download URL:", file.url);

    const localPath = path.join(tempDir, file.filename);

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(localPath);
      https.get(file.url, (response) => response.pipe(ws));
      ws.on("finish", () => {
        console.log("File downloaded to:", localPath);
        resolve();
      });
      ws.on("error", reject);
    });

    return localPath;
  } catch (error) {
    console.error("Error converting PDF to PNG:", error);

    // Add more detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("CloudConvert API Error Response:");
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
      console.error(
        "Headers:",
        JSON.stringify(error.response.headers, null, 2)
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error("CloudConvert API No Response Error:");
      console.error("Request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("CloudConvert API Setup Error:", error.message);
    }

    console.error("Stack trace:", error.stack);

    throw new Error(`PDF to PNG conversion failed: ${error.message}`);
  }
}

/**
 * Convert PDF file to PNG using CloudConvert
 * @param {string} filePath - Path to the PDF file
 * @param {object} options - Conversion options
 * @returns {Promise<string>} - Path to the converted PNG file
 */
async function pdfFileToPng(filePath, options = {}) {
  try {
    console.log(`Converting PDF file to PNG: ${filePath}`);

    // Read the file
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    // Convert using the buffer function
    return await pdfBufferToPng(buffer, filename, options);
  } catch (error) {
    console.error("Error converting PDF file to PNG:", error);
    console.error("Stack trace:", error.stack);

    // Provide more context in the error message
    throw new Error(
      `PDF file to PNG conversion failed for ${filePath}: ${error.message}`
    );
  }
}

module.exports = {
  pdfBufferToPng,
  pdfFileToPng,
  tempDir,
};
