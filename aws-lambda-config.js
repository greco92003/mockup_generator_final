const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// AWS Lambda API endpoint
const LAMBDA_API_ENDPOINT = process.env.LAMBDA_API_ENDPOINT || 'https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod/mockup';

/**
 * Generate a mockup using AWS Lambda
 * @param {string} logoUrl - URL of the logo (must be publicly accessible)
 * @param {string} email - Email of the user
 * @param {string} name - Name of the user
 * @returns {Promise<string>} - URL of the generated mockup
 */
async function generateMockupWithLambda(logoUrl, email, name) {
  try {
    console.log("Generating mockup with AWS Lambda...");
    console.log("Logo URL:", logoUrl);
    console.log("Email:", email);
    console.log("Name:", name);

    // Call the Lambda function via API Gateway
    const response = await axios.post(LAMBDA_API_ENDPOINT, {
      logoUrl,
      email,
      name
    });

    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(`Lambda returned status code ${response.status}: ${response.data.message || 'Unknown error'}`);
    }

    // Extract the mockup URL from the response
    const mockupUrl = response.data.mockupUrl;
    console.log("Mockup generated successfully with Lambda:", mockupUrl);

    return mockupUrl;
  } catch (error) {
    console.error("Error generating mockup with Lambda:", error);
    console.error("Error details:", error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Save mockup URL to database or metadata
 * @param {string} mockupUrl - URL of the mockup
 * @param {string} email - Email of the user
 * @returns {Promise<string>} - Public URL of the mockup
 */
async function saveMockupUrl(mockupUrl, email) {
  try {
    console.log(`Saving mockup URL for email: ${email}`);
    
    // Generate a unique ID for the mockup
    const mockupId = `mockup-${Date.now()}`;
    
    // In a production environment, you would save this to a database
    // For now, we'll just return the URL
    
    return mockupUrl;
  } catch (error) {
    console.error('Error saving mockup URL:', error);
    throw error;
  }
}

module.exports = {
  generateMockupWithLambda,
  saveMockupUrl
};
