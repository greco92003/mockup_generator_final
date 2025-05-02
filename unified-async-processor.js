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
      console.log(`Lead basic info processed successfully (async): ${leadData.email}`);
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
  
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      await activeCampaign.updateLeadMockupUrl(email, mockupUrl);
      console.log(`Mockup URL updated successfully (async): ${email}`);
    } catch (error) {
      console.error("Error updating mockup URL (async):", error);
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
  
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      await activeCampaign.updateLeadLogoUrl(email, logoUrl);
      console.log(`Logo URL updated successfully (async): ${email}`);
    } catch (error) {
      console.error("Error updating logo URL (async):", error);
    }
  }, 100);
}

/**
 * Process lead with mockup URL asynchronously
 * @param {object} leadData - Lead data (email, name, phone, segmento)
 * @param {string} mockupUrl - URL of the mockup
 */
function processLeadWithMockupAsync(leadData, mockupUrl) {
  console.log(`Processing lead with mockup URL asynchronously: ${leadData.email}`);
  
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      await activeCampaign.processLeadWithMockup(leadData, mockupUrl);
      console.log(`Lead processed with mockup successfully (async): ${leadData.email}`);
    } catch (error) {
      console.error("Error processing lead with mockup (async):", error);
    }
  }, 100);
}

module.exports = {
  processLeadBasicInfoAsync,
  updateMockupUrlAsync,
  updateLogoUrlAsync,
  processLeadWithMockupAsync
};
