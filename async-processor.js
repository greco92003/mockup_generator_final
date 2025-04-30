/**
 * Module for handling asynchronous processing tasks
 */
const activeCampaign = require("./active-campaign-api");

// Queue for storing pending tasks
const taskQueue = [];

// Flag to indicate if the processor is running
let isProcessing = false;

/**
 * Add a task to the queue and start processing if not already running
 * @param {Function} task - The task function to execute
 * @param {Object} data - Data to pass to the task
 */
function addTask(task, data) {
  console.log("Adding task to async queue:", data);
  taskQueue.push({ task, data });

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process tasks in the queue
 */
async function processQueue() {
  if (isProcessing || taskQueue.length === 0) {
    return;
  }

  isProcessing = true;
  console.log(`Starting async processing of ${taskQueue.length} tasks`);

  try {
    // Process the next task in the queue
    const { task, data } = taskQueue.shift();
    console.log("Processing task:", data);

    try {
      await task(data);
      console.log("Task completed successfully");
    } catch (taskError) {
      console.error("Error processing task:", taskError);
      // Continue processing other tasks even if one fails
    }
  } catch (error) {
    console.error("Error in queue processing:", error);
  } finally {
    isProcessing = false;

    // Continue processing if there are more tasks
    if (taskQueue.length > 0) {
      processQueue();
    } else {
      console.log("Async queue processing completed");
    }
  }
}

/**
 * Process basic lead information in ActiveCampaign asynchronously
 * @param {Object} leadData - Lead data (email, name, phone, segmento)
 */
async function processLeadBasicInfoAsync(leadData) {
  console.log(
    "Adicionando tarefa de processamento de dados básicos do lead à fila assíncrona..."
  );
  console.log("Dados do lead:", JSON.stringify(leadData));

  addTask(
    async (data) => {
      const { leadData } = data;
      console.log(
        "Iniciando processamento assíncrono dos dados básicos do lead no ActiveCampaign..."
      );
      console.log(
        "Dados do lead para processamento:",
        JSON.stringify(leadData)
      );

      try {
        console.log(
          "Chamando API do ActiveCampaign para processar dados básicos..."
        );
        await activeCampaign.processLeadBasicInfo(leadData);
        console.log(
          "Dados básicos do lead processados com sucesso no ActiveCampaign"
        );
      } catch (acError) {
        console.error(
          "Erro ao processar dados básicos do lead no ActiveCampaign:",
          acError
        );
        console.error("Stack trace:", acError.stack);
        // We don't rethrow the error since this is async processing
      }
    },
    { leadData }
  );
}

/**
 * Update mockup URL for a contact in ActiveCampaign asynchronously
 * @param {string} email - Email of the contact
 * @param {string} mockupUrl - URL of the mockup
 */
async function updateMockupUrlAsync(email, mockupUrl) {
  // Verificar se o mockupUrl está definido
  if (!mockupUrl) {
    console.error(
      "updateMockupUrlAsync: mockupUrl está indefinido, não adicionando à fila"
    );
    return;
  }

  console.log(
    "Adicionando tarefa de atualização de URL do mockup à fila assíncrona..."
  );
  console.log("Email:", email);
  console.log("URL do mockup:", mockupUrl);

  addTask(
    async (data) => {
      const { email, mockupUrl } = data;

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
        console.log(
          "Chamando API do ActiveCampaign para atualizar URL do mockup..."
        );
        await activeCampaign.updateLeadMockupUrl(email, mockupUrl);
        console.log("URL do mockup atualizado com sucesso no ActiveCampaign");
      } catch (acError) {
        console.error(
          "Erro ao atualizar URL do mockup no ActiveCampaign:",
          acError
        );
        console.error("Stack trace:", acError.stack);
        // We don't rethrow the error since this is async processing
      }
    },
    { email, mockupUrl }
  );
}

/**
 * Process lead in ActiveCampaign asynchronously (legacy function for backward compatibility)
 * @param {Object} leadData - Lead data (email, name, phone)
 * @param {string} mockupUrl - URL of the mockup
 */
async function processLeadAsync(leadData, mockupUrl) {
  console.log(
    "Usando função legada processLeadAsync. Processando dados básicos primeiro..."
  );

  // Process basic info first
  await processLeadBasicInfoAsync(leadData);

  // Then update mockup URL if available
  if (mockupUrl) {
    console.log("Atualizando URL do mockup...");
    await updateMockupUrlAsync(leadData.email, mockupUrl);
  } else {
    console.log("URL do mockup não fornecido, pulando atualização");
  }
}

/**
 * Update logo URL for a contact in ActiveCampaign asynchronously
 * @param {string} email - Email of the contact
 * @param {string} logoUrl - URL of the original logo
 */
async function updateLeadLogoUrlAsync(email, logoUrl) {
  // Verificar se o logoUrl está definido
  if (!logoUrl) {
    console.error(
      "updateLeadLogoUrlAsync: logoUrl está indefinido, não adicionando à fila"
    );
    return;
  }

  console.log(
    "Adicionando tarefa de atualização de URL do logo à fila assíncrona..."
  );
  console.log("Email:", email);
  console.log(
    "URL do logo (primeiros 50 caracteres):",
    logoUrl.substring(0, 50) + "..."
  );

  addTask(
    async (data) => {
      const { email, logoUrl } = data;

      // Verificação adicional dentro da tarefa
      if (!logoUrl) {
        console.error(
          "Tarefa de atualização do logo: logoUrl está indefinido, pulando processamento"
        );
        return;
      }

      console.log(
        "Iniciando atualização assíncrona do URL do logo no ActiveCampaign..."
      );

      try {
        // Esperar um tempo para garantir que o contato já foi criado
        console.log(
          "Aguardando 2 segundos para garantir que o contato já foi criado..."
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log(
          "Chamando API do ActiveCampaign para atualizar URL do logo..."
        );
        await activeCampaign.updateLeadLogoUrl(email, logoUrl);
        console.log("URL do logo atualizado com sucesso no ActiveCampaign");
      } catch (acError) {
        console.error(
          "Erro ao atualizar URL do logo no ActiveCampaign:",
          acError
        );
        console.error("Stack trace:", acError.stack);

        // Se falhar, tentar novamente após um tempo maior
        try {
          console.log("Tentando novamente após 5 segundos...");
          await new Promise((resolve) => setTimeout(resolve, 5000));

          console.log("Tentando atualizar URL do logo novamente...");
          await activeCampaign.updateLeadLogoUrl(email, logoUrl);
          console.log(
            "URL do logo atualizado com sucesso na segunda tentativa"
          );
        } catch (retryError) {
          console.error("Erro na segunda tentativa:", retryError);
          // We don't rethrow the error since this is async processing
        }
      }
    },
    { email, logoUrl }
  );
}

module.exports = {
  processLeadAsync,
  processLeadBasicInfoAsync,
  updateMockupUrlAsync,
  updateLeadLogoUrlAsync,
  addTask,
};
