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

  // Implementar múltiplas tentativas com intervalos crescentes
  const retryIntervals = [100, 5000, 15000, 30000, 60000]; // 100ms, 5s, 15s, 30s, 60s

  // Função para tentar atualizar com retry
  const attemptUpdate = (attemptIndex) => {
    if (attemptIndex >= retryIntervals.length) {
      console.log(
        `Todas as ${retryIntervals.length} tentativas de atualização foram realizadas.`
      );
      return;
    }

    const delay = retryIntervals[attemptIndex];
    console.log(
      `Agendando tentativa #${attemptIndex + 1} para daqui a ${delay}ms`
    );

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
          `Iniciando tentativa #${
            attemptIndex + 1
          } de atualização assíncrona do URL do mockup no ActiveCampaign...`
        );

        try {
          // Usar a nova função com retry
          const result = await updateMockupUrlWithRetry(email, mockupUrl);

          if (result && !result.includes("placeholder")) {
            console.log(
              `Tentativa #${
                attemptIndex + 1
              }: URL do mockup atualizado com sucesso no ActiveCampaign`
            );
          } else {
            console.warn(
              `Tentativa #${
                attemptIndex + 1
              }: URL ainda contém placeholder ou não é válida`
            );
            // Agendar próxima tentativa
            attemptUpdate(attemptIndex + 1);
          }
        } catch (acError) {
          console.error(
            `Tentativa #${
              attemptIndex + 1
            }: Erro ao atualizar URL do mockup no ActiveCampaign:`,
            acError
          );
          console.error("Stack trace:", acError.stack);

          // Agendar próxima tentativa
          attemptUpdate(attemptIndex + 1);
        }
      } catch (error) {
        console.error(
          `Tentativa #${
            attemptIndex + 1
          }: Erro na execução da tarefa assíncrona:`,
          error
        );

        // Agendar próxima tentativa
        attemptUpdate(attemptIndex + 1);
      }
    }, delay);
  };

  // Iniciar a primeira tentativa
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

    // Verificar se mockupUrl é uma URL completa ou apenas uma chave
    let key = mockupUrl;

    if (mockupUrl.includes("amazonaws.com")) {
      // Extrair a chave da URL
      key = s3Storage.extractKeyFromS3Url(mockupUrl);
    }

    console.log(`Chave do objeto para verificação: ${key}`);

    // Extract the email from the URL for verification
    let safeEmail = "";

    if (key.includes("mockups/") && key.includes("-at-")) {
      // Expected format: mockups/email-at-domain-dot-com-timestamp.png
      const keyParts = key.split("/");
      const filename = keyParts[keyParts.length - 1];
      console.log(`Filename extracted from key: ${filename}`);

      // Extract the email part (everything before the last dash)
      const lastDashIndex = filename.lastIndexOf("-");
      if (lastDashIndex > 0) {
        safeEmail = filename.substring(0, lastDashIndex);
        console.log(`Safe email extracted from URL: ${safeEmail}`);
      } else {
        // If there's no dash, try to extract the email part before the extension
        const dotIndex = filename.lastIndexOf(".");
        if (dotIndex > 0) {
          safeEmail = filename.substring(0, dotIndex);
          console.log(`Safe email extracted from URL (no dash): ${safeEmail}`);
        }
      }
    } else if (email) {
      // If we can't extract from the URL but we have the email, use it
      safeEmail = email.replace("@", "-at-").replace(".", "-dot-");
      console.log(`Using provided email to create safe email: ${safeEmail}`);
    }

    // Aguardar até que o objeto exista e obter a URL
    // A função waitForObjectAndGetUrl foi melhorada para lidar com URLs de placeholder
    // e para procurar objetos com prefixo semelhante
    const validUrl = await s3Storage.waitForObjectAndGetUrl(
      key,
      15,
      2000,
      20000
    );

    console.log(`URL válida obtida após verificação: ${validUrl}`);

    // Verificar se a URL é válida (não contém "fallback" ou "placeholder")
    if (validUrl.includes("fallback") || validUrl.includes("placeholder")) {
      console.warn(`URL obtida contém fallback ou placeholder: ${validUrl}`);
      console.warn(
        "Aguardando mais tempo antes de atualizar o ActiveCampaign..."
      );

      // Aguardar mais tempo (15 segundos) e tentar novamente
      await new Promise((resolve) => setTimeout(resolve, 15000));

      // Tentar obter a URL novamente com mais tentativas
      const retryUrl = await s3Storage.waitForObjectAndGetUrl(
        key,
        20,
        3000,
        30000
      );
      console.log(`URL obtida após espera adicional: ${retryUrl}`);

      // Se ainda for uma URL de fallback, vamos tentar buscar diretamente pelo email
      if (retryUrl.includes("fallback") || retryUrl.includes("placeholder")) {
        console.warn(
          "Ainda obtendo URL de fallback, tentando buscar pelo email..."
        );

        if (safeEmail) {
          // Tentar buscar qualquer mockup recente para este email
          const mockupsPrefix = `mockups/${safeEmail}`;
          console.log(`Buscando mockups com prefixo: ${mockupsPrefix}`);

          const latestMockupUrl = await s3Storage.findLatestObjectWithPrefix(
            mockupsPrefix
          );

          if (
            latestMockupUrl &&
            !latestMockupUrl.includes("placeholder") &&
            !latestMockupUrl.includes("fallback")
          ) {
            console.log(`Encontrado mockup mais recente: ${latestMockupUrl}`);

            // Atualizar no ActiveCampaign com a URL válida encontrada
            const activeCampaign = require("./unified-active-campaign-api");
            await activeCampaign.updateLeadMockupUrl(email, latestMockupUrl);

            console.log(
              `URL do mockup atualizada com sucesso no ActiveCampaign para: ${email}`
            );
            return latestMockupUrl;
          } else {
            console.warn(
              "Não foi possível encontrar um mockup válido, usando URL original"
            );
            return mockupUrl;
          }
        } else {
          console.warn(
            "Não foi possível extrair o email da URL, usando URL original"
          );
          return mockupUrl;
        }
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
