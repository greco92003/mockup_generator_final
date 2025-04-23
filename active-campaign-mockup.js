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
const supabaseStorage = require("./supabase-storage");
const awsLambdaConfig = require("./aws-lambda-config");
const s3Upload = require("./s3-upload");

// Load environment variables
dotenv.config();

// Initialize CloudConvert
const cloudConvert = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY || "",
  false
);

// WhatsApp redirect URL
const WHATSAPP_REDIRECT_URL =
  process.env.WHATSAPP_REDIRECT_URL ||
  "https://api.whatsapp.com/send?phone=5551994305831&text=Ola.%20tenho%20interesse%20em%20Chinelos%20Slide%20personalizados%20HUD%20LAB%20Greco";

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Define directories
const publicDir = path.join(__dirname, "public");
const mockupsDir = path.join(publicDir, "mockups");
// Use /tmp directory for serverless environments like Vercel
const tempDir =
  process.env.NODE_ENV === "production" ? "/tmp" : path.join(__dirname, "temp");
const backgroundsDir = path.join(publicDir, "backgrounds");

console.log(`Using temp directory: ${tempDir}`);

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
          density: 300, // Pixel Density: 300 DPI for better quality
          alpha: true, // Alpha: Yes - Render pages with an alpha channel and transparent background
          filename: filename.replace(/\.pdf$/i, ".png"),
        },
        export_logo: {
          operation: "export/url",
          input: "convert_logo",
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

// Save mockup to Supabase Storage or local directory and return URL
async function saveMockupToPublic(mockupPath, email) {
  try {
    // Use the Supabase storage module to save the mockup
    return await supabaseStorage.saveMockup(mockupPath, email);
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
    const { name, email, phone } = req.body;

    console.log(`Request data: email=${email}, name=${name}`);

    if (!req.file) {
      console.log("Error: Logo file is missing");
      return res.status(400).json({ error: "Logo file is required" });
    }

    if (!email) {
      console.log("Error: Email is missing");
      return res.status(400).json({ error: "Email is required" });
    }

    const mime = req.file.mimetype;
    console.log(`File type: ${mime}, size: ${req.file.size} bytes`);

    let logoBuffer = req.file.buffer;
    let logoFilename = req.file.originalname;

    // If the file is a PDF, convert it to PNG using CloudConvert
    if (mime === "application/pdf") {
      console.log("Converting PDF to PNG using CloudConvert...");
      try {
        // Ensure temp directory exists in serverless environments
        if (!fs.existsSync(tempDir)) {
          try {
            console.log(`Creating temp directory: ${tempDir}`);
            fs.mkdirSync(tempDir, { recursive: true });
          } catch (mkdirError) {
            console.log(
              `Could not create temp directory: ${mkdirError.message}`
            );
            // Continue anyway, as /tmp should already exist in serverless environments
          }
        }

        // Convert PDF to PNG directly from buffer
        console.log("Converting PDF buffer to PNG...");
        const pngPath = await pdfBufferToPng(logoBuffer, logoFilename);
        console.log(`PDF converted to PNG: ${pngPath}`);

        // Read the PNG file
        try {
          logoBuffer = fs.readFileSync(pngPath);
          logoFilename = logoFilename.replace(/\.pdf$/i, ".png");
          console.log(`PNG loaded, size: ${logoBuffer.length} bytes`);

          // Clean up temporary PNG file
          try {
            fs.unlinkSync(pngPath);
            console.log("Temporary PNG file cleaned up");
          } catch (cleanupError) {
            console.error(
              "Error cleaning up temporary PNG file:",
              cleanupError
            );
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

    // Upload logo to S3
    console.log("Uploading logo to S3...");
    const uploadResult = await s3Upload.uploadToS3(
      logoBuffer,
      logoFilename,
      "logos"
    );

    logoUrl = uploadResult.url;
    console.log(`Logo uploaded to S3: ${logoUrl}`);

    // Generate mockup using AWS Lambda
    console.log("Generating mockup with AWS Lambda...");
    const mockupUrl = await awsLambdaConfig.generateMockupWithLambda(
      logoUrl,
      email,
      name
    );
    console.log(`Mockup generated with AWS Lambda: ${mockupUrl}`);

    // Process lead in ActiveCampaign
    console.log("Processing lead in ActiveCampaign...");
    try {
      await activeCampaign.processLeadWithMockup(
        { email, name, phone },
        mockupUrl
      );
      console.log("Lead processed in ActiveCampaign successfully");
    } catch (acError) {
      console.error("Error processing lead in ActiveCampaign:", acError);
      // Continue even if ActiveCampaign fails
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
      SUPABASE_URL: process.env.SUPABASE_URL ? "✓ Set" : "✗ Not set",
      SUPABASE_KEY: process.env.SUPABASE_KEY ? "✓ Set" : "✗ Not set",
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `Diagnostics available at: http://localhost:${PORT}/api/diagnostics`
  );
});
