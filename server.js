const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const CloudConvert = require("cloudconvert");
const https = require("https");
const Jimp = require("jimp/package.json").version.startsWith("0.")
  ? require("jimp").default
  : require("jimp");

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
app.use(express.static(path.join(__dirname, "dist")));

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Convert PDF to PNG using CloudConvert
async function pdfBufferToPng(buffer, filename = "logo.pdf") {
  try {
    // Create job (upload + convert + export)
    const job = await cloudConvert.jobs.create({
      tasks: {
        upload_logo: { operation: "import/upload" },
        convert_logo: {
          operation: "convert",
          input: "upload_logo",
          output_format: "png",
          pages: "1", // first page only
          filename: filename.replace(/\.pdf$/i, ".png"),
        },
        export_logo: { operation: "export/url", input: "convert_logo" },
      },
    });

    // Upload the file
    const uploadTask = job.tasks.find((t) => t.name === "upload_logo");
    await cloudConvert.tasks.upload(
      uploadTask,
      buffer,
      filename,
      buffer.length
    );

    // Wait for completion
    const completed = await cloudConvert.jobs.wait(job.id);

    // Download the generated PNG
    const file = cloudConvert.jobs.getExportUrls(completed)[0];
    const localPath = path.join(tempDir, file.filename);

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(localPath);
      https.get(file.url, (response) => response.pipe(ws));
      ws.on("finish", () => resolve());
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
    const {
      bgPath = path.join(__dirname, "public", "backgrounds", "default-bg.png"),
      width = 1920,
      height = 1080,
    } = options;

    // Load background image
    let background;
    try {
      background = await Jimp.read(bgPath);
    } catch (error) {
      // If background doesn't exist, create a white background
      background = new Jimp(width, height, 0xffffffff);
      // Add some text to indicate it's a mockup
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
      background.print(font, 10, 10, "Mockup Background");
    }

    // Resize background to desired dimensions
    background.resize(width, height);

    // Load logo
    const logo = await Jimp.read(logoPath);

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
    background.composite(logo, x, y);

    // Return as buffer
    return await background.getBufferAsync(Jimp.MIME_PNG);
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
    } else {
      return res.status(400).json({
        error:
          "Unsupported file format. Please upload a PDF, PNG, or JPG file.",
      });
    }

    // Generate mockup
    console.log("Generating mockup...");
    const mockupBuffer = await generateMockup(logoPath);

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

// Health check route
app.get("/", (req, res) => {
  res.json({ status: "API is running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
