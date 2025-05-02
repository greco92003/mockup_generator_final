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

  // Use immediate Promise execution instead of setTimeout for faster processing
  // This is still non-blocking but starts immediately
  Promise.resolve().then(async () => {
    try {
      await activeCampaign.processLeadBasicInfo(leadData);
      console.log(
        `Lead basic info processed successfully (async): ${leadData.email}`
      );
    } catch (error) {
      console.error("Error processing lead basic info (async):", error);
    }
  });
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

  // Convert mockupUrl to direct URL if it's a pre-signed URL
  let finalMockupUrl = mockupUrl;
  if (mockupUrl.includes("?")) {
    finalMockupUrl = mockupUrl.split("?")[0];
    console.log(
      "Converting pre-signed URL to direct URL for mockup_url field:"
    );
    console.log("Original URL:", mockupUrl);
    console.log("Direct URL:", finalMockupUrl);
  }

  // Ensure the URL includes the region
  if (
    finalMockupUrl.includes("s3.amazonaws.com") &&
    !finalMockupUrl.includes("s3.us-east-1.amazonaws.com")
  ) {
    console.log("Fixing S3 URL to include region...");
    finalMockupUrl = finalMockupUrl.replace(
      "s3.amazonaws.com",
      "s3.us-east-1.amazonaws.com"
    );
    console.log("Fixed URL with region:", finalMockupUrl);
  }

  // Ensure the URL is using the correct bucket format
  if (!finalMockupUrl.includes("mockup-hudlab.s3.us-east-1.amazonaws.com")) {
    // Check if it's using a different format but still our bucket
    if (
      finalMockupUrl.includes("mockup-hudlab") &&
      finalMockupUrl.includes("amazonaws.com")
    ) {
      console.log("URL is using incorrect format, fixing...");
      // Extract the key part (everything after the bucket name)
      const urlParts = finalMockupUrl.split("/");
      const bucketIndex = urlParts.findIndex((part) =>
        part.includes("mockup-hudlab")
      );
      if (bucketIndex >= 0) {
        const keyParts = urlParts.slice(bucketIndex + 1);
        const key = keyParts.join("/");
        finalMockupUrl = `https://mockup-hudlab.s3.us-east-1.amazonaws.com/${key}`;
        console.log("Corrected URL format:", finalMockupUrl);
      }
    }
  }

  // IMPORTANTE: Não gerar URLs fictícias. Se a URL não parece válida, não enviar para o ActiveCampaign
  if (!finalMockupUrl.includes("/mockups/")) {
    console.error(
      "ERRO CRÍTICO: A URL do mockup não contém o caminho '/mockups/' esperado. Não será enviada para o ActiveCampaign."
    );
    console.error("URL inválida:", finalMockupUrl);
    return;
  }

  // Verificar se a URL parece ser uma URL direta do S3 válida
  if (
    !finalMockupUrl.match(
      /https:\/\/mockup-hudlab\.s3\.[a-z0-9-]+\.amazonaws\.com\/mockups\/.+\.png/
    )
  ) {
    console.warn(
      "AVISO: A URL do mockup não parece ser uma URL direta válida do S3. Verificando formato..."
    );

    // Verificação adicional para garantir que é uma URL válida
    if (!finalMockupUrl.endsWith(".png")) {
      console.error(
        "ERRO: A URL do mockup não termina com '.png'. Não será enviada para o ActiveCampaign."
      );
      console.error("URL inválida:", finalMockupUrl);
      return;
    }
  }

  // Use immediate Promise execution instead of setTimeout for faster processing
  Promise.resolve().then(async () => {
    try {
      console.log(`Starting async update of mockup URL for ${email}`);
      console.log(
        `Final mockup URL being sent to ActiveCampaign: ${finalMockupUrl}`
      );
      const result = await activeCampaign.updateLeadMockupUrl(
        email,
        finalMockupUrl
      );
      console.log(`Mockup URL updated successfully (async): ${email}`);
      console.log(`Update result:`, JSON.stringify(result));
    } catch (error) {
      console.error("Error updating mockup URL (async):", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
  });
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

  // Use immediate Promise execution instead of setTimeout for faster processing
  Promise.resolve().then(async () => {
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
  });
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

  // Use immediate Promise execution instead of setTimeout for faster processing
  Promise.resolve().then(async () => {
    try {
      await activeCampaign.processLeadWithMockup(leadData, mockupUrl);
      console.log(
        `Lead processed with mockup successfully (async): ${leadData.email}`
      );
    } catch (error) {
      console.error("Error processing lead with mockup (async):", error);
    }
  });
}

module.exports = {
  processLeadBasicInfoAsync,
  updateMockupUrlAsync,
  updateLogoUrlAsync,
  processLeadWithMockupAsync,
};
