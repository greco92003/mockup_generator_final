const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const CloudConvert = require("cloudconvert");
const https = require("https");
const { v4: uuidv4 } = require("uuid");
const activeCampaign = require("./active-campaign-api");
const s3Storage = require("./s3-storage");
const awsLambdaConfig = require("./aws-lambda-config");
const s3Upload = require("./s3-upload");
const asyncProcessor = require("./async-processor");

// Import optimized modules
const PdfConverter = require("./optimized-pdf-converter");
const CacheManager = require("./cache-manager");
const ParallelProcessor = require("./parallel-processor");
const MockupCache = require("./mockup-cache");

// Load environment variables
dotenv.config();

// Initialize CloudConvert
// Make sure we're passing just the API key without any prefix
const cloudConvertApiKey = process.env.CLOUDCONVERT_API_KEY || "";
console.log(
  `CloudConvert API Key length: ${cloudConvertApiKey.length} characters`
);
// Check if the API key starts with "CLOUDCONVERT_API_KEY="
const cleanApiKey = cloudConvertApiKey.startsWith("CLOUDCONVERT_API_KEY=")
  ? cloudConvertApiKey.substring("CLOUDCONVERT_API_KEY=".length)
  : cloudConvertApiKey;

const cloudConvert = new CloudConvert(cleanApiKey, false);

console.log("CloudConvert client initialized");

// Define directories
const publicDir = path.join(__dirname, "public");
const mockupsDir = path.join(publicDir, "mockups");
// Use /tmp directory for serverless environments like Vercel
const tempDir =
  process.env.NODE_ENV === "production" ? "/tmp" : path.join(__dirname, "temp");
const backgroundsDir = path.join(publicDir, "backgrounds");

console.log(`Using temp directory: ${tempDir}`);

// Define cache directories
const pdfCacheDir =
  process.env.NODE_ENV === "production"
    ? "/tmp/pdf-cache"
    : path.join(__dirname, "cache/pdf");
const mockupCacheDir =
  process.env.NODE_ENV === "production"
    ? "/tmp/mockup-cache"
    : path.join(__dirname, "cache/mockup");

// Initialize optimized modules
const pdfConverter = new PdfConverter(cleanApiKey, tempDir, pdfCacheDir);
const mockupCache = new MockupCache(mockupCacheDir);

// Clean expired cache entries on startup
try {
  mockupCache.cleanExpired();
} catch (error) {
  console.error("Error cleaning mockup cache:", error);
}

// WhatsApp redirect URL
const WHATSAPP_REDIRECT_URL =
  process.env.WHATSAPP_REDIRECT_URL ||
  "https://api.whatsapp.com/send?phone=5551994305831&text=Ola.%20tenho%20interesse%20em%20Chinelos%20Slide%20personalizados%20HUD%20LAB%20Greco";

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// These directories are already defined above

// Function to ensure directories exist
function ensureDirectoriesExist() {
  console.log("Ensuring required directories exist...");

  const directories = [
    { path: publicDir, name: "Public" },
    { path: mockupsDir, name: "Mockups" },
    { path: tempDir, name: "Temp" },
    { path: backgroundsDir, name: "Backgrounds" },
  ];

  directories.forEach((dir) => {
    try {
      if (!fs.existsSync(dir.path)) {
        console.log(`Creating ${dir.name} directory: ${dir.path}`);
        fs.mkdirSync(dir.path, { recursive: true });
        console.log(`${dir.name} directory created successfully`);
      } else {
        console.log(`${dir.name} directory already exists: ${dir.path}`);
      }
    } catch (error) {
      console.error(`Error creating ${dir.name} directory:`, error);
    }
  });
}

// Ensure all required directories exist
ensureDirectoriesExist();

// Serve static files from public directory
app.use(express.static(publicDir));

// Check if default background exists
const defaultBgPath = path.join(backgroundsDir, "default-bg.png");
if (!fs.existsSync(defaultBgPath)) {
  console.warn(`Default background not found at: ${defaultBgPath}`);
  console.warn("Mockups will be generated with a white background");
} else {
  console.log(`Default background found at: ${defaultBgPath}`);
}

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Convert PDF to PNG using CloudConvert with transparent background
async function pdfBufferToPng(buffer, filename = "logo.pdf") {
  try {
    console.log("Starting PDF to PNG conversion with CloudConvert...");
    console.log(`API Key length: ${cleanApiKey.length} characters`);

    // Create job (upload + convert + export)
    console.log("Creating CloudConvert job with tasks...");
    let job;
    try {
      job = await cloudConvert.jobs.create({
        tasks: {
          upload_logo: {
            operation: "import/upload",
          },
          convert_logo: {
            operation: "convert",
            input: "upload_logo",
            input_format: "pdf",
            output_format: "png",
            engine: "mupdf", // Usar a engine padrão MuPDF em vez de GraphicsMagick
            pixel_density: 72,
            width: 326, // Apenas definir a largura, altura será calculada automaticamente
            alpha: true, // Alpha: Yes - Render pages with an alpha channel and transparent background
            filename: filename.replace(/\.pdf$/i, ".png"),
          },
          export_logo: {
            operation: "export/url",
            input: "convert_logo",
          },
        },
      });
      console.log("CloudConvert job created successfully:", job.id);
    } catch (error) {
      console.error("Error creating CloudConvert job:", error);
      if (error.response && error.response.data) {
        console.error(
          "API Error Response:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
      throw error;
    }

    // Upload the file
    try {
      const uploadTask = job.tasks.find((t) => t.name === "upload_logo");
      console.log("Upload task:", uploadTask ? uploadTask.id : "Not found");

      await cloudConvert.tasks.upload(
        uploadTask,
        buffer,
        filename,
        buffer.length
      );
      console.log("File uploaded to CloudConvert");
    } catch (uploadError) {
      console.error("Error uploading file to CloudConvert:", uploadError);
      if (uploadError.response && uploadError.response.data) {
        console.error(
          "API Error Response:",
          JSON.stringify(uploadError.response.data, null, 2)
        );
      }
      throw uploadError;
    }

    // Wait for completion
    let completed;
    try {
      console.log("Waiting for conversion to complete...");
      completed = await cloudConvert.jobs.wait(job.id);
      console.log("Conversion completed");
    } catch (waitError) {
      console.error("Error waiting for CloudConvert job:", waitError);
      if (waitError.response && waitError.response.data) {
        console.error(
          "API Error Response:",
          JSON.stringify(waitError.response.data, null, 2)
        );
      }
      throw waitError;
    }

    // Download the generated PNG
    try {
      const file = cloudConvert.jobs.getExportUrls(completed)[0];
      console.log("Download URL:", file.url);

      // Ensure temp directory exists
      try {
        if (!fs.existsSync(tempDir)) {
          console.log(`Creating temp directory: ${tempDir}`);
          fs.mkdirSync(tempDir, { recursive: true });
        }
      } catch (mkdirError) {
        console.log(
          `Note: Could not create temp directory: ${mkdirError.message}`
        );
        // Continue anyway, as /tmp should already exist in serverless environments
      }

      const localPath = path.join(tempDir, file.filename);
      console.log(`Downloading to: ${localPath}`);

      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(localPath);
        https.get(file.url, (response) => response.pipe(ws));
        ws.on("finish", () => {
          console.log("File downloaded to:", localPath);
          resolve();
        });
        ws.on("error", (err) => {
          console.error("Error writing file:", err);
          reject(err);
        });
      });

      return localPath;
    } catch (downloadError) {
      console.error("Error downloading converted file:", downloadError);
      throw downloadError;
    }
  } catch (error) {
    console.error("Error converting PDF to PNG:", error);
    throw error;
  }
}

// Generate mockup using Jimp with specific positions for chinelos and etiquetas
async function generateMockup(logoPath, options = {}) {
  try {
    console.log("Starting mockup generation process...");

    const {
      bgPath = path.join(__dirname, "public", "backgrounds", "default-bg.png"),
      width = 1920,
      height = 1080,
    } = options;

    // Create temp directory if it doesn't exist (for Vercel environment)
    if (!fs.existsSync(tempDir)) {
      console.log(`Creating temp directory: ${tempDir}`);
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a white background
    let background;
    try {
      console.log("Loading background from:", bgPath);
      if (!fs.existsSync(bgPath)) {
        console.log(`Background file not found at: ${bgPath}`);
        throw new Error(`Background file not found at: ${bgPath}`);
      }

      const bgBuffer = fs.readFileSync(bgPath);
      console.log(`Background file read, size: ${bgBuffer.length} bytes`);

      background = await Jimp.read(bgBuffer);
      console.log("Background loaded successfully");
    } catch (bgError) {
      console.log(
        "Background image not found or couldn't be loaded, creating a white background"
      );
      console.error("Error loading background:", bgError);
      // If background doesn't exist, create a white background
      background = new Jimp(width, height, 0xffffffff);
      console.log("White background created successfully");
    }

    // Resize background to desired dimensions
    console.log(`Resizing background to ${width}x${height}`);
    background.resize(width, height);

    // Load logo
    console.log("Loading logo from:", logoPath);
    if (!fs.existsSync(logoPath)) {
      throw new Error(`Logo file not found at: ${logoPath}`);
    }

    const logoBuffer = fs.readFileSync(logoPath);
    console.log(`Logo file read, size: ${logoBuffer.length} bytes`);

    const logo = await Jimp.read(logoBuffer);
    console.log("Logo loaded successfully");
    console.log(`Logo dimensions: ${logo.bitmap.width}x${logo.bitmap.height}`);

    // Get logo aspect ratio
    const aspectRatio = logo.bitmap.width / logo.bitmap.height;
    console.log(`Logo aspect ratio: ${aspectRatio}`);

    // Define size limits for chinelos and etiquetas
    const defaultSlipperHeight = 100; // altura padrão para chinelos
    const defaultLabelHeight = 60; // altura padrão para etiquetas
    const maxSlipperWidth = 163; // largura máxima para chinelos
    const maxLabelWidth = 64; // largura máxima para etiquetas

    // Calculate dimensions for slippers
    let finalSlipperWidth, finalSlipperHeight;
    const calculatedSlipperWidth = defaultSlipperHeight * aspectRatio;

    if (calculatedSlipperWidth > maxSlipperWidth) {
      finalSlipperWidth = maxSlipperWidth;
      finalSlipperHeight = maxSlipperWidth / aspectRatio;
    } else {
      finalSlipperWidth = calculatedSlipperWidth;
      finalSlipperHeight = defaultSlipperHeight;
    }
    console.log(
      `Final slipper logo dimensions: ${finalSlipperWidth}x${finalSlipperHeight}`
    );

    // Calculate dimensions for labels
    let finalLabelWidth, finalLabelHeight;
    const calculatedLabelWidth = defaultLabelHeight * aspectRatio;

    if (calculatedLabelWidth > maxLabelWidth) {
      finalLabelWidth = maxLabelWidth;
      finalLabelHeight = maxLabelWidth / aspectRatio;
    } else {
      finalLabelWidth = calculatedLabelWidth;
      finalLabelHeight = defaultLabelHeight;
    }
    console.log(
      `Final label logo dimensions: ${finalLabelWidth}x${finalLabelHeight}`
    );

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

    // Create resized logo for slippers
    console.log("Creating resized logo for slippers...");
    const slipperLogo = logo
      .clone()
      .resize(finalSlipperWidth, finalSlipperHeight);

    // Create resized logo for labels
    console.log("Creating resized logo for labels...");
    const labelLogo = logo.clone().resize(finalLabelWidth, finalLabelHeight);

    // Place logos on slippers
    console.log("Placing logos on slippers...");
    for (const center of slippersCenters) {
      const xPos = Math.floor(center.x - finalSlipperWidth / 2);
      const yPos = Math.floor(center.y - finalSlipperHeight / 2);
      background.composite(slipperLogo, xPos, yPos);
    }

    // Place logos on labels
    console.log("Placing logos on labels...");
    for (const center of labelCenters) {
      const xPos = Math.floor(center.x - finalLabelWidth / 2);
      const yPos = Math.floor(center.y - finalLabelHeight / 2);
      background.composite(labelLogo, xPos, yPos);
    }

    // Save the mockup to a temporary file
    const mockupPath = path.join(tempDir, `mockup-${Date.now()}.png`);
    console.log(`Saving mockup to: ${mockupPath}`);
    await background.writeAsync(mockupPath);

    // Verify the file was created
    if (!fs.existsSync(mockupPath)) {
      throw new Error(`Failed to save mockup to: ${mockupPath}`);
    }

    const stats = fs.statSync(mockupPath);
    console.log(`Mockup saved successfully, file size: ${stats.size} bytes`);

    return mockupPath;
  } catch (error) {
    console.error("Error generating mockup:", error);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

// Save mockup to S3 Storage or local directory and return URL
async function saveMockupToPublic(mockupPath, email) {
  try {
    // Use the S3 storage module to save the mockup
    return await s3Storage.saveMockup(mockupPath, email);
  } catch (error) {
    console.error("Error saving mockup:", error);
    throw error;
  }
}

// API endpoint for mockup generation with AWS Lambda and ActiveCampaign integration
app.post("/api/mockup", upload.single("logo"), async (req, res) => {
  let logoUrl = null;

  try {
    console.log("Received mockup generation request (AWS Lambda)");
    const { name, email, phone, segmento } = req.body;

    console.log(
      `Request data: email=${email}, name=${name}, segmento=${
        segmento || "não informado"
      }`
    );

    if (!req.file) {
      console.log("Error: Logo file is missing");
      return res.status(400).json({ error: "Logo file is required" });
    }

    if (!email) {
      console.log("Error: Email is missing");
      return res.status(400).json({ error: "Email is required" });
    }

    // Process basic lead information synchronously
    console.log("Processing basic lead information synchronously...");
    try {
      await activeCampaign.processLeadBasicInfo({
        email,
        name,
        phone,
        segmento,
      });
      console.log("Lead basic information processed successfully");
    } catch (acError) {
      console.error("Error processing lead basic information:", acError);
      // Continue with the process even if this fails
    }

    const mime = req.file.mimetype;
    console.log(`File type: ${mime}, size: ${req.file.size} bytes`);
    console.log(`Original filename: ${req.file.originalname}`);
    console.log(
      `File extension: ${req.file.originalname.split(".").pop().toLowerCase()}`
    );

    // Log more detailed information about the file
    if (mime === "image/jpeg") {
      console.log("Processing JPEG image file");
    } else if (mime === "image/png") {
      console.log("Processing PNG image file");
    } else if (mime === "application/pdf") {
      console.log("Processing PDF document file");
    } else {
      console.log(`Processing unknown file type: ${mime}`);
    }

    let logoBuffer = req.file.buffer;
    let logoFilename = req.file.originalname;

    // If the file is a PDF, first upload the original PDF to S3, then convert it to PNG
    if (mime === "application/pdf") {
      console.log("Processing PDF file...");

      // First, upload the original PDF to S3 to store the uncompressed version
      console.log("Uploading original PDF to S3 before conversion...");
      let originalPdfUrl = null;
      let originalUploadResult = null;

      try {
        // Upload the original PDF to S3
        console.log("Uploading original PDF to S3...");
        console.log(`File to upload: ${logoFilename}, MIME type: ${mime}`);
        console.log(`File size: ${logoBuffer.length} bytes`);

        // Upload the original PDF
        originalUploadResult = await s3Upload.uploadToS3(
          logoBuffer,
          logoFilename,
          "logos"
        );

        originalPdfUrl = originalUploadResult.url;
        console.log(`Original PDF uploaded to S3: ${originalPdfUrl}`);
        console.log(
          `Original S3 upload result: ${JSON.stringify(originalUploadResult)}`
        );

        // Store the original PDF URL in ActiveCampaign
        console.log(
          "Armazenando URL do PDF original no campo mockup_logotipo..."
        );
        try {
          // Use the direct URL from the upload result to ensure it's uncompressed
          const originalDirectUrl =
            originalUploadResult.directUrl || originalPdfUrl;
          console.log(
            `Using original uncompressed PDF URL: ${originalDirectUrl}`
          );

          // Update the mockup_logotipo field with the original PDF URL
          await activeCampaign.updateLeadLogoUrl(email, originalDirectUrl);
          console.log(
            "Campo mockup_logotipo atualizado com sucesso com URL do PDF original"
          );
        } catch (logoUrlError) {
          console.error(
            "Erro ao atualizar campo mockup_logotipo no ActiveCampaign com PDF original:",
            logoUrlError
          );
          // Continue with the process even if this update fails
        }
      } catch (pdfUploadError) {
        console.error("Error uploading original PDF to S3:", pdfUploadError);
        // Continue with the conversion process even if the original upload fails
      }

      // Now proceed with the PDF to PNG conversion
      console.log(
        "Converting PDF to PNG using optimized converter with caching..."
      );
      try {
        // Generate cache key for logging
        const cacheKey = CacheManager.prototype.generateKey(
          logoBuffer,
          logoFilename.replace(/\.pdf$/i, ".png")
        );
        console.log(`Cache key: ${cacheKey}`);

        // Start conversion timer
        const conversionStartTime = Date.now();

        // Convert PDF to PNG using optimized converter with caching
        console.log("Converting PDF buffer to PNG...");
        const pngPath = await pdfConverter.convertPdfToPng(
          logoBuffer,
          logoFilename
        );

        // Log conversion time
        const conversionTime = Date.now() - conversionStartTime;
        console.log(`PDF converted to PNG in ${conversionTime}ms: ${pngPath}`);

        // Log cache statistics
        const cacheStats = pdfConverter.getCacheStats();
        console.log(`Cache statistics: ${JSON.stringify(cacheStats)}`);

        // Read the PNG file
        try {
          logoBuffer = fs.readFileSync(pngPath);
          logoFilename = logoFilename.replace(/\.pdf$/i, ".png");
          console.log(`PNG loaded, size: ${logoBuffer.length} bytes`);

          // We don't delete the file if it came from cache
          if (!pngPath.includes(pdfCacheDir)) {
            try {
              fs.unlinkSync(pngPath);
              console.log("Temporary PNG file cleaned up");
            } catch (cleanupError) {
              console.error(
                "Error cleaning up temporary PNG file:",
                cleanupError
              );
            }
          }
        } catch (readError) {
          console.error("Error reading PNG file:", readError);
          throw new Error(
            `Failed to read converted PNG file: ${readError.message}`
          );
        }
      } catch (conversionError) {
        console.error("Error converting PDF to PNG:", conversionError);
        return res.status(500).json({
          error: "Failed to convert PDF to PNG",
          message: conversionError.message,
        });
      }
    }

    // Check if we have a cached mockup for this request
    const mockupCacheKey = mockupCache.generateKey(
      req.file.buffer.toString("base64").substring(0, 1000), // Use first 1000 chars of base64 for faster hashing
      name,
      email
    );
    console.log(`Mockup cache key: ${mockupCacheKey}`);

    // Check mockup cache
    const cachedMockup = mockupCache.get(mockupCacheKey);
    let mockupUrl;

    if (cachedMockup) {
      console.log(`Using cached mockup: ${cachedMockup.url}`);
      logoUrl = cachedMockup.logoUrl;
      mockupUrl = cachedMockup.url;
      console.log(`Cached mockup URL: ${mockupUrl}`);

      // Log cache statistics
      const cacheStats = mockupCache.getStats();
      console.log(`Mockup cache statistics: ${JSON.stringify(cacheStats)}`);

      // Store the original logo URL in ActiveCampaign even when using cached mockup
      console.log(
        "Armazenando URL do logotipo original no campo mockup_logotipo (do cache)..."
      );
      try {
        // Check if this is a PNG or PDF file (we want to ensure it's uncompressed)
        if (mime === "image/png" || mime === "application/pdf") {
          console.log(
            `${
              mime === "image/png" ? "PNG" : "PDF"
            } file detected - ensuring original uncompressed URL is used for mockup_logotipo field (from cache)`
          );

          // For cached files, we need to extract the direct URL from the cached logoUrl
          // This is a bit tricky since we don't have the original upload result
          // Let's try to get the direct URL by removing any query parameters
          let originalLogoUrl = logoUrl;
          if (logoUrl.includes("?")) {
            originalLogoUrl = logoUrl.split("?")[0];
            console.log(
              `Extracted original URL from cached URL: ${originalLogoUrl}`
            );
          }

          // Use the dedicated function to update the logo URL with the original uncompressed URL
          await activeCampaign.updateLeadLogoUrl(email, originalLogoUrl);
          console.log(
            `Campo mockup_logotipo atualizado com sucesso com URL original não comprimida do ${
              mime === "image/png" ? "PNG" : "PDF"
            } (do cache)`
          );
        } else {
          // For other file types, use the standard URL
          await activeCampaign.updateLeadLogoUrl(email, logoUrl);
          console.log(
            "Campo mockup_logotipo atualizado com sucesso (do cache)"
          );
        }
      } catch (logoUrlError) {
        console.error(
          "Erro ao atualizar campo mockup_logotipo no ActiveCampaign (do cache):",
          logoUrlError
        );
        // Continue with the process even if this update fails
      }
    } else {
      // Start timer for performance measurement
      const startTime = Date.now();

      // Use parallel processing for S3 upload and mockup generation
      console.log("Starting parallel processing...");

      // Upload logo to S3
      console.log("Uploading logo to S3...");
      console.log(`File to upload: ${logoFilename}, MIME type: ${mime}`);
      console.log(`File size: ${logoBuffer.length} bytes`);

      // For JPEG files, ensure we're using the correct extension
      if (
        mime === "image/jpeg" &&
        !logoFilename.toLowerCase().endsWith(".jpg") &&
        !logoFilename.toLowerCase().endsWith(".jpeg")
      ) {
        console.log(`Adding .jpg extension to filename: ${logoFilename}`);
        logoFilename = `${logoFilename}.jpg`;
      }

      const uploadPromise = s3Upload.uploadToS3(
        logoBuffer,
        logoFilename,
        "logos"
      );

      // Start upload and continue with other processing
      const uploadResult = await uploadPromise;
      logoUrl = uploadResult.url;
      console.log(`Logo uploaded to S3: ${logoUrl}`);
      console.log(`S3 upload result: ${JSON.stringify(uploadResult)}`);

      // Store the original logo URL in ActiveCampaign
      console.log(
        "Armazenando URL do logotipo original no campo mockup_logotipo..."
      );
      try {
        // Check if this is a PNG file (we want to ensure it's uncompressed)
        // Note: For PDF files, we already updated the mockup_logotipo field earlier in the process
        if (mime === "image/png") {
          console.log(
            "PNG file detected - ensuring original uncompressed URL is used for mockup_logotipo field"
          );
          console.log(
            `Original upload result: ${JSON.stringify(uploadResult)}`
          );

          // Make sure we're using the direct URL from the upload result
          const originalLogoUrl = uploadResult.directUrl || logoUrl;
          console.log(
            `Using original uncompressed PNG URL: ${originalLogoUrl}`
          );

          // Use the dedicated function to update the logo URL with the original uncompressed URL
          await activeCampaign.updateLeadLogoUrl(email, originalLogoUrl);
          console.log(
            "Campo mockup_logotipo atualizado com sucesso com URL original não comprimida"
          );
        } else if (mime === "application/pdf") {
          // For PDF files, we already updated the mockup_logotipo field earlier in the process
          console.log(
            "PDF file detected - mockup_logotipo field already updated with original PDF URL"
          );
        } else {
          // For other file types, use the standard URL
          await activeCampaign.updateLeadLogoUrl(email, logoUrl);
          console.log("Campo mockup_logotipo atualizado com sucesso");
        }
      } catch (logoUrlError) {
        console.error(
          "Erro ao atualizar campo mockup_logotipo no ActiveCampaign:",
          logoUrlError
        );
        // Continue with the process even if this update fails
      }

      // Generate mockup using AWS Lambda
      console.log("Generating mockup with AWS Lambda...");
      try {
        mockupUrl = await awsLambdaConfig.generateMockupWithLambda(
          logoUrl,
          email,
          name
        );

        if (mockupUrl) {
          console.log(`Mockup generated with AWS Lambda: ${mockupUrl}`);

          // Store in mockup cache
          mockupCache.store(mockupCacheKey, {
            logoUrl,
            url: mockupUrl,
            timestamp: Date.now(),
          });

          // Update mockup URL in ActiveCampaign synchronously
          console.log(
            "Atualizando URL do mockup no ActiveCampaign de forma síncrona..."
          );
          try {
            // Find contact in ActiveCampaign
            const contact = await activeCampaign.findContactByEmail(email);

            if (contact) {
              console.log(`Contato encontrado com ID: ${contact.id}`);

              // Update the mockup_url field directly using the API
              const response = await fetch(
                `${process.env.ACTIVE_CAMPAIGN_URL}/api/3/fieldValues`,
                {
                  method: "POST",
                  headers: {
                    "Api-Token": process.env.ACTIVE_CAMPAIGN_API_KEY,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                  body: JSON.stringify({
                    fieldValue: {
                      contact: contact.id,
                      field: 41, // ID for mockup_url
                      value: mockupUrl,
                    },
                  }),
                }
              );

              const data = await response.json();

              if (data.fieldValue) {
                console.log(
                  "Campo mockup_url atualizado com sucesso:",
                  data.fieldValue
                );

                // Verify the update
                const fieldValues = await activeCampaign.getContactFieldValues(
                  contact.id
                );
                const mockupUrlField = fieldValues.find(
                  (field) => parseInt(field.id) === 41
                );

                if (mockupUrlField && mockupUrlField.value === mockupUrl) {
                  console.log(
                    "✅ Verificação confirmou que o campo mockup_url foi atualizado corretamente"
                  );
                } else {
                  console.warn(
                    "⚠️ Verificação não encontrou o valor esperado no campo mockup_url"
                  );
                  if (mockupUrlField) {
                    console.log("Valor atual:", mockupUrlField.value);
                    console.log("Valor esperado:", mockupUrl);
                  }
                }
              } else {
                console.error(
                  "Falha na atualização do campo mockup_url:",
                  data
                );
              }
            } else {
              console.warn(
                `Contato com email ${email} não encontrado no ActiveCampaign`
              );
            }
          } catch (acError) {
            console.error(
              "Erro ao atualizar campo mockup_url no ActiveCampaign:",
              acError
            );
          }
        } else {
          console.warn("No mockup URL returned from Lambda, using fallback...");
          mockupUrl = awsLambdaConfig.generateFallbackMockupUrl(email);
        }
      } catch (lambdaError) {
        console.error("Error generating mockup with Lambda:", lambdaError);
        console.warn("Using fallback mockup URL due to Lambda error...");
        mockupUrl = awsLambdaConfig.generateFallbackMockupUrl(email);
      }

      // Log total processing time
      const totalTime = Date.now() - startTime;
      console.log(`Total processing time: ${totalTime}ms`);
    }

    // Update mockup URL in ActiveCampaign synchronously if available
    if (mockupUrl) {
      console.log("Updating mockup URL in ActiveCampaign synchronously...");
      console.log("Mockup URL to update:", mockupUrl);
      try {
        await activeCampaign.updateLeadMockupUrl(email, mockupUrl);
        console.log("Mockup URL updated successfully in ActiveCampaign");
      } catch (mockupUrlError) {
        console.error(
          "Error updating mockup URL in ActiveCampaign:",
          mockupUrlError
        );
        // Continue with the process even if this fails
      }
    } else {
      console.log("Mockup URL is undefined, skipping ActiveCampaign update");
    }

    // Return the result with WhatsApp redirect URL
    const response = {
      name,
      email,
      phone,
      image: mockupUrl,
      url: mockupUrl,
      redirect_url: WHATSAPP_REDIRECT_URL,
    };

    console.log("Sending successful response");
    res.json(response);
  } catch (error) {
    console.error("Error processing request with AWS Lambda:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      error: "Failed to generate mockup with AWS Lambda",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Endpoint to check all custom fields in ActiveCampaign
app.get("/api/check-custom-fields", async (req, res) => {
  try {
    console.log(
      "Verificando todos os campos personalizados no ActiveCampaign..."
    );

    // Make a direct API call to get all custom fields
    const response = await fetch(
      `${process.env.ACTIVE_CAMPAIGN_URL}/api/3/fields`,
      {
        method: "GET",
        headers: {
          "Api-Token": process.env.ACTIVE_CAMPAIGN_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.fields) {
      console.log(`Encontrados ${data.fields.length} campos personalizados`);

      // Look for mockup_logotipo field
      const mockupLogotipoField = data.fields.find(
        (field) => field.title === "mockup_logotipo"
      );

      if (mockupLogotipoField) {
        console.log(
          `Campo mockup_logotipo encontrado: ID: ${mockupLogotipoField.id}`
        );
      } else {
        console.log("Campo mockup_logotipo não encontrado");
      }

      // Look for mockup_url field
      const mockupUrlField = data.fields.find(
        (field) => field.title === "mockup_url"
      );

      if (mockupUrlField) {
        console.log(`Campo mockup_url encontrado: ID: ${mockupUrlField.id}`);
      } else {
        console.log("Campo mockup_url não encontrado");
      }

      return res.json({
        success: true,
        fields: data.fields,
        mockupLogotipoField,
        mockupUrlField,
      });
    } else {
      return res.status(500).json({
        error: "Failed to get custom fields",
        message: "API call was successful but no fields were returned",
        apiResponse: data,
      });
    }
  } catch (error) {
    console.error("Error checking custom fields:", error);
    return res.status(500).json({
      error: "Failed to check custom fields",
      message: error.message,
    });
  }
});

// Endpoint to check contact fields in ActiveCampaign
app.get("/api/check-contact-fields", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: "Missing required parameter",
        message: "Email is required",
      });
    }

    console.log(`Verificando campos do contato com email: ${email}`);

    // Find contact in ActiveCampaign
    const contact = await activeCampaign.findContactByEmail(email);

    if (!contact) {
      return res.status(404).json({
        error: "Contact not found",
        message: `No contact found with email: ${email}`,
      });
    }

    console.log(`Contato encontrado com ID: ${contact.id}`);

    // Get all field values for the contact
    const fieldValues = await activeCampaign.getContactFieldValues(contact.id);

    return res.json({
      success: true,
      contact: {
        id: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
      },
      fieldValues,
    });
  } catch (error) {
    console.error("Error checking contact fields:", error);
    return res.status(500).json({
      error: "Failed to check contact fields",
      message: error.message,
    });
  }
});

// Endpoint to manually update mockup URL for a contact
app.post("/api/update-mockup-url", async (req, res) => {
  try {
    const { email, mockupUrl } = req.body;

    if (!email || !mockupUrl) {
      return res.status(400).json({
        error: "Missing required parameters",
        message: "Both email and mockupUrl are required",
      });
    }

    console.log(`Manual update of mockup URL for ${email}: ${mockupUrl}`);

    // Update the mockup URL in ActiveCampaign
    await activeCampaign.updateLeadMockupUrl(email, mockupUrl);

    return res.json({
      success: true,
      message: `Mockup URL updated for ${email}`,
      email,
      mockupUrl,
    });
  } catch (error) {
    console.error("Error updating mockup URL:", error);
    return res.status(500).json({
      error: "Failed to update mockup URL",
      message: error.message,
    });
  }
});

// Endpoint to update the mockup_logotipo field (ID: 42)
app.post("/api/update-logo-url", async (req, res) => {
  try {
    const { email, logoUrl } = req.body;

    if (!email || !logoUrl) {
      return res.status(400).json({
        error: "Missing required parameters",
        message: "Both email and logoUrl are required",
      });
    }

    console.log(`Manual update of logo URL for ${email}: ${logoUrl}`);

    // Update the logo URL in ActiveCampaign
    const result = await activeCampaign.updateLeadLogoUrl(email, logoUrl);

    return res.json({
      success: true,
      message: `Logo URL updated for ${email}`,
      email,
      logoUrl,
      result,
    });
  } catch (error) {
    console.error("Error updating logo URL:", error);
    return res.status(500).json({
      error: "Failed to update logo URL",
      message: error.message,
    });
  }
});

// Endpoint to test S3 pre-signed URL generation
app.post("/api/test-presigned-url", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: "Missing required parameter",
        message: "S3 URL is required",
      });
    }

    console.log(`Testing pre-signed URL generation for: ${url}`);

    // Import the s3Upload module
    const s3Upload = require("./s3-upload");

    // Generate pre-signed URL
    const presignedUrl = await s3Upload.getPresignedUrlFromS3Url(url);

    return res.json({
      success: true,
      message: "Pre-signed URL generated successfully",
      originalUrl: url,
      presignedUrl,
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return res.status(500).json({
      error: "Failed to generate pre-signed URL",
      message: error.message,
    });
  }
});

// Endpoint to test the complete flow of updating mockup_logotipo field
app.post("/api/test-logo-url-flow", async (req, res) => {
  try {
    const { email, logoUrl } = req.body;

    if (!email || !logoUrl) {
      return res.status(400).json({
        error: "Missing required parameters",
        message: "Both email and logoUrl are required",
      });
    }

    console.log(`Testing complete flow for updating logo URL for ${email}`);
    console.log(`Original logo URL: ${logoUrl}`);

    // Step 1: Generate pre-signed URL if it's an S3 URL
    let presignedUrl = logoUrl;
    if (logoUrl.includes("s3.amazonaws.com")) {
      try {
        const s3Upload = require("./s3-upload");
        console.log("Generating pre-signed URL...");
        presignedUrl = await s3Upload.getPresignedUrlFromS3Url(logoUrl);
        console.log("Pre-signed URL generated successfully");
      } catch (presignError) {
        console.error("Error generating pre-signed URL:", presignError);
        return res.status(500).json({
          error: "Failed to generate pre-signed URL",
          message: presignError.message,
        });
      }
    }

    // Step 2: Update the logo URL in ActiveCampaign
    console.log("Updating logo URL in ActiveCampaign...");
    const updateResult = await activeCampaign.updateLeadLogoUrl(email, logoUrl);

    // Step 3: Verify the update by getting the contact's field values
    console.log("Verifying update...");
    const contact = await activeCampaign.findContactByEmail(email);

    if (!contact) {
      return res.status(404).json({
        error: "Contact not found",
        message: `No contact found with email: ${email}`,
      });
    }

    const fieldValues = await activeCampaign.getContactFieldValues(contact.id);
    const logoField = fieldValues.find((field) => parseInt(field.id) === 42);

    return res.json({
      success: true,
      message: "Logo URL update flow completed",
      email,
      originalUrl: logoUrl,
      presignedUrl:
        presignedUrl !== logoUrl
          ? presignedUrl
          : "Not generated (not an S3 URL)",
      updateResult,
      verification: {
        contactId: contact.id,
        logoField,
      },
    });
  } catch (error) {
    console.error("Error in logo URL update flow:", error);
    return res.status(500).json({
      error: "Failed to complete logo URL update flow",
      message: error.message,
    });
  }
});

// Endpoint to directly update the mockup_url field (ID: 41)
app.post("/api/update-mockup-field-direct", async (req, res) => {
  try {
    const { email, mockupUrl } = req.body;

    if (!email || !mockupUrl) {
      return res.status(400).json({
        error: "Missing required parameters",
        message: "Both email and mockupUrl are required",
      });
    }

    console.log(
      `Atualização direta do campo mockup_url para ${email}: ${mockupUrl}`
    );

    // Find contact in ActiveCampaign
    const contact = await activeCampaign.findContactByEmail(email);

    if (!contact) {
      return res.status(404).json({
        error: "Contact not found",
        message: `No contact found with email: ${email}`,
      });
    }

    console.log(`Contato encontrado com ID: ${contact.id}`);

    // Make a direct API call to update the field
    const response = await fetch(
      `${process.env.ACTIVE_CAMPAIGN_URL}/api/3/fieldValues`,
      {
        method: "POST",
        headers: {
          "Api-Token": process.env.ACTIVE_CAMPAIGN_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          fieldValue: {
            contact: contact.id,
            field: 41, // Hardcoded ID for mockup_url
            value: mockupUrl,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.fieldValue) {
      console.log(
        "Campo mockup_url atualizado com sucesso via API direta:",
        data.fieldValue
      );

      // Verify the update
      const fieldValues = await activeCampaign.getContactFieldValues(
        contact.id
      );
      const mockupUrlField = fieldValues.find(
        (field) => parseInt(field.id) === 41
      );

      return res.json({
        success: true,
        message: `Campo mockup_url atualizado com sucesso para ${email}`,
        email,
        mockupUrl,
        fieldValue: data.fieldValue,
        verification: mockupUrlField,
      });
    } else {
      console.error("Falha na atualização direta:", data);
      return res.status(500).json({
        error: "Failed to update mockup_url field",
        message: "API call was successful but no fieldValue was returned",
        apiResponse: data,
      });
    }
  } catch (error) {
    console.error("Error updating mockup_url field directly:", error);
    return res.status(500).json({
      error: "Failed to update mockup_url field",
      message: error.message,
    });
  }
});

// Diagnostic endpoint to check server status and configuration
app.get("/api/diagnostics", (req, res) => {
  try {
    // Check directories
    const directories = [
      { path: publicDir, name: "Public" },
      { path: mockupsDir, name: "Mockups" },
      { path: tempDir, name: "Temp" },
      { path: backgroundsDir, name: "Backgrounds" },
    ];

    const directoryStatus = directories.map((dir) => {
      let writable = false;
      if (fs.existsSync(dir.path)) {
        try {
          fs.accessSync(dir.path, fs.constants.W_OK);
          writable = true;
        } catch (e) {
          writable = false;
        }
      }
      return {
        name: dir.name,
        path: dir.path,
        exists: fs.existsSync(dir.path),
        writable: writable,
      };
    });

    // Check background file
    const backgroundStatus = {
      path: defaultBgPath,
      exists: fs.existsSync(defaultBgPath),
      size: fs.existsSync(defaultBgPath) ? fs.statSync(defaultBgPath).size : 0,
    };

    // Check environment variables (without exposing sensitive values)
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: process.env.PORT || 3000,
      BASE_URL: process.env.BASE_URL ? "✓ Set" : "✗ Not set",
      CLOUDCONVERT_API_KEY: process.env.CLOUDCONVERT_API_KEY
        ? "✓ Set"
        : "✗ Not set",
      ACTIVE_CAMPAIGN_URL: process.env.ACTIVE_CAMPAIGN_URL
        ? "✓ Set"
        : "✗ Not set",
      ACTIVE_CAMPAIGN_API_KEY: process.env.ACTIVE_CAMPAIGN_API_KEY
        ? "✓ Set"
        : "✗ Not set",
      MANYCHAT_API_KEY: process.env.MANYCHAT_API_KEY ? "✓ Set" : "✗ Not set",
      WHATSAPP_REDIRECT_URL: process.env.WHATSAPP_REDIRECT_URL
        ? "✓ Set"
        : "✗ Not set",
    };

    // System info
    const systemInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cwd: process.cwd(),
      execPath: process.execPath,
    };

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      directories: directoryStatus,
      background: backgroundStatus,
      environment: envVars,
      system: systemInfo,
    });
  } catch (error) {
    console.error("Error in diagnostics endpoint:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Serve the client HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "integrated-client.html"));
});

// Route to serve the test page
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "test-form-integration.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `Diagnostics available at: http://localhost:${PORT}/api/diagnostics`
  );
});
