const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const s3Upload = require("./s3-upload");
const activeCampaign = require("./active-campaign-api");
const asyncProcessor = require("./async-processor");
const awsLambdaConfig = require("./aws-lambda-config");

// Load environment variables
dotenv.config();

// WhatsApp redirect URL
const WHATSAPP_REDIRECT_URL =
  process.env.WHATSAPP_REDIRECT_URL ||
  "https://api.whatsapp.com/send?phone=5551994305831";

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname)); // Serve files from the root directory as well

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// API endpoint for handling form submissions with file upload
app.post("/api/mockup", upload.single("logo"), async (req, res) => {
  try {
    console.log("Received form submission with file upload");
    const { name, email, phone, segmento } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log(`Processing submission for ${email}`);
    console.log(
      `File type: ${req.file.mimetype}, size: ${req.file.size} bytes`
    );

    // Get file details
    const logoBuffer = req.file.buffer;
    const logoFilename = req.file.originalname;
    const mime = req.file.mimetype;

    // Upload original logo to S3 (without processing)
    console.log("Uploading original logo to S3...");
    const logoUploadResult = await s3Upload.uploadToS3(
      logoBuffer,
      logoFilename,
      "logos"
    );

    // Get the logo URL (this will be sent to mockup_logotipo field)
    const logoUrl = logoUploadResult.url;
    console.log(`Original logo uploaded to S3: ${logoUrl}`);

    // Process the logo to generate mockup using AWS Lambda
    console.log("Generating mockup with AWS Lambda...");
    let mockupUrl;

    try {
      mockupUrl = await awsLambdaConfig.generateMockupWithLambda(
        logoUrl,
        email,
        name
      );

      console.log(`Mockup generated with AWS Lambda: ${mockupUrl}`);
    } catch (lambdaError) {
      console.error("Error generating mockup with Lambda:", lambdaError);
      console.warn("Using fallback mockup URL due to Lambda error...");
      mockupUrl = awsLambdaConfig.generateFallbackMockupUrl(email);
    }

    // Return both URLs to the client
    res.json({
      success: true,
      name,
      email,
      phone,
      segmento,
      logoUrl: logoUrl,
      url: mockupUrl,
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

    if (logoUrl) {
      console.log("Updating logo URL in ActiveCampaign asynchronously...");
      asyncProcessor.addTask(
        async (data) => {
          try {
            await activeCampaign.updateLeadLogoUrl(data.email, data.logoUrl);
            console.log("Logo URL updated successfully in ActiveCampaign");
          } catch (error) {
            console.error("Error updating logo URL in ActiveCampaign:", error);
          }
        },
        { email, logoUrl }
      );
    }
  } catch (error) {
    console.error("Error processing form submission:", error);
    res.status(500).json({
      error: "Failed to process form submission",
      message: error.message,
    });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.json({ status: "API is running" });
});

// Route to serve the test page
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "test-form-integration.html"));
});

// Start the server
const PORT = process.env.PORT || 3001; // Changed to port 3001 to avoid conflicts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
