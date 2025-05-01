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

    // Definir metadados que queremos adicionar ao arquivo
    const customMetadata = {
      "is-original": "false",
      uncompressed: "false",
      "file-type": "png",
      "original-filename": filename.replace(/\.pdf$/i, ".png"),
      "converted-from": filename,
      "conversion-source": "pdf",
      "conversion-type": "cloudconvert",
    };

    console.log(
      "Custom metadata to be added:",
      JSON.stringify(customMetadata, null, 2)
    );

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
          metadata: customMetadata,
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

    // Log the completed job details for debugging
    console.log(
      "Completed job details:",
      JSON.stringify(
        {
          id: completed.id,
          status: completed.status,
          tasks: completed.tasks.map((t) => ({
            name: t.name,
            operation: t.operation,
            status: t.status,
            result: t.result ? Object.keys(t.result) : null,
          })),
        },
        null,
        2
      )
    );

    // Find the metadata task to check if it was successful
    const metadataTask = completed.tasks.find((t) => t.name === "add_metadata");
    if (metadataTask && metadataTask.status === "finished") {
      console.log("Metadata task completed successfully");
    } else {
      console.warn("Metadata task may not have completed successfully");
    }

    // Download the generated PNG
    const file = cloudConvert.jobs.getExportUrls(completed)[0];
    if (!file || !file.url) {
      throw new Error("No export URL found in CloudConvert response");
    }

    console.log("Download URL:", file.url);
    const localPath = path.join(tempDir, file.filename);

    // Download the file with proper error handling
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(localPath);
      https
        .get(file.url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Failed to download file: ${response.statusCode} ${response.statusMessage}`
              )
            );
            return;
          }
          response.pipe(ws);
        })
        .on("error", (err) => {
          reject(new Error(`Network error when downloading: ${err.message}`));
        });

      ws.on("finish", () => {
        console.log("File downloaded to:", localPath);

        // Criar um arquivo de metadados auxiliar para garantir que os metadados sejam preservados
        const metadataFilePath = `${localPath}.metadata.json`;
        fs.writeFileSync(
          metadataFilePath,
          JSON.stringify(customMetadata, null, 2)
        );
        console.log(`Metadata saved to auxiliary file: ${metadataFilePath}`);

        resolve();
      });
      ws.on("error", (err) => {
        reject(new Error(`File system error when saving: ${err.message}`));
      });
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
