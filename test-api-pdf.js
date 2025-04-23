const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function testApiWithPdf() {
  try {
    console.log('Starting API test with PDF file...');
    
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
    
    // Create form data
    const formData = new FormData();
    formData.append('logo', pdfBuffer, {
      filename: 'logo.pdf',
      contentType: 'application/pdf'
    });
    formData.append('email', 'test@example.com');
    formData.append('name', 'Test User');
    
    console.log('Sending request to /api/mockup...');
    
    // Send request to the API
    const response = await axios.post('http://localhost:3000/api/mockup', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  }
}

// Run the test
testApiWithPdf();
