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

    // Extract mockup URL from response
    let mockupUrl = null;

    // First, try to get the direct URL from the response
    if (response.data.mockupUrl) {
      console.log("Found mockupUrl in response:", response.data.mockupUrl);
      mockupUrl = response.data.mockupUrl;
    } else if (response.data.url) {
      console.log("Found url in response:", response.data.url);
      mockupUrl = response.data.url;
    }

    // Check if the response contains a body field (API Gateway format)
    if (!mockupUrl && response.data.body) {
      try {
        // Try to parse the body if it's a string
        const bodyContent =
          typeof response.data.body === "string"
            ? JSON.parse(response.data.body)
            : response.data.body;

        // If there's a mockupUrl in the body, use it
        if (bodyContent.mockupUrl) {
          console.log(
            "Found mockupUrl in response body:",
            bodyContent.mockupUrl
          );
          mockupUrl = bodyContent.mockupUrl;
        } else if (bodyContent.directUrl) {
          console.log(
            "Found directUrl in response body:",
            bodyContent.directUrl
          );
          mockupUrl = bodyContent.directUrl;
        } else if (bodyContent.url) {
          console.log("Found url in response body:", bodyContent.url);
          mockupUrl = bodyContent.url;
        }

        // Also extract timestamp if available
        if (bodyContent.timestamp) {
          console.log(
            "Found timestamp in response body:",
            bodyContent.timestamp
          );
          response.data.timestamp = bodyContent.timestamp;
        }

        // Extract mockup key if available
        if (bodyContent.mockupKey) {
          console.log(
            "Found mockupKey in response body:",
            bodyContent.mockupKey
          );
          response.data.mockupKey = bodyContent.mockupKey;
        }
      } catch (parseError) {
        console.error("Error parsing Lambda response body:", parseError);
        console.error("Response body:", response.data.body);
      }
    }

    // Log the full response for debugging
    console.log(
      "Full Lambda response:",
      JSON.stringify(response.data, null, 2)
    );

    // Extract timestamp from response if available
    let timestamp = null;
    if (response.data.timestamp) {
      timestamp = response.data.timestamp;
      console.log("Found timestamp in response:", timestamp);
    } else if (response.data.body && typeof response.data.body === "string") {
      try {
        const bodyContent = JSON.parse(response.data.body);
        if (bodyContent.timestamp) {
          timestamp = bodyContent.timestamp;
          console.log("Found timestamp in response body:", timestamp);
        }
      } catch (parseError) {
        console.error("Error parsing response body for timestamp:", parseError);
      }
    }

    if (!mockupUrl) {
      console.error("No mockup URL found in Lambda response");
      console.error("Response data:", JSON.stringify(response.data, null, 2));

      // In this case, we don't want to generate a fallback URL anymore
      // We'll return null and let the caller handle it
      return null;
    }

    // If we have a timestamp but it's not in the URL, fix the URL
    if (
      timestamp &&
      mockupUrl.includes("-at-") &&
      !mockupUrl.includes(`-${timestamp}`)
    ) {
      console.log("Timestamp mismatch detected in URL");
      console.log("Original URL:", mockupUrl);

      // Extract the email part from the URL
      const urlParts = mockupUrl.split("/");
      const filenameWithExt = urlParts[urlParts.length - 1];
      const filenameParts = filenameWithExt.split("-");

      // Find the part before the timestamp (email)
      let emailPart = "";
      for (let i = 0; i < filenameParts.length; i++) {
        if (filenameParts[i].includes("at") && i < filenameParts.length - 1) {
          // Found the email part, reconstruct it up to this point
          emailPart = filenameParts.slice(0, i + 1).join("-");
          break;
        }
      }

      if (emailPart) {
        // Reconstruct the URL with the correct timestamp
        const extension = filenameWithExt.split(".").pop();
        const newFilename = `${emailPart}-${timestamp}.${extension}`;
        urlParts[urlParts.length - 1] = newFilename;
        const correctedUrl = urlParts.join("/");

        console.log("Corrected URL with proper timestamp:", correctedUrl);
        mockupUrl = correctedUrl;
      }
    }

    // Convert pre-signed URL to direct URL if needed
    if (mockupUrl.includes("?")) {
      console.log("Converting pre-signed URL to direct URL...");
      const directUrl = mockupUrl.split("?")[0];
      console.log("Original URL:", mockupUrl);
      console.log("Direct URL:", directUrl);
      mockupUrl = directUrl;
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

    // Verify that the URL is a direct S3 bucket URL
    if (
      !mockupUrl.includes("mockup-hudlab.s3") ||
      !mockupUrl.includes("/mockups/")
    ) {
      console.warn(
        "WARNING: Mockup URL does not appear to be a direct S3 bucket URL:",
        mockupUrl
      );

      // Try to extract the key part if it's in a different format
      if (
        mockupUrl.includes("mockup-hudlab") &&
        mockupUrl.includes("amazonaws.com")
      ) {
        const urlParts = mockupUrl.split("/");
        const bucketIndex = urlParts.findIndex((part) =>
          part.includes("mockup-hudlab")
        );

        if (bucketIndex >= 0) {
          const keyParts = urlParts.slice(bucketIndex + 1);
          const key = keyParts.join("/");
          mockupUrl = `https://mockup-hudlab.s3.us-east-1.amazonaws.com/${key}`;
          console.log("Corrected URL format:", mockupUrl);
        }
      }
    }

    console.log("Mockup generated successfully with Lambda:", mockupUrl);

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
