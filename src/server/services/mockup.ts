import Jimp from 'jimp';
import path from 'path';

interface MockupOptions {
  bgPath?: string;
  width?: number;
  height?: number;
}

/** 
 * Receives path to logo PNG + options and generates the mockup, returning a Buffer PNG 
 */
export async function generateMockup(
  logoPath: string, 
  options: MockupOptions = {}
): Promise<Buffer> {
  const {
    bgPath = path.join(process.cwd(), 'public', 'backgrounds', 'default-bg.png'),
    width = 1920,
    height = 1080
  } = options;

  try {
    // Load background image
    let background: Jimp;
    try {
      background = await Jimp.read(bgPath);
    } catch (error) {
      // If background doesn't exist, create a white background
      background = new Jimp(width, height, 0xFFFFFFFF);
      // Add some text to indicate it's a mockup
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
      background.print(font, 10, 10, 'Mockup Background');
    }
    
    // Resize background to desired dimensions
    background.resize(width, height);

    // Load logo
    const logo = await Jimp.read(logoPath);
    
    // Scale logo to fit within 40% of the width
    const logoMaxW = width * 0.4;
    const scale = logo.bitmap.width > logoMaxW ? logoMaxW / logo.bitmap.width : 1;
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
    console.error('Error generating mockup:', error);
    throw error;
  }
}
