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

// Redirect URL after form submission
const REDIRECT_URL =
  process.env.REDIRECT_URL || "https://hudlab.com.br/obrigado-amostra-digital2";

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
 * Optimized for faster response times by using parallel processing and early response
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

    // Start uploading the original logo to S3 (uncompressed) in the background
    // PDF files will go to logo-pdf folder, JPG/PNG will go to logo-uncompressed folder
    console.log("Starting upload of original logo to S3...");
    const originalLogoPromise = s3Storage.uploadFileToS3(
      logoPath,
      req.file.originalname,
      fileExtension === "pdf" ? "logo-pdf" : "logo-uncompressed",
      true // Mark as uncompressed original
    );

    // Start processing the logo (convert PDF to PNG if needed) in parallel
    let processedLogoPath = logoPath;
    let pdfConversionPromise = Promise.resolve();

    if (fileExtension === "pdf") {
      console.log("Starting PDF to PNG conversion...");
      pdfConversionPromise = pdfConverter
        .pdfFileToPng(logoPath)
        .then((convertedPath) => {
          processedLogoPath = convertedPath;
          console.log("PDF converted to PNG:", processedLogoPath);
          return convertedPath;
        });
    }

    // Wait for the PDF conversion to complete if needed
    if (fileExtension === "pdf") {
      await pdfConversionPromise;
    }

    // Start uploading the processed logo to S3 (logos folder)
    console.log("Starting upload of processed logo to S3...");
    const logoPromise = s3Storage.uploadFileToS3(
      processedLogoPath,
      path.basename(processedLogoPath),
      "logos",
      false // Not an uncompressed original
    );

    // Wait for both uploads to complete
    const [originalLogoResult, logoResult] = await Promise.all([
      originalLogoPromise,
      logoPromise,
    ]);

    const originalLogoUrl = originalLogoResult.url;
    const logoUrl = logoResult.url;

    console.log("Original logo uploaded to S3:", originalLogoUrl);
    console.log("Processed logo uploaded to S3:", logoUrl);

    // NO PLACEHOLDERS - we'll send the mockup URL only after it's generated
    // The client will receive null for the mockup URL initially
    const mockupUrl = null;

    console.log(
      "Not using any placeholder URLs. Will send null initially and update ActiveCampaign with the real URL when available."
    );

    // Instead of sending an early response, we'll wait for the Lambda function to complete
    console.log("Starting mockup generation with AWS Lambda...");
    console.log("Waiting for mockup URL before sending response to client...");

    try {
      // Generate mockup with AWS Lambda and wait for the result
      const lambdaResponse = await awsLambdaConfig.generateMockupWithLambda(
        logoUrl,
        email,
        name,
        fileExtension // Pass the file extension to inform Lambda about file type
      );

      console.log(
        `Received response from Lambda:`,
        typeof lambdaResponse === "string"
          ? lambdaResponse
          : JSON.stringify(lambdaResponse).substring(0, 200) + "..."
      );

      // Extract the mockup URL from the Lambda response
      let actualMockupUrl = null;

      // If the response is a string, use it directly
      if (typeof lambdaResponse === "string") {
        actualMockupUrl = lambdaResponse;
        console.log(`Using string response as mockup URL: ${actualMockupUrl}`);
      }
      // If it's an object, try to extract the URL
      else if (lambdaResponse && typeof lambdaResponse === "object") {
        // Try different properties that might contain the URL
        if (lambdaResponse.mockupUrl) {
          actualMockupUrl = lambdaResponse.mockupUrl;
          console.log(`Found mockupUrl in response object: ${actualMockupUrl}`);
        } else if (lambdaResponse.directUrl) {
          actualMockupUrl = lambdaResponse.directUrl;
          console.log(`Found directUrl in response object: ${actualMockupUrl}`);
        } else if (lambdaResponse.url) {
          actualMockupUrl = lambdaResponse.url;
          console.log(`Found url in response object: ${actualMockupUrl}`);
        }

        // If we still don't have a URL, try to construct one using the email
        if (!actualMockupUrl) {
          // Construct a direct URL based on the email and current timestamp
          const safeEmail = email.replace("@", "-at-").replace(".", "-dot-");
          const timestamp = Date.now();
          const mockupKey = `mockups/${safeEmail}-${timestamp}.png`;
          actualMockupUrl = `https://mockup-hudlab.s3.us-east-1.amazonaws.com/${mockupKey}`;
          console.log(
            `Constructed URL based on email and timestamp: ${actualMockupUrl}`
          );

          // Try to find the latest mockup for this email in S3
          try {
            console.log(`Attempting to find latest mockup for email: ${email}`);
            const latestUrl = await s3Storage.findLatestObjectWithPrefix(
              `mockups/${safeEmail}`
            );
            if (latestUrl) {
              console.log(`Found latest mockup in S3: ${latestUrl}`);
              actualMockupUrl = latestUrl;
            }
          } catch (error) {
            console.error(`Error finding latest mockup: ${error}`);
          }
        }
      }

      console.log(`Final extracted mockup URL: ${actualMockupUrl}`);

      // Ensure actualMockupUrl is a direct URL without query parameters
      let finalMockupUrl = actualMockupUrl;
      if (finalMockupUrl && finalMockupUrl.includes("?")) {
        finalMockupUrl = finalMockupUrl.split("?")[0];
        console.log("Converted pre-signed URL to direct URL:", finalMockupUrl);
      }

      // Ensure the URL includes the region
      if (
        finalMockupUrl &&
        finalMockupUrl.includes("s3.amazonaws.com") &&
        !finalMockupUrl.includes("s3.us-east-1.amazonaws.com")
      ) {
        finalMockupUrl = finalMockupUrl.replace(
          "s3.amazonaws.com",
          "s3.us-east-1.amazonaws.com"
        );
        console.log("Fixed URL to include region:", finalMockupUrl);
      }

      // Now that we have the mockup URL, process the lead in ActiveCampaign
      if (finalMockupUrl) {
        console.log("Processing lead in ActiveCampaign with mockup URL...");

        // First create/update the contact with basic info
        await activeCampaign.processLeadBasicInfo({
          email,
          name,
          phone,
          segmento,
        });

        // Then update the mockup URL
        await activeCampaign.updateLeadMockupUrl(email, finalMockupUrl);

        // Also update the logo URL
        await activeCampaign.updateLeadLogoUrl(email, originalLogoUrl);

        console.log(
          "Lead successfully processed in ActiveCampaign with mockup URL"
        );
      } else {
        console.warn(
          "No valid mockup URL found. Processing lead with basic info only."
        );

        // Process lead with basic info only
        await activeCampaign.processLeadBasicInfo({
          email,
          name,
          phone,
          segmento,
        });

        // Update logo URL
        await activeCampaign.updateLeadLogoUrl(email, originalLogoUrl);
      }

      // Return all URLs to the client
      const response = {
        success: true,
        name,
        email,
        phone,
        segmento,
        logoUrl: logoUrl, // URL for the processed logo in logos folder
        originalLogoUrl: originalLogoUrl, // URL for the original uncompressed logo in logo-uncompressed folder
        url: finalMockupUrl, // The actual mockup URL
        redirect_url: REDIRECT_URL,
      };

      console.log("Sending response to client with URLs:");
      console.log("- mockup_logotipo (originalLogoUrl):", originalLogoUrl);
      console.log("- Mockup URL:", finalMockupUrl);

      // Send the response with the actual mockup URL
      res.json(response);
    } catch (lambdaError) {
      console.error("Error generating mockup with Lambda:", lambdaError);
      console.warn("Using fallback approach...");

      // Process lead with basic info only in case of error
      console.log("Processing lead in ActiveCampaign with basic info only...");
      await activeCampaign.processLeadBasicInfo({
        email,
        name,
        phone,
        segmento,
      });

      // Update logo URL
      await activeCampaign.updateLeadLogoUrl(email, originalLogoUrl);

      // Return response without mockup URL
      const response = {
        success: true,
        name,
        email,
        phone,
        segmento,
        logoUrl: logoUrl,
        originalLogoUrl: originalLogoUrl,
        url: null, // No mockup URL available
        redirect_url: REDIRECT_URL,
      };

      res.json(response);
    }

    // Clean up any PNG files in the logo-pdf folder if needed
    if (fileExtension === "pdf") {
      try {
        console.log("Cleaning up logo-pdf folder...");
        await s3Storage.cleanupLogoPdfFolder(req.file.originalname);
      } catch (error) {
        console.error("Error cleaning up logo-pdf folder:", error);
      }
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
 * Serve the test parent page HTML for iframe integration testing
 */
app.get("/test-parent", (req, res) => {
  res.sendFile(path.join(__dirname, "test-parent-page.html"));
});

/**
 * Diagnostic endpoint to check server status and configuration
 */
app.get("/api/diagnostics", async (req, res) => {
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
      REDIRECT_URL: REDIRECT_URL,
    };

    // Check ActiveCampaign connection
    let activeCampaignStatus = "Unknown";
    let activeCampaignDetails = null;

    try {
      // Verify ActiveCampaign credentials
      const response = await fetch(
        `${activeCampaign.AC_API_URL}/api/3/users/me`,
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

      if (data.user) {
        activeCampaignStatus = "Connected";
        activeCampaignDetails = {
          username: data.user.username,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
        };
      } else {
        activeCampaignStatus = "Error";
        activeCampaignDetails = data;
      }
    } catch (acError) {
      activeCampaignStatus = "Error";
      activeCampaignDetails = {
        message: acError.message,
        stack:
          process.env.NODE_ENV === "development" ? acError.stack : undefined,
      };
    }

    // Return diagnostic information
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      directories: directoryStatus,
      environment: envVars,
      activeCampaign: {
        status: activeCampaignStatus,
        details: activeCampaignDetails,
      },
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

/**
 * Test endpoint to create a contact in ActiveCampaign
 */
app.get("/api/test-active-campaign", async (req, res) => {
  try {
    const testEmail = req.query.email || "test@example.com";
    const testName = req.query.name || "Test User";
    const testPhone = req.query.phone || "123456789";
    const testSegmento = req.query.segmento || "Teste";

    console.log(`Testing ActiveCampaign with email: ${testEmail}`);

    // Create test lead data
    const testLeadData = {
      email: testEmail,
      name: testName,
      phone: testPhone,
      segmento: testSegmento,
    };

    // Process lead directly (not async)
    const result = await activeCampaign.processLeadBasicInfo(testLeadData);

    res.json({
      status: "OK",
      message: "Test contact created successfully",
      result: result,
    });
  } catch (error) {
    console.error("Error in test-active-campaign endpoint:", error);
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
