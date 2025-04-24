const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { withRetry } = require("./retry-helper");

// Load environment variables
dotenv.config();

// AWS Lambda API endpoint
const LAMBDA_API_ENDPOINT =
  process.env.LAMBDA_API_ENDPOINT ||
  "https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod/mockup";

// AWS API Key (if required)
const API_KEY = process.env.AWS_API_KEY || "";

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

    // Prepare headers with API key if available
    const headers = {};
    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }

    // Call the Lambda function via API Gateway with shorter timeout
    console.log("Calling Lambda function at:", LAMBDA_API_ENDPOINT);
    console.log("With headers:", headers);
    console.log("With payload:", { logoUrl, email, name });

    // Start timer for performance measurement
    const lambdaStartTime = Date.now();

    // Set a shorter timeout and use retry logic with exponential backoff
    const response = await withRetry(
      async () => {
        console.log("Calling Lambda function...");
        return axios.post(
          LAMBDA_API_ENDPOINT,
          {
            logoUrl,
            email,
            name,
          },
          {
            headers,
            timeout: 8000, // 8 second timeout
          }
        );
      },
      {
        maxRetries: 2, // Maximum 2 retries (3 attempts total)
        initialDelay: 500, // Start with 500ms delay
        maxDelay: 2000, // Maximum 2 second delay
        shouldRetry: (error) => {
          // Retry on network errors or 5xx server errors
          return (
            !error.response || // Network error
            (error.response && error.response.status >= 500) // Server error
          );
        },
      }
    );

    // Log Lambda execution time
    const lambdaTime = Date.now() - lambdaStartTime;
    console.log(`Lambda execution time: ${lambdaTime}ms`);

    console.log("Lambda response status:", response.status);
    console.log(
      "Lambda response data:",
      JSON.stringify(response.data, null, 2)
    );

    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(
        `Lambda returned status code ${response.status}: ${
          response.data.message || "Unknown error"
        }`
      );
    }

    // Check for Lambda execution errors
    if (response.data.errorType) {
      console.error("Lambda execution error:", response.data);
      throw new Error(
        `Lambda execution error: ${
          response.data.errorMessage || response.data.errorType
        }`
      );
    }

    // Check if the response contains a body field (API Gateway format)
    if (response.data.body) {
      try {
        // Try to parse the body if it's a string
        const bodyContent =
          typeof response.data.body === "string"
            ? JSON.parse(response.data.body)
            : response.data.body;

        // Check if there's an error message
        if (bodyContent.message && bodyContent.message.includes("Error")) {
          console.error("Lambda execution error:", bodyContent.message);
          throw new Error(`Lambda execution error: ${bodyContent.message}`);
        }

        // If there's a mockupUrl in the body, use it
        if (bodyContent.mockupUrl) {
          return bodyContent.mockupUrl;
        }
      } catch (parseError) {
        console.error("Error parsing Lambda response body:", parseError);
      }
    }

    // Extract the mockup URL from the response
    const mockupUrl = response.data.mockupUrl;
    if (!mockupUrl) {
      console.error("Invalid response from Lambda:", response.data);
      throw new Error(
        "Invalid response from Lambda: mockupUrl not found in response. " +
          "This could be due to permission issues with the AWS Lambda function. " +
          "Please check the Lambda function's permissions and make sure it can access the S3 bucket."
      );
    }

    console.log("Mockup generated successfully with Lambda:", mockupUrl);

    return mockupUrl;
  } catch (error) {
    console.error("Error generating mockup with Lambda:", error);
    console.error(
      "Error details:",
      error.response ? error.response.data : error.message
    );
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
    console.error("Error saving mockup URL:", error);
    throw error;
  }
}

module.exports = {
  generateMockupWithLambda,
  saveMockupUrl,
};
