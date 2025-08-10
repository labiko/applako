const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
  try {
    console.log('Converting SVG to PNG...');
    
    // Read SVG content and convert to PNG
    const svgBuffer = fs.readFileSync('resources/icon.svg');
    
    // Generate icon.png (1024x1024 for high quality)
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile('resources/icon.png');
    
    console.log('✅ Icon PNG generated successfully');
    
    // Generate splash.png (2732x2732 - same as source)  
    const splashSvgBuffer = fs.readFileSync('resources/splash.svg');
    
    await sharp(splashSvgBuffer)
      .resize(2732, 2732)
      .png()
      .toFile('resources/splash.png');
      
    console.log('✅ Splash PNG generated successfully');
    
  } catch (error) {
    console.error('❌ Error converting SVG:', error.message);
  }
}

convertSvgToPng();