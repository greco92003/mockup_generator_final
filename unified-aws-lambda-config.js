/**
 * Unified AWS Lambda Config Module
 *
 * This module provides functions for interacting with AWS Lambda.
 */

const axios = require("axios");
const dotenv = require("dotenv");
const { withRetry } = require("./unified-retry-helper");

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
 * @param {string} fileType - Type of the logo file (pdf, png, jpg)
 * @returns {Promise<string>} - URL of the generated mockup
 */
async function generateMockupWithLambda(logoUrl, email, name, fileType = "") {
  try {
    console.log("Generating mockup with AWS Lambda...");
    console.log("Logo URL:", logoUrl);
    console.log("Email:", email);
    console.log("Name:", name);
    console.log("File Type:", fileType);

    // Determine if the file is a PDF based on the file extension or fileType parameter
    const isPdf =
      (logoUrl && logoUrl.toLowerCase().endsWith(".pdf")) ||
      (fileType && fileType.toLowerCase() === "pdf");

    console.log("Is PDF:", isPdf);

    // Set up headers
    const headers = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }

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
            isPdf, // Add the isPdf flag to inform Lambda if conversion is needed
          },
          {
            headers,
            timeout: 30000, // 30 second timeout
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

    console.log("Lambda response status:", response.status);
    console.log(
      "Lambda response data:",
      JSON.stringify(response.data).substring(0, 200) + "..."
    );

    // Check for Lambda execution errors
    if (response.data.errorType) {
      console.error("Lambda execution error:", response.data);

      // If the error is "Runtime exited with error: signal: killed", it's likely a memory or timeout issue
      if (
        response.data.errorMessage &&
        response.data.errorMessage.includes("signal: killed")
      ) {
        console.error(
          "Lambda was killed due to resource constraints. No mockup URL will be generated."
        );
        return null;
      }

      throw new Error(
        `Lambda execution error: ${
          response.data.errorMessage || response.data.errorType
        }`
      );
    }

    // Log the full response for debugging
    console.log(
      "Full Lambda response:",
      JSON.stringify(response.data, null, 2)
    );

    // Extract mockup URL from response
    let mockupUrl = null;
    let directUrl = null;

    // Check if the response contains a body field (API Gateway format)
    if (response.data.body) {
      try {
        // Try to parse the body if it's a string
        const bodyContent =
          typeof response.data.body === "string"
            ? JSON.parse(response.data.body)
            : response.data.body;

        console.log(
          "Parsed body content:",
          JSON.stringify(bodyContent).substring(0, 200) + "..."
        );

        // First, try to get the direct URL from the body
        if (bodyContent.directUrl) {
          console.log(
            "Found directUrl in response body:",
            bodyContent.directUrl
          );
          directUrl = bodyContent.directUrl;
          mockupUrl = directUrl; // Use direct URL as primary
        } else if (bodyContent.mockupUrl) {
          console.log(
            "Found mockupUrl in response body:",
            bodyContent.mockupUrl
          );
          mockupUrl = bodyContent.mockupUrl;
        } else if (bodyContent.url) {
          console.log("Found url in response body:", bodyContent.url);
          mockupUrl = bodyContent.url;
        }

        // Extract mockup key if available
        if (bodyContent.mockupKey) {
          console.log(
            "Found mockupKey in response body:",
            bodyContent.mockupKey
          );

          // If we have the mockup key but no URL, construct the direct URL
          if (!mockupUrl && bodyContent.mockupKey) {
            directUrl = `https://mockup-hudlab.s3.us-east-1.amazonaws.com/${bodyContent.mockupKey}`;
            console.log("Constructed direct URL from mockupKey:", directUrl);
            mockupUrl = directUrl;
          }
        }

        // Extract email and timestamp if available
        let email = null;
        let timestamp = null;

        if (bodyContent.email) {
          email = bodyContent.email;
          console.log("Found email in response body:", email);
        }

        if (bodyContent.timestamp) {
          timestamp = bodyContent.timestamp;
          console.log("Found timestamp in response body:", timestamp);

          // If we have email and timestamp but no URL, construct the direct URL
          if (!mockupUrl && email && timestamp) {
            const safeEmail = email.replace("@", "-at-").replace(".", "-dot-");
            directUrl = `https://mockup-hudlab.s3.us-east-1.amazonaws.com/mockups/${safeEmail}-${timestamp}.png`;
            console.log(
              "Constructed direct URL from email and timestamp:",
              directUrl
            );
            mockupUrl = directUrl;
          }
        }
      } catch (parseError) {
        console.error("Error parsing Lambda response body:", parseError);
        console.error("Response body:", response.data.body);
      }
    }

    // If we still don't have a URL, try to get it directly from the response
    if (!mockupUrl) {
      if (response.data.directUrl) {
        console.log("Found directUrl in response:", response.data.directUrl);
        directUrl = response.data.directUrl;
        mockupUrl = directUrl;
      } else if (response.data.mockupUrl) {
        console.log("Found mockupUrl in response:", response.data.mockupUrl);
        mockupUrl = response.data.mockupUrl;
      } else if (response.data.url) {
        console.log("Found url in response:", response.data.url);
        mockupUrl = response.data.url;
      }
    }

    // If we still don't have a URL, look for it in the logs
    if (!mockupUrl) {
      // Try to extract the URL from the logs if available
      const logs = response.data.logs || "";
      if (typeof logs === "string" && logs.includes("DIRECT_MOCKUP_URL_FOR_")) {
        const match = logs.match(
          /DIRECT_MOCKUP_URL_FOR_.*?: (https:\/\/.*?\.png)/
        );
        if (match && match[1]) {
          directUrl = match[1];
          console.log("Extracted direct URL from logs:", directUrl);
          mockupUrl = directUrl;
        }
      }
    }

    if (!mockupUrl) {
      console.error("No mockup URL found in Lambda response");
      console.error("Response data:", JSON.stringify(response.data, null, 2));

      // In this case, we don't want to generate a fallback URL anymore
      // We'll return null and let the caller handle it
      return null;
    }

    // Convert pre-signed URL to direct URL if needed
    if (mockupUrl.includes("?")) {
      console.log("Converting pre-signed URL to direct URL...");
      const extractedDirectUrl = mockupUrl.split("?")[0];
      console.log("Original URL:", mockupUrl);
      console.log("Direct URL:", extractedDirectUrl);
      mockupUrl = extractedDirectUrl;
    }

    // Ensure the URL includes the region
    if (
      mockupUrl.includes("s3.amazonaws.com") &&
      !mockupUrl.includes("s3.us-east-1.amazonaws.com")
    ) {
      console.log("Fixing S3 URL to include region...");
      mockupUrl = mockupUrl.replace(
        "s3.amazonaws.com",
        "s3.us-east-1.amazonaws.com"
      );
      console.log("Fixed URL with region:", mockupUrl);
    }

    console.log("Final mockup URL:", mockupUrl);
    return mockupUrl;
  } catch (error) {
    console.error("Error generating mockup with Lambda:", error);
    console.error(
      "Error details:",
      error.response ? error.response.data : error.message
    );

    // Check if the error message contains "signal: killed" or "timeout"
    if (
      error.message &&
      (error.message.includes("signal: killed") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNABORTED"))
    ) {
      console.error(
        "Lambda execution failed due to resource constraints or timeout. No mockup URL will be generated."
      );
      return null;
    }

    // For other errors, we'll still throw
    throw error;
  }
}

// Função generateFallbackMockupUrl removida, pois não queremos mais gerar URLs fictícias

/**
 * Save mockup URL to database or metadata
 * @param {string} mockupUrl - URL of the mockup
 * @param {string} email - Email of the user
 * @returns {Promise<string>} - Public URL of the mockup
 */
async function saveMockupUrl(mockupUrl, email) {
  try {
    console.log(`Saving mockup URL for email: ${email}`);

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
