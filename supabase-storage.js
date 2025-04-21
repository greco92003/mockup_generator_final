const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = "mockups";

// Initialize Supabase client if credentials are available
let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully");
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
  }
} else {
  console.log(
    "Supabase credentials not found, storage will use local filesystem"
  );
}

/**
 * Upload a file to Supabase Storage
 * @param {string} filePath - Path to the file to upload
 * @param {string} fileName - Name to save the file as
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function uploadFileToSupabase(filePath, fileName) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    console.log(`Uploading file to Supabase: ${fileName}`);

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileContent, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("Error uploading to Supabase Storage:", error);
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    console.log("File uploaded to Supabase:", publicUrl);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadFileToSupabase:", error);
    throw error;
  }
}

/**
 * Save mockup to Supabase Storage or local directory based on environment
 * @param {string} mockupPath - Path to the mockup file
 * @param {string} email - Email of the user
 * @returns {Promise<string>} - Public URL of the mockup
 */
async function saveMockup(mockupPath, email) {
  try {
    const fileName = `mockup-${Date.now()}.png`;

    // Check if we're in production and have Supabase client initialized
    if (process.env.NODE_ENV === "production" && supabase) {
      try {
        // Try to upload to Supabase
        return await uploadFileToSupabase(mockupPath, fileName);
      } catch (supabaseError) {
        console.error(
          "Error uploading to Supabase, falling back to local storage:",
          supabaseError
        );
        // Fall back to local storage if Supabase fails
      }
    }

    // Local storage fallback
    const mockupsDir = path.join(__dirname, "public", "mockups");
    if (!fs.existsSync(mockupsDir)) {
      fs.mkdirSync(mockupsDir, { recursive: true });
    }

    const fileContent = fs.readFileSync(mockupPath);
    const filePath = path.join(mockupsDir, fileName);

    // Write file to public directory
    fs.writeFileSync(filePath, fileContent);

    // Generate public URL
    let baseUrl;
    if (process.env.NODE_ENV === "production") {
      baseUrl = process.env.BASE_URL || "https://seu-dominio.com";
    } else {
      baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    }
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
    console.error("Error saving mockup:", error);
    throw error;
  }
}

module.exports = {
  uploadFileToSupabase,
  saveMockup,
};
