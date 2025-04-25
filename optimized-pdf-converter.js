const fs = require("fs");
const path = require("path");
const https = require("https");
const CloudConvert = require("cloudconvert");
const CacheManager = require("./cache-manager");

/**
 * Optimized PDF to PNG converter with caching
 */
class PdfConverter {
  /**
   * Initialize the PDF converter
   * @param {string} apiKey - CloudConvert API key
   * @param {string} tempDir - Directory for temporary files
   * @param {string} cacheDir - Directory for cache files
   */
  constructor(apiKey, tempDir, cacheDir) {
    this.apiKey = apiKey;
    this.tempDir = tempDir;
    this.cloudConvert = new CloudConvert(apiKey, false); // false = production

    // Initialize cache manager
    this.cacheManager = new CacheManager(cacheDir);

    // Ensure temp directory exists
    this.ensureTempDir();
  }

  /**
   * Ensure the temp directory exists
   */
  ensureTempDir() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        console.log(`Temp directory created: ${this.tempDir}`);
      }
    } catch (error) {
      console.log(`Note: Could not create temp directory: ${error.message}`);
      // Continue anyway, as /tmp should already exist in serverless environments
    }
  }

  /**
   * Convert PDF buffer to PNG with caching
   * @param {Buffer} buffer - PDF buffer
   * @param {string} filename - Original filename
   * @returns {Promise<string>} - Path to PNG file
   */
  async convertPdfToPng(buffer, filename) {
    console.log(`Converting PDF to PNG: ${filename}`);

    // Generate cache key
    const cacheKey = this.cacheManager.generateKey(
      buffer,
      filename.replace(/\.pdf$/i, ".png")
    );
    console.log(`Cache key: ${cacheKey}`);

    // Check if file exists in cache
    const cachedPath = this.cacheManager.get(cacheKey);
    if (cachedPath) {
      console.log(`Using cached PNG: ${cachedPath}`);
      return cachedPath;
    }

    // Not in cache, convert using CloudConvert
    console.log("Cache miss, converting with CloudConvert...");

    try {
      // Create job with optimized settings
      const job = await this.cloudConvert.jobs.create({
        tasks: {
          upload_logo: {
            operation: "import/upload",
          },
          convert_logo: {
            operation: "convert",
            input: "upload_logo",
            input_format: "pdf",
            output_format: "png",
            engine: "mupdf", // Usar a engine padrão MuPDF em vez de GraphicsMagick
            pixel_density: 72,
            width: 326,
            height: 200,
            alpha: true, // Transparent background
            strip: true, // Strip metadata for smaller files
            trim: false, // Don't trim as it might affect positioning
            quality: 90, // Slightly reduced quality for faster conversion
            filename: path.basename(filename.replace(/\.pdf$/i, ".png")),
          },
          export_logo: {
            operation: "export/url",
            input: "convert_logo",
          },
        },
      });

      console.log(`CloudConvert job created: ${job.id}`);

      // Upload the file
      const uploadTask = job.tasks.find((t) => t.name === "upload_logo");
      await this.cloudConvert.tasks.upload(
        uploadTask,
        buffer,
        filename,
        buffer.length
      );
      console.log("File uploaded to CloudConvert");

      // Wait for completion
      console.log("Waiting for conversion to complete...");
      const completed = await this.cloudConvert.jobs.wait(job.id);
      console.log("Conversion completed");
      console.log("CloudConvert response:", JSON.stringify(completed, null, 2));

      // Check if the response contains export URLs
      const exportUrls = this.cloudConvert.jobs.getExportUrls(completed);
      console.log("Export URLs:", JSON.stringify(exportUrls, null, 2));

      if (!exportUrls || exportUrls.length === 0) {
        throw new Error("No export URLs found in CloudConvert response");
      }

      // Download the generated PNG
      const file = exportUrls[0];

      if (!file || !file.url) {
        throw new Error("Invalid export URL in CloudConvert response");
      }

      console.log(`Download URL: ${file.url}`);

      const localPath = path.join(this.tempDir, file.filename);
      console.log(`Downloading to: ${localPath}`);

      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(localPath);
        https.get(file.url, (response) => response.pipe(ws));
        ws.on("finish", () => {
          console.log(`File downloaded to: ${localPath}`);
          resolve();
        });
        ws.on("error", (err) => {
          console.error(`Error writing file: ${err.message}`);
          reject(err);
        });
      });

      // Store in cache
      const cachedFilePath = this.cacheManager.store(cacheKey, localPath);

      return cachedFilePath;
    } catch (error) {
      console.error("Error converting PDF to PNG:", error);
      if (error.response && error.response.data) {
        console.error(
          "API Error Response:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }
}

module.exports = PdfConverter;
