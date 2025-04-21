const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// AWS Lambda API endpoint
const LAMBDA_API_ENDPOINT = process.env.LAMBDA_API_ENDPOINT || 'https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod/mockup';
const API_KEY = process.env.AWS_API_KEY || '';

async function testLambdaAPI() {
  try {
    console.log('Testing Lambda API...');
    console.log('Endpoint:', LAMBDA_API_ENDPOINT);
    
    // Prepare headers
    const headers = {};
    if (API_KEY) {
      console.log('Using API Key:', API_KEY.substring(0, 3) + '...');
      headers['x-api-key'] = API_KEY;
    } else {
      console.log('No API Key provided');
    }
    
    // Test data
    const testData = {
      logoUrl: 'https://example.com/logo.png',
      email: 'test@example.com',
      name: 'Test User'
    };
    
    console.log('Sending test request with data:', testData);
    
    // Make the request
    const response = await axios.post(LAMBDA_API_ENDPOINT, testData, { headers });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error testing Lambda API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    throw error;
  }
}

// Run the test
testLambdaAPI()
  .then(result => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed');
    process.exit(1);
  });
