const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const CloudConvert = require("cloudconvert");
const https = require("https");
const Jimp = require("jimp");
const { v4: uuidv4 } = require("uuid");
const activeCampaign = require("./active-campaign-api");
const manyChatApi = require("./manychat-api");

// Load environment variables
dotenv.config();

// Initialize CloudConvert
const cloudConvert = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY || "",
  false
);

// ManyChat configuration
const MANYCHAT_API_KEY =
  process.env.MANYCHAT_API_KEY || "7044882:cc66bd757dd062d297296fb85610330b";
const MANYCHAT_FIELD_NAME = "mockup_url";

// WhatsApp redirect URL
const WHATSAPP_REDIRECT_URL =
  process.env.WHATSAPP_REDIRECT_URL ||
  "https://api.whatsapp.com/send?phone=5551994305831&text=Ola.%20tenho%20interesse%20em%20Chinelos%20Slide%20personalizados%20HUD%20LAB%20Greco";

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Create public directory for storing mockups
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create mockups directory inside public
const mockupsDir = path.join(publicDir, "mockups");
if (!fs.existsSync(mockupsDir)) {
  fs.mkdirSync(mockupsDir, { recursive: true });
}

// Serve static files from public directory
app.use(express.static(publicDir));

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Convert PDF to PNG using CloudConvert with transparent background and metadata
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
        // Adicionar tarefa para escrever metadados no arquivo convertido
        add_metadata: {
          operation: "metadata/write",
          input: "convert_logo",
          metadata: {
            "is-original": "false",
            uncompressed: "false",
            "file-type": "png",
            "original-filename": filename.replace(/\.pdf$/i, ".png"),
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
    throw error;
  }
}

// Generate mockup using Jimp with specific positions for chinelos and etiquetas
async function generateMockup(logoPath, options = {}) {
  try {
    console.log("Generating mockup...");

    const {
      bgPath = path.join(__dirname, "public", "backgrounds", "default-bg.png"),
      width = 1920,
      height = 1080,
    } = options;

    // Create a white background
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

    if (calculatedSlipperWidth > maxSlipperWidth) {
      finalSlipperWidth = maxSlipperWidth;
      finalSlipperHeight = maxSlipperWidth / aspectRatio;
    } else {
      finalSlipperWidth = calculatedSlipperWidth;
      finalSlipperHeight = defaultSlipperHeight;
    }

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
    const slipperLogo = logo
      .clone()
      .resize(finalSlipperWidth, finalSlipperHeight);

    // Create resized logo for labels
    const labelLogo = logo.clone().resize(finalLabelWidth, finalLabelHeight);

    // Place logos on slippers
    for (const center of slippersCenters) {
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

// Save mockup to public directory and return URL
async function saveMockupToPublic(mockupPath, email) {
  try {
    const fileContent = fs.readFileSync(mockupPath);
    const fileName = `mockup-${uuidv4()}.png`;
    const filePath = path.join(mockupsDir, fileName);

    // Write file to public directory
    fs.writeFileSync(filePath, fileContent);

    // Generate public URL
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const publicUrl = `${baseUrl}/mockups/${fileName}`;

    console.log("Mockup saved to public directory:", publicUrl);

    // Save metadata to JSON file
    const metadataPath = path.join(mockupsDir, "metadata.json");
    let metadata = [];

    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      } catch (error) {
        console.error("Error reading metadata file:", error);
      }
    }

    metadata.push({
      email,
      fileName,
      url: publicUrl,
      created_at: new Date().toISOString(),
    });

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return publicUrl;
  } catch (error) {
    console.error("Error saving mockup to public directory:", error);
    throw error;
  }
}

// API endpoint for mockup generation with ActiveCampaign and ManyChat integration
app.post("/api/mockup", upload.single("logo"), async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const mime = req.file.mimetype;
    let logoPath;

    if (mime === "application/pdf") {
      // Convert PDF to PNG using CloudConvert
      console.log("Converting PDF to PNG...");
      logoPath = await pdfBufferToPng(req.file.buffer, req.file.originalname);
    } else if (mime === "image/png" || mime === "image/jpeg") {
      // Save the PNG/JPG temporarily
      logoPath = path.join(tempDir, req.file.originalname);
      fs.writeFileSync(logoPath, req.file.buffer);
      console.log("Image saved to:", logoPath);
    } else {
      return res.status(400).json({
        error:
          "Unsupported file format. Please upload a PDF, PNG, or JPG file.",
      });
    }

    // Generate mockup
    const mockupPath = await generateMockup(logoPath);

    // Save to public directory and get URL
    const publicUrl = await saveMockupToPublic(mockupPath, email);

    // Process lead in ActiveCampaign
    console.log("Processing lead in ActiveCampaign...");
    try {
      await activeCampaign.processLeadWithMockup(
        { email, name, phone },
        publicUrl
      );
      console.log("Lead processed in ActiveCampaign successfully");
    } catch (acError) {
      console.error("Error processing lead in ActiveCampaign:", acError);
      // Continue even if ActiveCampaign fails
    }

    // Try to send mockup via ManyChat
    console.log("Sending mockup to ManyChat...");
    try {
      await manyChatApi.sendMockupToManyChat(email, phone, name, publicUrl);
      console.log("Mockup sent to ManyChat successfully");
    } catch (mcError) {
      console.error("Error sending mockup to ManyChat:", mcError);
      // Continue even if ManyChat fails
    }

    // Read the mockup file for preview
    const mockupBuffer = fs.readFileSync(mockupPath);

    // Convert to base64 for response
    const b64 = mockupBuffer.toString("base64");

    // Return the result with WhatsApp redirect URL
    res.json({
      name,
      email,
      phone,
      image: `data:image/png;base64,${b64}`,
      url: publicUrl,
      redirect_url: WHATSAPP_REDIRECT_URL,
    });

    // Clean up temporary files
    setTimeout(() => {
      try {
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
          console.log("Temporary logo file deleted:", logoPath);
        }
        if (fs.existsSync(mockupPath)) {
          fs.unlinkSync(mockupPath);
          console.log("Temporary mockup file deleted:", mockupPath);
        }
      } catch (error) {
        console.error("Error cleaning up temporary files:", error);
      }
    }, 5000);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Failed to generate mockup" });
  }
});

// API endpoint for ManyChat to get mockup URL by email
app.get("/api/manychat/mockup", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    // Find mockup in metadata
    const metadataPath = path.join(mockupsDir, "metadata.json");
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: "No mockups found" });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

    // Find the most recent mockup for this email
    const mockups = metadata.filter((m) => m.email === email);
    if (mockups.length === 0) {
      return res.status(404).json({ error: "No mockup found for this email" });
    }

    // Sort by creation date (newest first)
    mockups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const mockup = mockups[0];

    // Return the mockup URL in ManyChat-friendly format
    res.json({
      version: "v2",
      content: {
        messages: [
          {
            type: "image",
            url: mockup.url,
            buttons: [
              {
                type: "url",
                caption: "Download Mockup",
                url: mockup.url,
              },
            ],
          },
          {
            type: "text",
            text: `Aqui está o seu mockup! Esperamos que goste do resultado.`,
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error in ManyChat API endpoint:", error);
    res.status(500).json({ error: "Failed to retrieve mockup" });
  }
});

// Webhook for ActiveCampaign to trigger sending mockup to ManyChat
app.post("/api/webhook/active-campaign", async (req, res) => {
  try {
    const { contact, mockup_url } = req.body;

    if (!contact || !contact.email || !mockup_url) {
      return res
        .status(400)
        .json({ error: "Contact email and mockup_url are required" });
    }

    // Find contact in ManyChat by email
    console.log(`Finding contact in ManyChat: ${contact.email}`);

    try {
      // Set the mockup URL in ManyChat
      const result = await manyChatApi.sendMockupToManyChat(
        contact.email,
        contact.phone || "",
        `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        mockup_url
      );

      console.log("ManyChat integration result:", result);

      res.json({
        success: true,
        message: "Mockup sent to ManyChat for delivery",
        result,
      });
    } catch (error) {
      console.error("Error in ManyChat integration:", error);
      res.status(500).json({
        error: "Failed to send mockup to ManyChat",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Error in ActiveCampaign webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Serve the client HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "integrated-client.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
