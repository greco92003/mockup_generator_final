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

    // Instead of creating a placeholder mockup URL with a timestamp that won't match the Lambda function,
    // we'll use a consistent format that indicates it's a placeholder and will be updated
    const safeEmail = email.replace("@", "-at-").replace(".", "-dot-");
    const placeholderMockupUrl = `https://mockup-hudlab.s3.us-east-1.amazonaws.com/mockups/${safeEmail}-placeholder.png`;

    console.log("Using placeholder mockup URL:", placeholderMockupUrl);

    // Return all URLs to the client immediately, including the placeholder mockup URL
    const response = {
      success: true,
      name,
      email,
      phone,
      segmento,
      logoUrl: logoUrl, // URL for the processed logo in logos folder
      originalLogoUrl: originalLogoUrl, // URL for the original uncompressed logo in logo-uncompressed folder
      url: placeholderMockupUrl, // Placeholder mockup URL that will be updated in ActiveCampaign later
      redirect_url: REDIRECT_URL,
    };

    console.log("Sending early response to client with URLs:");
    console.log("- mockup_logotipo (originalLogoUrl):", originalLogoUrl);
    console.log("- Placeholder mockup URL:", placeholderMockupUrl);
    console.log(
      "- Actual mockup URL will be generated by Lambda in the background"
    );

    // Send the response immediately
    res.json(response);

    // Continue processing in the background after response is sent

    // Process lead in ActiveCampaign asynchronously
    console.log("Processing lead in ActiveCampaign asynchronously...");
    asyncProcessor.processLeadBasicInfoAsync({
      email,
      name,
      phone,
      segmento,
    });

    // Start the actual Lambda process in the background
    console.log("Starting mockup generation with AWS Lambda in background...");
    awsLambdaConfig
      .generateMockupWithLambda(
        logoUrl,
        email,
        name,
        fileExtension // Pass the file extension to inform Lambda about file type
      )
      .then((actualMockupUrl) => {
        console.log(`Mockup generated with AWS Lambda: ${actualMockupUrl}`);

        // Clean up any PNG files in the logo-pdf folder if needed
        if (fileExtension === "pdf") {
          console.log("Cleaning up logo-pdf folder...");
          s3Storage
            .cleanupLogoPdfFolder(req.file.originalname)
            .catch((error) =>
              console.error("Error cleaning up logo-pdf folder:", error)
            );
        }

        // Update mockup URL in ActiveCampaign with the actual URL from Lambda
        if (actualMockupUrl) {
          // Ensure actualMockupUrl is a direct URL without query parameters
          let finalMockupUrl = actualMockupUrl;
          if (finalMockupUrl.includes("?")) {
            finalMockupUrl = finalMockupUrl.split("?")[0];
            console.log(
              "Converted pre-signed URL to direct URL:",
              finalMockupUrl
            );
          }

          // Ensure the URL includes the region
          if (
            finalMockupUrl.includes("s3.amazonaws.com") &&
            !finalMockupUrl.includes("s3.us-east-1.amazonaws.com")
          ) {
            finalMockupUrl = finalMockupUrl.replace(
              "s3.amazonaws.com",
              "s3.us-east-1.amazonaws.com"
            );
            console.log("Fixed URL to include region:", finalMockupUrl);
          }

          // Verify that the URL is a direct S3 bucket URL
          if (
            !finalMockupUrl.includes("mockup-hudlab.s3") ||
            !finalMockupUrl.includes("/mockups/")
          ) {
            console.warn(
              "WARNING: Mockup URL does not appear to be a direct S3 bucket URL:",
              finalMockupUrl
            );
            console.log("Attempting to fix the URL format...");

            // Try to extract the key part if it's in a different format
            if (
              finalMockupUrl.includes("mockup-hudlab") &&
              finalMockupUrl.includes("amazonaws.com")
            ) {
              const urlParts = finalMockupUrl.split("/");
              const bucketIndex = urlParts.findIndex((part) =>
                part.includes("mockup-hudlab")
              );

              if (bucketIndex >= 0) {
                const keyParts = urlParts.slice(bucketIndex + 1);
                const key = keyParts.join("/");
                finalMockupUrl = `https://mockup-hudlab.s3.us-east-1.amazonaws.com/${key}`;
                console.log("Corrected URL format:", finalMockupUrl);
              }
            }
          }

          // Compare with the placeholder URL
          if (finalMockupUrl !== placeholderMockupUrl) {
            console.log("Actual mockup URL is different from placeholder URL");
            console.log("Placeholder URL:", placeholderMockupUrl);
            console.log("Actual mockup URL:", finalMockupUrl);

            // Update the mockup URL in ActiveCampaign
            console.log(
              "Updating mockup URL in ActiveCampaign with actual URL from Lambda..."
            );
            console.log(
              "Final mockup URL being sent to ActiveCampaign:",
              finalMockupUrl
            );

            // Make multiple attempts to update the mockup URL
            let updateAttempts = 0;
            const maxUpdateAttempts = 3;

            // Function to update the mockup URL
            const updateMockupUrl = () => {
              updateAttempts++;
              console.log(
                `Update attempt ${updateAttempts}/${maxUpdateAttempts}`
              );

              try {
                // Call the async processor without await since it uses setTimeout internally
                asyncProcessor.updateMockupUrlAsync(email, finalMockupUrl);
                console.log(
                  `Mockup URL update initiated on attempt ${updateAttempts}`
                );

                // We can't truly verify success here since the function is asynchronous
                // and doesn't return a promise we can await
              } catch (updateError) {
                console.error(
                  `Error initiating mockup URL update on attempt ${updateAttempts}:`,
                  updateError
                );

                if (updateAttempts < maxUpdateAttempts) {
                  console.log(`Retrying in 2 seconds...`);
                  setTimeout(updateMockupUrl, 2000);
                } else {
                  console.error(
                    `Failed to initiate mockup URL update after ${maxUpdateAttempts} attempts`
                  );
                }
              }
            };

            // Start the update process
            updateMockupUrl();
          } else {
            console.log(
              "Actual mockup URL is the same as placeholder URL, no need to update"
            );
          }
        } else {
          console.warn(
            "Lambda returned a null or undefined mockup URL. No update sent to ActiveCampaign."
          );
        }
      })
      .catch((lambdaError) => {
        console.error("Error generating mockup with Lambda:", lambdaError);
        console.error(
          "No mockup URL will be sent to ActiveCampaign due to Lambda error"
        );
      });

    // Update logo URL in ActiveCampaign asynchronously
    console.log("Updating logo URL in ActiveCampaign asynchronously...");
    asyncProcessor.updateLogoUrlAsync(email, originalLogoUrl);

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
      REDIRECT_URL: REDIRECT_URL,
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
