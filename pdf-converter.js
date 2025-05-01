const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const CloudConvert = require("cloudconvert");
const https = require("https");

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

// Convert PDF to PNG using CloudConvert with metadata
async function pdfBufferToPng(buffer, filename = "logo.pdf") {
  try {
    console.log("Starting PDF to PNG conversion with CloudConvert...");

    // Create job (upload + convert + export)
    const job = await cloudConvert.jobs.create({
      tasks: {
        upload_logo: { operation: "import/upload" },
        convert_logo: {
          operation: "convert",
          input: "upload_logo",
          input_format: "pdf",
          output_format: "png",
          engine: "mupdf", // Usar a engine padrão MuPDF em vez de GraphicsMagick
          pages: "1", // first page only
          pixel_density: 72,
          width: 326, // Apenas definir a largura, altura será calculada automaticamente
          alpha: true, // Render with transparent background
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
        export_logo: { operation: "export/url", input: "add_metadata" },
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

// API endpoint for PDF to PNG conversion
app.post("/api/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    const mime = req.file.mimetype;
    let filePath;

    if (mime === "application/pdf") {
      // Convert PDF to PNG using CloudConvert
      console.log("Converting PDF to PNG...");
      filePath = await pdfBufferToPng(req.file.buffer, req.file.originalname);

      // Read the converted file
      const fileBuffer = fs.readFileSync(filePath);

      // Convert to base64 for response
      const b64 = fileBuffer.toString("base64");

      // Return the result
      res.json({
        success: true,
        message: "PDF converted to PNG successfully",
        image: `data:image/png;base64,${b64}`,
      });

      // Clean up temporary files
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Temporary file deleted:", filePath);
          }
        } catch (error) {
          console.error("Error cleaning up temporary files:", error);
        }
      }, 5000);
    } else {
      return res.status(400).json({
        error: "Unsupported file format. Please upload a PDF file.",
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Failed to convert PDF to PNG" });
  }
});

// Serve the simple client HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "simple-client.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
