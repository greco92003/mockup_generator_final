/**
 * Unified Async Processor Module
 *
 * This module provides functions for processing tasks asynchronously.
 */

const activeCampaign = require("./unified-active-campaign-api");

/**
 * Process lead basic information asynchronously
 * @param {object} leadData - Lead data (email, name, phone, segmento)
 */
function processLeadBasicInfoAsync(leadData) {
  console.log(`Processing lead basic info asynchronously: ${leadData.email}`);
  console.log(`Lead data:`, JSON.stringify(leadData));

  // Validate input data
  if (!leadData || !leadData.email) {
    console.error("Invalid lead data: Missing email");
    return;
  }

  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      console.log(`Starting async processing for lead: ${leadData.email}`);

      // Add retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          if (retryCount > 0) {
            console.log(
              `Retry attempt ${retryCount} for lead: ${leadData.email}`
            );
            // Wait longer between retries
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * retryCount)
            );
          }

          const result = await activeCampaign.processLeadBasicInfo(leadData);
          console.log(
            `Lead basic info processed successfully (async): ${leadData.email}`
          );
          console.log(`Result:`, JSON.stringify(result));
          success = true;
        } catch (retryError) {
          retryCount++;
          console.error(`Error on attempt ${retryCount}:`, retryError);

          if (retryCount >= maxRetries) {
            throw retryError; // Rethrow the last error if we've exhausted retries
          }
        }
      }
    } catch (error) {
      console.error("Error processing lead basic info (async):", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
      console.error(
        "CRITICAL: Failed to create contact in ActiveCampaign after multiple retries!"
      );
    }
  }, 100);
}

/**
 * Update mockup URL asynchronously
 * @param {string} email - Email of the lead
 * @param {string} mockupUrl - URL of the mockup
 */
function updateMockupUrlAsync(email, mockupUrl) {
  if (!mockupUrl) {
    console.error(
      "updateMockupUrlAsync: mockupUrl está indefinido, pulando processamento"
    );
    return;
  }

  console.log(
    `Agendando atualização assíncrona do URL do mockup para: ${email}`
  );
  console.log(`URL do mockup a ser atualizada: ${mockupUrl}`);

  // Verify URL format and extract timestamp if present
  if (mockupUrl && mockupUrl.includes("-at-") && mockupUrl.includes(".png")) {
    const urlParts = mockupUrl.split("/");
    const filename = urlParts[urlParts.length - 1];
    console.log(`Filename from URL: ${filename}`);

    // Extract timestamp if present
    const matches = filename.match(/-(\d+)\.png$/);
    if (matches && matches[1]) {
      console.log(`Timestamp in URL: ${matches[1]}`);
      console.log(`Timestamp length: ${matches[1].length} digits`);

      // Check if timestamp is in milliseconds (typically 13 digits) or seconds (typically 10 digits)
      if (matches[1].length < 13 && matches[1].length > 9) {
        console.warn(
          `WARNING: Timestamp appears to be in seconds, not milliseconds: ${matches[1]}`
        );
      }
    } else {
      console.log(`No timestamp found in filename: ${filename}`);
    }
  }

  // Simplified approach with fewer retries and more direct execution
  const retryIntervals = [100, 3000, 10000]; // 100ms, 3s, 10s

  // Function to attempt update with retry
  const attemptUpdate = (attemptIndex) => {
    if (attemptIndex >= retryIntervals.length) {
      console.log(`All ${retryIntervals.length} update attempts completed.`);
      return;
    }

    const delay = retryIntervals[attemptIndex];
    console.log(`Scheduling attempt #${attemptIndex + 1} in ${delay}ms`);

    // Use setTimeout to make it non-blocking
    setTimeout(async () => {
      try {
        console.log(
          `Starting attempt #${
            attemptIndex + 1
          } to update mockup URL in ActiveCampaign...`
        );

        try {
          // Use the improved retry function
          const result = await updateMockupUrlWithRetry(email, mockupUrl);

          if (result) {
            console.log(
              `Attempt #${
                attemptIndex + 1
              }: Mockup URL successfully updated in ActiveCampaign`
            );
          } else {
            console.warn(`Attempt #${attemptIndex + 1}: No valid URL found`);

            // Try a more direct approach on the next attempt
            if (attemptIndex + 1 < retryIntervals.length) {
              console.log(`Will try a more direct approach on next attempt`);
              attemptUpdate(attemptIndex + 1);
            }
          }
        } catch (acError) {
          console.error(
            `Attempt #${
              attemptIndex + 1
            }: Error updating mockup URL in ActiveCampaign:`,
            acError
          );

          // Schedule next attempt
          if (attemptIndex + 1 < retryIntervals.length) {
            attemptUpdate(attemptIndex + 1);
          }
        }
      } catch (error) {
        console.error(
          `Attempt #${attemptIndex + 1}: Error in async task execution:`,
          error
        );

        // Schedule next attempt
        if (attemptIndex + 1 < retryIntervals.length) {
          attemptUpdate(attemptIndex + 1);
        }
      }
    }, delay);
  };

  // Start the first attempt
  attemptUpdate(0);
}

/**
 * Update logo URL asynchronously
 * @param {string} email - Email of the lead
 * @param {string} logoUrl - URL of the logo
 */
function updateLogoUrlAsync(email, logoUrl) {
  console.log(`Updating logo URL asynchronously: ${email}`);
  console.log(`Logo URL: ${logoUrl}`);

  if (!logoUrl) {
    console.error(`Cannot update logo URL: logoUrl is ${logoUrl}`);
    return;
  }

  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      console.log(`Starting async update of logo URL for ${email}`);
      const result = await activeCampaign.updateLeadLogoUrl(email, logoUrl);
      console.log(`Logo URL updated successfully (async): ${email}`);
      console.log(`Update result:`, JSON.stringify(result));
    } catch (error) {
      console.error("Error updating logo URL (async):", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
  }, 100);
}

/**
 * Process lead with mockup URL asynchronously
 * @param {object} leadData - Lead data (email, name, phone, segmento)
 * @param {string} mockupUrl - URL of the mockup
 */
function processLeadWithMockupAsync(leadData, mockupUrl) {
  console.log(
    `Processing lead with mockup URL asynchronously: ${leadData.email}`
  );

  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      await activeCampaign.processLeadWithMockup(leadData, mockupUrl);
      console.log(
        `Lead processed with mockup successfully (async): ${leadData.email}`
      );
    } catch (error) {
      console.error("Error processing lead with mockup (async):", error);
    }
  }, 100);
}

/**
 * Atualiza a URL do mockup no ActiveCampaign com retry para garantir que o objeto existe
 * @param {string} email - Email do usuário
 * @param {string} mockupUrl - URL do mockup ou chave do objeto
 * @returns {Promise<string>} - URL válida do mockup
 */
async function updateMockupUrlWithRetry(email, mockupUrl) {
  try {
    console.log(
      `Iniciando processo de atualização de URL com retry para: ${email}`
    );
    console.log(`URL ou chave original: ${mockupUrl}`);

    // Importar o módulo de storage
    const s3Storage = require("./unified-s3-storage");

    // Convert email to the format used in S3 keys
    const safeEmail = email.replace("@", "-at-").replace(".", "-dot-");
    const mockupsPrefix = `mockups/${safeEmail}`;

    console.log(`Looking for latest mockup with prefix: ${mockupsPrefix}`);

    // DIRECT APPROACH: Try to find the latest mockup for this email in S3
    try {
      const latestMockupUrl = await s3Storage.findLatestObjectWithPrefix(
        mockupsPrefix
      );

      if (latestMockupUrl) {
        console.log(`Found latest mockup in S3: ${latestMockupUrl}`);

        // Update ActiveCampaign with the direct URL found
        const activeCampaign = require("./unified-active-campaign-api");
        await activeCampaign.updateLeadMockupUrl(email, latestMockupUrl);

        console.log(
          `Mockup URL successfully updated in ActiveCampaign for: ${email}`
        );
        return latestMockupUrl;
      } else {
        console.log(`No mockup found in S3 with prefix: ${mockupsPrefix}`);
      }
    } catch (s3Error) {
      console.error(`Error finding mockup in S3: ${s3Error}`);
    }

    // FALLBACK: If we couldn't find a mockup by email prefix, try using the provided URL
    if (mockupUrl) {
      console.log(`Using provided mockup URL as fallback: ${mockupUrl}`);

      // Ensure we're using a direct S3 URL without query parameters
      let finalUrl = mockupUrl;
      if (finalUrl.includes("?")) {
        finalUrl = finalUrl.split("?")[0];
        console.log("Converted pre-signed URL to direct URL:", finalUrl);
      }

      // Ensure the URL includes the region
      if (
        finalUrl.includes("s3.amazonaws.com") &&
        !finalUrl.includes("s3.us-east-1.amazonaws.com")
      ) {
        finalUrl = finalUrl.replace(
          "s3.amazonaws.com",
          "s3.us-east-1.amazonaws.com"
        );
        console.log("Fixed URL to include region:", finalUrl);
      }

      // Update ActiveCampaign with the provided URL
      const activeCampaign = require("./unified-active-campaign-api");
      await activeCampaign.updateLeadMockupUrl(email, finalUrl);

      console.log(
        `Mockup URL successfully updated in ActiveCampaign using provided URL for: ${email}`
      );
      return finalUrl;
    }

    console.error("No valid mockup URL found for email:", email);
    return null;
  } catch (error) {
    console.error(`Erro ao atualizar URL do mockup com retry:`, error);
    throw error;
  }
}

module.exports = {
  processLeadBasicInfoAsync,
  updateMockupUrlAsync,
  updateLogoUrlAsync,
  processLeadWithMockupAsync,
  updateMockupUrlWithRetry,
};
