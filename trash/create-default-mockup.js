/**
 * Script to create and upload a default mockup to S3
 * This will be used as a fallback when the Lambda function fails
 */
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const Jimp = require('jimp');

// Load environment variables
dotenv.config();

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize S3 client
const s3 = new AWS.S3();

// Define paths
const tempDir = path.join(__dirname, 'temp');
const defaultBgPath = path.join(__dirname, 'public', 'backgrounds', 'default-bg.png');
const defaultLogoPath = path.join(__dirname, 'public', 'default-logo.png');
const outputPath = path.join(tempDir, 'default-mockup.png');

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Create default logo if it doesn't exist
async function createDefaultLogoIfNeeded() {
  if (!fs.existsSync(defaultLogoPath)) {
    console.log('Creating default logo...');
    const logo = new Jimp(200, 100, 0xffffffff);
    
    // Add some text to the logo
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    logo.print(font, 10, 40, 'Default Logo');
    
    await logo.writeAsync(defaultLogoPath);
    console.log(`Default logo created at: ${defaultLogoPath}`);
  }
  return defaultLogoPath;
}

// Generate default mockup
async function generateDefaultMockup() {
  try {
    console.log('Generating default mockup...');
    
    // Ensure default logo exists
    const logoPath = await createDefaultLogoIfNeeded();
    
    // Load background
    let background;
    try {
      console.log(`Loading background from: ${defaultBgPath}`);
      if (!fs.existsSync(defaultBgPath)) {
        throw new Error(`Background file not found at: ${defaultBgPath}`);
      }
      
      const bgBuffer = fs.readFileSync(defaultBgPath);
      background = await Jimp.read(bgBuffer);
      console.log('Background loaded successfully');
    } catch (bgError) {
      console.log('Background image not found or couldn\'t be loaded, creating a white background');
      console.error('Error loading background:', bgError);
      background = new Jimp(1920, 1080, 0xffffffff);
      console.log('White background created successfully');
    }
    
    // Load logo
    console.log(`Loading logo from: ${logoPath}`);
    const logoBuffer = fs.readFileSync(logoPath);
    const logo = await Jimp.read(logoBuffer);
    console.log('Logo loaded successfully');
    
    // Define size limits for chinelos and etiquetas
    const defaultSlipperHeight = 100; // altura padrão para chinelos
    const defaultLabelHeight = 60; // altura padrão para etiquetas
    const maxSlipperWidth = 163; // largura máxima para chinelos
    const maxLabelWidth = 64; // largura máxima para etiquetas
    
    // Calculate dimensions for slippers
    const aspectRatio = logo.bitmap.width / logo.bitmap.height;
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
    const slipperLogo = logo.clone().resize(finalSlipperWidth, finalSlipperHeight);
    
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
    
    // Save the mockup
    await background.writeAsync(outputPath);
    console.log(`Default mockup saved to: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating default mockup:', error);
    throw error;
  }
}

// Upload mockup to S3
async function uploadMockupToS3(filePath) {
  try {
    console.log(`Uploading default mockup to S3...`);
    
    const fileContent = fs.readFileSync(filePath);
    const params = {
      Bucket: process.env.S3_BUCKET || 'mockup-hudlab',
      Key: 'mockups/default-mockup.png',
      Body: fileContent,
      ContentType: 'image/png',
      ACL: 'public-read', // Make it publicly accessible
    };
    
    const result = await s3.upload(params).promise();
    console.log('Default mockup uploaded to S3:');
    console.log('- Location:', result.Location);
    console.log('- Key:', result.Key);
    
    // Update .env file with the default mockup URL
    const envContent = fs.readFileSync('.env', 'utf8');
    const updatedEnvContent = envContent.includes('DEFAULT_MOCKUP_URL=')
      ? envContent.replace(/DEFAULT_MOCKUP_URL=.*/, `DEFAULT_MOCKUP_URL=${result.Location}`)
      : `${envContent}\nDEFAULT_MOCKUP_URL=${result.Location}`;
    
    fs.writeFileSync('.env', updatedEnvContent);
    console.log(`Updated .env file with DEFAULT_MOCKUP_URL=${result.Location}`);
    
    return result.Location;
  } catch (error) {
    console.error('Error uploading mockup to S3:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    const mockupPath = await generateDefaultMockup();
    const mockupUrl = await uploadMockupToS3(mockupPath);
    console.log('Default mockup created and uploaded successfully!');
    console.log('URL:', mockupUrl);
    
    // Clean up
    fs.unlinkSync(mockupPath);
    console.log('Temporary file cleaned up');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
main();
