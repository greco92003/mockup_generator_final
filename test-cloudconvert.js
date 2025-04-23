const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const CloudConvert = require('cloudconvert');
const https = require('https');

// Load environment variables
dotenv.config();

// Initialize CloudConvert
const cloudConvert = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY || "",
  false
); // false = production

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Convert PDF to PNG using CloudConvert with transparent background
async function pdfBufferToPng(buffer, filename = "logo.pdf") {
  try {
    console.log("Starting PDF to PNG conversion with CloudConvert...");
    console.log(`API Key: ${process.env.CLOUDCONVERT_API_KEY ? "✓ Set" : "✗ Not set"}`);
    
    // Create job (upload + convert + export)
    console.log("Creating job...");
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
    console.log("Job details:", JSON.stringify(job, null, 2));

    // Upload the file
    const uploadTask = job.tasks.find((t) => t.name === "upload_logo");
    console.log("Upload task:", uploadTask);
    
    console.log("Uploading file...");
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
    console.log("Completed job details:", JSON.stringify(completed, null, 2));

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
      ws.on("error", (err) => {
        console.error("Error downloading file:", err);
        reject(err);
      });
    });

    return localPath;
  } catch (error) {
    console.error("Error converting PDF to PNG:", error);
    if (error.response && error.response.data) {
      console.error("API Error Response:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Main function to test the conversion
async function testConversion() {
  try {
    console.log("Starting test conversion...");
    
    // Path to the PDF file
    const pdfPath = path.join(__dirname, 'public', 'logo.pdf');
    console.log(`Reading PDF from: ${pdfPath}`);
    
    // Check if the file exists
    if (!fs.existsSync(pdfPath)) {
      console.error(`Error: File not found at ${pdfPath}`);
      return;
    }
    
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`PDF loaded, size: ${pdfBuffer.length} bytes`);
    
    // Convert PDF to PNG
    const pngPath = await pdfBufferToPng(pdfBuffer, 'logo.pdf');
    console.log(`PDF converted to PNG: ${pngPath}`);
    
    // Check if the PNG file exists
    if (fs.existsSync(pngPath)) {
      const stats = fs.statSync(pngPath);
      console.log(`PNG file size: ${stats.size} bytes`);
      console.log("Conversion successful!");
    } else {
      console.error(`Error: PNG file not found at ${pngPath}`);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testConversion();
