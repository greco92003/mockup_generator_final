/**
 * Unified Server Module
 *
 * This module provides a unified server for the mockup generator application.
 */

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");

// Load unified modules
const mockupGenerator = require("./unified-mockup-generator");
const pdfConverter = require("./unified-pdf-converter");
const s3Storage = require("./unified-s3-storage");
const activeCampaign = require("./unified-active-campaign-api");
const asyncProcessor = require("./unified-async-processor");
const awsLambdaConfig = require("./unified-aws-lambda-config");

// Load environment variables
dotenv.config();

// Define directories
const publicDir = path.join(__dirname, "public");
const mockupsDir = path.join(publicDir, "mockups");
// Use /tmp directory for serverless environments like Vercel
const tempDir =
  process.env.NODE_ENV === "production" ? "/tmp" : path.join(__dirname, "temp");
const backgroundsDir = path.join(publicDir, "backgrounds");

// Ensure directories exist
[tempDir, mockupsDir, backgroundsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// WhatsApp redirect URL
const WHATSAPP_REDIRECT_URL =
  process.env.WHATSAPP_REDIRECT_URL ||
  "https://api.whatsapp.com/send?phone=5551994305831&text=Ola.%20tenho%20interesse%20em%20Chinelos%20Slide%20personalizados%20HUD%20LAB%20Greco";

// Lambda API endpoint
const LAMBDA_API_ENDPOINT =
  process.env.LAMBDA_API_ENDPOINT ||
  "https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod";

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * API endpoint for mockup generation
 * Handles file upload, PDF conversion, mockup generation, and ActiveCampaign integration
 */
app.post("/api/mockup", upload.single("logo"), async (req, res) => {
  try {
    console.log("Received mockup generation request");

    const { name, email, phone, segmento } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }

    console.log("File received:", req.file.originalname);
    console.log("File size:", req.file.size, "bytes");
    console.log("File type:", req.file.mimetype);

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate a unique filename
    const fileId = uuidv4();
    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();
    const logoFilename = `${fileId}.${fileExtension}`;
    const logoPath = path.join(tempDir, logoFilename);

    // Write the file to disk
    fs.writeFileSync(logoPath, req.file.buffer);
    console.log("File saved to:", logoPath);

    // Upload original logo to S3 (uncompressed)
    // PDF files will go to logo-pdf folder, JPG/PNG will go to logo-uncompressed folder
    console.log("Uploading original logo to S3...");
    const originalLogoResult = await s3Storage.uploadFileToS3(
      logoPath,
      req.file.originalname,
      fileExtension === "pdf" ? "logo-pdf" : "logo-uncompressed",
      true // Mark as uncompressed original
    );
    const originalLogoUrl = originalLogoResult.url;
    console.log("Original logo uploaded to S3:", originalLogoUrl);

    // Process the logo (convert PDF to PNG if needed)
    let processedLogoPath = logoPath;
    if (fileExtension === "pdf") {
      console.log("Converting PDF to PNG...");
      processedLogoPath = await pdfConverter.pdfFileToPng(logoPath);
      console.log("PDF converted to PNG:", processedLogoPath);

      // Clean up any PNG files in the logo-pdf folder that might have been created
      // during the conversion process - we only want to keep the original PDF in logo-pdf folder
      console.log("Cleaning up logo-pdf folder...");
      await s3Storage.cleanupLogoPdfFolder(req.file.originalname);
    }

    // Upload processed logo to S3 (logos folder)
    console.log("Uploading processed logo to S3...");
    const logoResult = await s3Storage.uploadFileToS3(
      processedLogoPath,
      path.basename(processedLogoPath),
      "logos",
      false // Not an uncompressed original
    );
    const logoUrl = logoResult.url;
    console.log("Processed logo uploaded to S3:", logoUrl);

    // Process the logo to generate mockup using AWS Lambda
    console.log("Generating mockup with AWS Lambda...");
    let mockupUrl;

    try {
      // Extract file extension from the original filename
      mockupUrl = await awsLambdaConfig.generateMockupWithLambda(
        logoUrl,
        email,
        name,
        fileExtension // Pass the file extension to inform Lambda about file type
      );

      console.log(`Mockup generated with AWS Lambda: ${mockupUrl}`);
    } catch (lambdaError) {
      console.error("Error generating mockup with Lambda:", lambdaError);
      console.warn("Using fallback mockup URL due to Lambda error...");
      mockupUrl = awsLambdaConfig.generateFallbackMockupUrl(email);
    }

    // Return all URLs to the client
    res.json({
      success: true,
      name,
      email,
      phone,
      segmento,
      logoUrl: logoUrl, // URL for the processed logo in logos folder
      originalLogoUrl: originalLogoUrl, // URL for the original uncompressed logo in logo-uncompressed folder
      url: mockupUrl, // URL for the generated mockup
      redirect_url: WHATSAPP_REDIRECT_URL,
    });

    // Process lead in ActiveCampaign asynchronously
    console.log("Processing lead in ActiveCampaign asynchronously...");
    asyncProcessor.processLeadBasicInfoAsync({
      email,
      name,
      phone,
      segmento,
    });

    // Update mockup URLs in ActiveCampaign asynchronously
    if (mockupUrl) {
      console.log("Updating mockup URL in ActiveCampaign asynchronously...");
      asyncProcessor.updateMockupUrlAsync(email, mockupUrl);
    }

    // Update logo URL in ActiveCampaign asynchronously
    // Use originalLogoUrl (from logo-uncompressed or logo-pdf) for the mockup_logotipo field
    if (originalLogoUrl) {
      console.log("Updating logo URL in ActiveCampaign asynchronously...");
      asyncProcessor.updateLogoUrlAsync(email, originalLogoUrl);
    }

    // Clean up temporary files
    setTimeout(() => {
      try {
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
          console.log("Temporary logo file deleted:", logoPath);
        }
        if (
          processedLogoPath !== logoPath &&
          fs.existsSync(processedLogoPath)
        ) {
          fs.unlinkSync(processedLogoPath);
          console.log(
            "Temporary processed logo file deleted:",
            processedLogoPath
          );
        }
      } catch (error) {
        console.error("Error cleaning up temporary files:", error);
      }
    }, 5000);
  } catch (error) {
    console.error("Error processing request:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      error: "Failed to generate mockup",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Serve the client HTML
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "integrated-client.html"));
});

/**
 * Diagnostic endpoint to check server status and configuration
 */
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

    // Check environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: process.env.PORT || 3000,
      AWS_REGION: process.env.AWS_REGION || "us-east-1",
      S3_BUCKET: process.env.S3_BUCKET || "mockup-hudlab",
      LAMBDA_API_ENDPOINT: LAMBDA_API_ENDPOINT,
      ACTIVE_CAMPAIGN_URL: activeCampaign.AC_API_URL,
      WHATSAPP_REDIRECT_URL: WHATSAPP_REDIRECT_URL,
    };

    // Return diagnostic information
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      directories: directoryStatus,
      environment: envVars,
    });
  } catch (error) {
    console.error("Error in diagnostics endpoint:", error);
    res.status(500).json({
      status: "ERROR",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Temp directory: ${tempDir}`);
  console.log(`Public directory: ${publicDir}`);
});
