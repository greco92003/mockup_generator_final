const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const CloudConvert = require("cloudconvert");
const https = require("https");
const Jimp = require("jimp");

// Load environment variables
dotenv.config();

// Initialize CloudConvert
const cloudConvert = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY || "",
  false
); // false = production

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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
          engine: "poppler", // Use poppler engine which has better transparency support
          transparent: true, // Enable transparency
          alpha_channel: true, // Preserve alpha channel
          trim: false, // Don't trim the image
          density: 300, // Higher DPI for better quality
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
    throw error;
  }
}

// Generate mockup using Jimp
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

    // Scale logo to fit within 40% of the width
    const logoMaxW = width * 0.4;
    const scale =
      logo.bitmap.width > logoMaxW ? logoMaxW / logo.bitmap.width : 1;
    const scaledWidth = Math.floor(logo.bitmap.width * scale);
    const scaledHeight = Math.floor(logo.bitmap.height * scale);

    logo.resize(scaledWidth, scaledHeight);

    // Calculate position to center the logo
    const x = Math.floor((width - scaledWidth) / 2);
    const y = Math.floor((height - scaledHeight) / 2);

    // Composite logo onto background
    background.composite(logo, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
      opacityDest: 1,
    });
    console.log("Logo composited onto background");

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

// API endpoint for mockup generation
app.post("/api/mockup", upload.single("logo"), async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
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

    // Read the mockup file
    const mockupBuffer = fs.readFileSync(mockupPath);

    // Convert to base64 for response
    const b64 = mockupBuffer.toString("base64");

    // Return the result
    res.json({
      name,
      email,
      phone,
      image: `data:image/png;base64,${b64}`,
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

// Serve the client HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "mockup-client.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
