/**
 * Unified Mockup Generator Module
 *
 * This module provides functions for generating mockups using Jimp.
 * It combines functionality from various mockup generation files in the project.
 */

const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");
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
  "Mockup Generator: Initializing CloudConvert with API key (first 10 chars):",
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
 * @returns {Promise<string>} - Path to the converted PNG file
 */
async function pdfBufferToPng(buffer, filename) {
  try {
    console.log("Converting PDF to PNG using CloudConvert...");

    // Create job (upload + convert + export)
    const job = await cloudConvert.jobs.create({
      tasks: {
        upload_logo: {
          operation: "import/upload",
        },
        convert_logo: {
          operation: "convert",
          input: "upload_logo",
          output_format: "png",
          input_format: "pdf",
          engine: "mupdf", // Use MuPDF engine instead of GraphicsMagick
          pixel_density: 72,
          width: 326, // Only set width, height will be calculated automatically
          alpha: true, // Render with alpha channel and transparent background
          filename: filename.replace(/\.pdf$/i, ".png"),
        },
        // Add metadata to the converted file
        add_metadata: {
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
          },
        },
        export_logo: {
          operation: "export/url",
          input: "add_metadata",
        },
      },
    });

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

    throw new Error(
      `PDF to PNG conversion failed in mockup generator: ${error.message}`
    );
  }
}

/**
 * Generate mockup using Jimp with specific positions for chinelos and etiquetas
 * @param {string} logoPath - Path to the logo file
 * @param {object} options - Options for mockup generation
 * @returns {Promise<string>} - Path to the generated mockup
 */
async function generateMockup(logoPath, options = {}) {
  try {
    console.log("Starting mockup generation process...");

    const {
      bgPath = path.join(__dirname, "public", "backgrounds", "default-bg.png"),
      width = 1920,
      height = 1080,
    } = options;

    // Create temp directory if it doesn't exist (for serverless environments)
    if (!fs.existsSync(tempDir)) {
      console.log(`Creating temp directory: ${tempDir}`);
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Load background image
    let background;
    try {
      console.log("Loading background from:", bgPath);
      background = await Jimp.read(bgPath);
      console.log("Background loaded successfully");
    } catch (error) {
      console.log("Background image not found, creating a white background");
      console.error("Error loading background:", error);
      // If background doesn't exist, create a white background
      background = new Jimp(width, height, 0xffffffff);
    }

    // Resize background to desired dimensions
    background.resize(width, height);

    // Load logo
    console.log("Loading logo from:", logoPath);
    const logo = await Jimp.read(logoPath);
    console.log("Logo loaded successfully");

    // Get logo aspect ratio
    const aspectRatio = logo.bitmap.width / logo.bitmap.height;

    // Define size limits for chinelos and etiquetas
    const defaultSlipperHeight = 100; // altura padrão para chinelos
    const defaultLabelHeight = 60; // altura padrão para etiquetas
    const maxSlipperWidth = 163; // largura máxima para chinelos
    const maxLabelWidth = 64; // largura máxima para etiquetas

    // Calculate dimensions for slippers
    let finalSlipperWidth, finalSlipperHeight;
    const calculatedSlipperWidth = defaultSlipperHeight * aspectRatio;

    if (calculatedSlipperWidth <= maxSlipperWidth) {
      // If calculated width is within limits, use default height
      finalSlipperHeight = defaultSlipperHeight;
      finalSlipperWidth = calculatedSlipperWidth;
    } else {
      // If calculated width exceeds limit, use max width and adjust height
      finalSlipperWidth = maxSlipperWidth;
      finalSlipperHeight = maxSlipperWidth / aspectRatio;
    }

    // Calculate dimensions for labels
    let finalLabelWidth, finalLabelHeight;
    const calculatedLabelWidth = defaultLabelHeight * aspectRatio;

    if (calculatedLabelWidth <= maxLabelWidth) {
      // If calculated width is within limits, use default height
      finalLabelHeight = defaultLabelHeight;
      finalLabelWidth = calculatedLabelWidth;
    } else {
      // If calculated width exceeds limit, use max width and adjust height
      finalLabelWidth = maxLabelWidth;
      finalLabelHeight = maxLabelWidth / aspectRatio;
    }

    // Resize logos for slippers and labels
    const slipperLogo = logo
      .clone()
      .resize(finalSlipperWidth, finalSlipperHeight);
    const labelLogo = logo.clone().resize(finalLabelWidth, finalLabelHeight);

    // Define center positions for slippers
    const slipperCenters = [
      { x: 400, y: 400 }, // Adjust these coordinates as needed
      { x: 800, y: 400 },
      { x: 1200, y: 400 },
      { x: 400, y: 700 },
      { x: 800, y: 700 },
      { x: 1200, y: 700 },
    ];

    // Define center positions for labels
    const labelCenters = [
      { x: 1600, y: 300 }, // Adjust these coordinates as needed
      { x: 1600, y: 500 },
      { x: 1600, y: 700 },
    ];

    // Place logos on slippers
    for (const center of slipperCenters) {
      const xPos = Math.floor(center.x - finalSlipperWidth / 2);
      const yPos = Math.floor(center.y - finalSlipperHeight / 2);
      background.composite(slipperLogo, xPos, yPos);
    }

    // Place logos on labels
    for (const center of labelCenters) {
      const xPos = Math.floor(center.x - finalLabelWidth / 2);
      const yPos = Math.floor(center.y - finalLabelHeight / 2);
      background.composite(labelLogo, xPos, yPos);
    }

    // Save the mockup to a temporary file
    const mockupPath = path.join(tempDir, `mockup-${Date.now()}.png`);
    await background.writeAsync(mockupPath);
    console.log("Mockup saved to:", mockupPath);

    return mockupPath;
  } catch (error) {
    console.error("Error generating mockup:", error);
    throw error;
  }
}

/**
 * Generate mockup as a buffer
 * @param {string} logoPath - Path to the logo file
 * @param {object} options - Options for mockup generation
 * @returns {Promise<Buffer>} - Buffer containing the generated mockup
 */
async function generateMockupBuffer(logoPath, options = {}) {
  try {
    const mockupPath = await generateMockup(logoPath, options);
    const buffer = fs.readFileSync(mockupPath);

    // Clean up the temporary file
    try {
      fs.unlinkSync(mockupPath);
    } catch (cleanupError) {
      console.error("Error cleaning up temporary mockup file:", cleanupError);
    }

    return buffer;
  } catch (error) {
    console.error("Error generating mockup buffer:", error);
    throw error;
  }
}

module.exports = {
  pdfBufferToPng,
  generateMockup,
  generateMockupBuffer,
  tempDir,
};
