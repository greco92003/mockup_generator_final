// Use require for modules that may have issues with ES modules
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

import { pdfBufferToPng } from "./services/cloudConvert";
import { generateMockup } from "./services/mockup";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "dist")));

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Create temp directory if it doesn't exist
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// API endpoint for mockup generation
app.post("/api/mockup", upload.single("logo"), async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }

    const mime = req.file.mimetype;
    let logoPath: string;

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

// Serve the React app for any other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
