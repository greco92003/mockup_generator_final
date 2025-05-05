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

  // Usar setTimeout para tornar não-bloqueante
  setTimeout(async () => {
    try {
      // Verificação adicional dentro da tarefa
      if (!mockupUrl) {
        console.error(
          "Tarefa de atualização: mockupUrl está indefinido, pulando processamento"
        );
        return;
      }

      console.log(
        "Iniciando atualização assíncrona do URL do mockup no ActiveCampaign..."
      );

      try {
        // Usar a nova função com retry
        await updateMockupUrlWithRetry(email, mockupUrl);
        console.log("URL do mockup atualizado com sucesso no ActiveCampaign");
      } catch (acError) {
        console.error(
          "Erro ao atualizar URL do mockup no ActiveCampaign:",
          acError
        );
        console.error("Stack trace:", acError.stack);
        // Não relançamos o erro já que este é um processamento assíncrono
      }
    } catch (error) {
      console.error("Erro na execução da tarefa assíncrona:", error);
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

    // Verificar se mockupUrl é uma URL completa ou apenas uma chave
    let key = mockupUrl;

    if (mockupUrl.includes("amazonaws.com")) {
      // Extrair a chave da URL
      key = s3Storage.extractKeyFromS3Url(mockupUrl);
    }

    console.log(`Chave do objeto para verificação: ${key}`);

    // Aguardar até que o objeto exista e obter a URL
    // A função waitForObjectAndGetUrl foi melhorada para lidar com URLs de placeholder
    // e para procurar objetos com prefixo semelhante
    const validUrl = await s3Storage.waitForObjectAndGetUrl(key);

    console.log(`URL válida obtida após verificação: ${validUrl}`);

    // Verificar se a URL é válida (não contém "fallback" ou "placeholder")
    if (validUrl.includes("fallback") || validUrl.includes("placeholder")) {
      console.warn(`URL obtida contém fallback ou placeholder: ${validUrl}`);
      console.warn(
        "Aguardando mais tempo antes de atualizar o ActiveCampaign..."
      );

      // Aguardar mais tempo (10 segundos) e tentar novamente
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Tentar obter a URL novamente
      const retryUrl = await s3Storage.waitForObjectAndGetUrl(key);
      console.log(`URL obtida após espera adicional: ${retryUrl}`);

      // Se ainda for uma URL de fallback, vamos usar a URL original
      if (retryUrl.includes("fallback") || retryUrl.includes("placeholder")) {
        console.warn("Ainda obtendo URL de fallback, usando URL original");
        // Não atualizar o ActiveCampaign com uma URL de fallback
        return mockupUrl;
      } else {
        // Atualizar no ActiveCampaign com a URL válida
        const activeCampaign = require("./unified-active-campaign-api");
        await activeCampaign.updateLeadMockupUrl(email, retryUrl);

        console.log(
          `URL do mockup atualizada com sucesso no ActiveCampaign para: ${email}`
        );
        return retryUrl;
      }
    } else {
      // Atualizar no ActiveCampaign com a URL válida
      const activeCampaign = require("./unified-active-campaign-api");
      await activeCampaign.updateLeadMockupUrl(email, validUrl);

      console.log(
        `URL do mockup atualizada com sucesso no ActiveCampaign para: ${email}`
      );
      return validUrl;
    }
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
