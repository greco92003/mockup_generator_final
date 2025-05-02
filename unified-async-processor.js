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

  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      await activeCampaign.processLeadBasicInfo(leadData);
      console.log(
        `Lead basic info processed successfully (async): ${leadData.email}`
      );
    } catch (error) {
      console.error("Error processing lead basic info (async):", error);
    }
  }, 100);
}

/**
 * Update mockup URL asynchronously
 * @param {string} email - Email of the lead
 * @param {string} mockupUrl - URL of the mockup
 */
function updateMockupUrlAsync(email, mockupUrl) {
  console.log(`Updating mockup URL asynchronously: ${email}`);
  console.log(`Mockup URL: ${mockupUrl}`);

  if (!mockupUrl) {
    console.error(`Cannot update mockup URL: mockupUrl is ${mockupUrl}`);
    return;
  }

  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      console.log(`Starting async update of mockup URL for ${email}`);
      const result = await activeCampaign.updateLeadMockupUrl(email, mockupUrl);
      console.log(`Mockup URL updated successfully (async): ${email}`);
      console.log(`Update result:`, JSON.stringify(result));
    } catch (error) {
      console.error("Error updating mockup URL (async):", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
  }, 100);
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

module.exports = {
  processLeadBasicInfoAsync,
  updateMockupUrlAsync,
  updateLogoUrlAsync,
  processLeadWithMockupAsync,
};
