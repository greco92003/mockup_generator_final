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

    let originalLogoUrl;
    let logoUrl;

    if (mime === "application/pdf") {
      // Para arquivos PDF:
      // 1. Fazer upload apenas para a pasta logo-uncompressed
      // 2. Não fazer upload duplicado para a pasta logos
      // 3. O Lambda irá converter o PDF para PNG e salvar na pasta logos

      console.log(
        "PDF file detected. Uploading to logo-uncompressed folder only..."
      );

      // Upload do PDF original para a pasta logo-uncompressed
      const originalUploadResult = await s3Upload.uploadToS3(
        logoBuffer,
        logoFilename,
        "logo-uncompressed", // Especificar diretamente a pasta logo-uncompressed
        true // Marcar como arquivo original não comprimido
      );

      // Obter a URL do PDF original (será enviada para o campo mockup_logotipo)
      originalLogoUrl = originalUploadResult.url;
      console.log(
        `Original PDF uploaded to S3 in logo-uncompressed folder: ${originalLogoUrl}`
      );
      console.log(`Folder: ${originalUploadResult.folder}`);

      // Para PDFs, usamos a URL original da pasta logo-uncompressed para processamento
      // O Lambda irá baixar, converter para PNG e salvar o PNG na pasta logos
      logoUrl = originalLogoUrl;
      console.log(`Using original PDF URL for Lambda processing: ${logoUrl}`);
      console.log("Lambda will convert PDF to PNG and save to logos folder");
    } else {
      // Para arquivos PNG/JPG:
      // 1. Fazer upload do original para a pasta logo-uncompressed
      // 2. Fazer upload de uma cópia para a pasta logos para processamento

      console.log(
        "PNG/JPG file detected. Uploading to both logo-uncompressed and logos folders..."
      );

      // Upload do arquivo original para a pasta logo-uncompressed
      const originalUploadResult = await s3Upload.uploadToS3(
        logoBuffer,
        logoFilename,
        "logo-uncompressed", // Especificar diretamente a pasta logo-uncompressed
        true // Marcar como arquivo original não comprimido
      );

      // Obter a URL do arquivo original (será enviada para o campo mockup_logotipo)
      originalLogoUrl = originalUploadResult.url;
      console.log(
        `Original image uploaded to S3 in logo-uncompressed folder: ${originalLogoUrl}`
      );
      console.log(`Folder: ${originalUploadResult.folder}`);

      // Upload de uma cópia para a pasta logos para processamento
      console.log("Uploading copy to logos folder for processing...");
      const logoUploadResult = await s3Upload.uploadToS3(
        logoBuffer,
        logoFilename,
        "logos", // Pasta logos para processamento
        false // Não marcar como arquivo original não comprimido
      );

      // Obter a URL da cópia para geração do mockup
      logoUrl = logoUploadResult.url;
      console.log(`Copy uploaded to S3 logos folder: ${logoUrl}`);
      console.log(`Folder: ${logoUploadResult.folder}`);
    }

    // Process the logo to generate mockup using AWS Lambda
    console.log("Generating mockup with AWS Lambda...");
    let mockupUrl;

    try {
      // Extract file extension from the original filename
      const fileExtension = logoFilename.split(".").pop().toLowerCase();

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

    if (originalLogoUrl) {
      console.log(
        "Updating logo URL in ActiveCampaign asynchronously with original uncompressed URL..."
      );
      asyncProcessor.addTask(
        async (data) => {
          try {
            await activeCampaign.updateLeadLogoUrl(
              data.email,
              data.originalLogoUrl
            );
            console.log(
              "Original uncompressed logo URL updated successfully in ActiveCampaign (mockup_logotipo field)"
            );
          } catch (error) {
            console.error(
              "Error updating original logo URL in ActiveCampaign:",
              error
            );
          }
        },
        { email, originalLogoUrl }
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
