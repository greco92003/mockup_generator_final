const fetch = require("node-fetch");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// ActiveCampaign API configuration
const AC_API_URL =
  process.env.ACTIVE_CAMPAIGN_URL || "https://hudlabprivatelabel.api-us1.com";
const AC_API_KEY =
  process.env.ACTIVE_CAMPAIGN_API_KEY ||
  "4a5918adee94f39f5e9393e6e215b01fbe5122c26afb2c57250e2bd51806b94823e0efe5";

// Log API configuration for debugging
console.log("ActiveCampaign API URL:", AC_API_URL);
console.log(
  "ActiveCampaign API Key (primeiros 10 caracteres):",
  AC_API_KEY.substring(0, 10) + "..."
);

/**
 * Find a contact in ActiveCampaign by email
 * @param {string} email - Email to search for
 * @returns {Promise<object|null>} - Contact object or null if not found
 */
async function findContactByEmail(email) {
  try {
    const response = await fetch(
      `${AC_API_URL}/api/3/contacts?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Api-Token": AC_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.contacts && data.contacts.length > 0) {
      console.log(`Contact found in ActiveCampaign: ${data.contacts[0].id}`);
      return data.contacts[0];
    }

    console.log("Contact not found in ActiveCampaign");
    return null;
  } catch (error) {
    console.error("Error finding contact in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Create a new contact in ActiveCampaign
 * @param {object} contactData - Contact data
 * @returns {Promise<object>} - Created contact
 */
async function createContact(contactData) {
  try {
    const { email, firstName, lastName, phone } = contactData;

    const response = await fetch(`${AC_API_URL}/api/3/contacts`, {
      method: "POST",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        contact: {
          email,
          firstName,
          lastName,
          phone,
        },
      }),
    });

    const data = await response.json();

    if (data.contact) {
      console.log(`Contact created in ActiveCampaign: ${data.contact.id}`);
      return data.contact;
    }

    throw new Error(`Failed to create contact: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("Error creating contact in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Update an existing contact in ActiveCampaign
 * @param {number} contactId - Contact ID
 * @param {object} contactData - Contact data to update
 * @returns {Promise<object>} - Updated contact
 */
async function updateContact(contactId, contactData) {
  try {
    const { email, firstName, lastName, phone } = contactData;

    const response = await fetch(`${AC_API_URL}/api/3/contacts/${contactId}`, {
      method: "PUT",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        contact: {
          email,
          firstName,
          lastName,
          phone,
        },
      }),
    });

    const data = await response.json();

    if (data.contact) {
      console.log(`Contact updated in ActiveCampaign: ${data.contact.id}`);
      return data.contact;
    }

    throw new Error(`Failed to update contact: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("Error updating contact in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Create or update a custom field in ActiveCampaign
 * @param {string} fieldLabel - Field label
 * @param {string} fieldType - Field type (TEXT, TEXTAREA, DATE, etc.)
 * @returns {Promise<object>} - Created or found field
 */
async function createOrUpdateCustomField(fieldLabel, fieldType = "TEXT") {
  try {
    // First check if field exists
    const response = await fetch(`${AC_API_URL}/api/3/fields?limit=100`, {
      method: "GET",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (data.fields) {
      // Log all fields for debugging
      console.log(
        `Campos personalizados disponíveis no ActiveCampaign (${data.fields.length}):`
      );
      data.fields.forEach((field) => {
        console.log(
          `- ID: ${field.id}, Título: ${field.title}, Tipo: ${field.type}`
        );
      });

      // Try to find the field by exact match first
      let existingField = data.fields.find(
        (field) => field.title === fieldLabel
      );

      // If not found, try case-insensitive match
      if (!existingField) {
        existingField = data.fields.find(
          (field) => field.title.toLowerCase() === fieldLabel.toLowerCase()
        );
      }

      if (existingField) {
        console.log(
          `Custom field already exists: ${existingField.id}, Title: ${existingField.title}`
        );
        return existingField;
      }
    }

    // Create new field if not found
    const createResponse = await fetch(`${AC_API_URL}/api/3/fields`, {
      method: "POST",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        field: {
          title: fieldLabel,
          type: fieldType,
          visible: 1,
        },
      }),
    });

    const createData = await createResponse.json();

    if (createData.field) {
      console.log(`Custom field created: ${createData.field.id}`);
      return createData.field;
    }

    throw new Error(
      `Failed to create custom field: ${JSON.stringify(createData)}`
    );
  } catch (error) {
    console.error("Error creating custom field in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Update a custom field value for a contact
 * @param {number} contactId - Contact ID
 * @param {number} fieldId - Field ID
 * @param {string} fieldValue - Field value
 * @returns {Promise<object>} - Updated field value
 */
async function updateContactCustomField(contactId, fieldId, fieldValue) {
  try {
    console.log(
      `Atualizando campo personalizado ${fieldId} para contato ${contactId} com valor: ${fieldValue}`
    );

    // First, check if the field value already exists for this contact
    console.log(
      "Verificando se o valor de campo já existe para este contato..."
    );
    const checkResponse = await fetch(
      `${AC_API_URL}/api/3/contacts/${contactId}/fieldValues`,
      {
        method: "GET",
        headers: {
          "Api-Token": AC_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const checkData = await checkResponse.json();
    let existingFieldValueId = null;

    if (checkData.fieldValues) {
      const existingFieldValue = checkData.fieldValues.find(
        (fv) => parseInt(fv.field) === parseInt(fieldId)
      );

      if (existingFieldValue) {
        existingFieldValueId = existingFieldValue.id;
        console.log(
          `Valor de campo existente encontrado com ID: ${existingFieldValueId}`
        );
      }
    }

    let response;
    let method;
    let url;
    let body;

    if (existingFieldValueId) {
      // Update existing field value
      method = "PUT";
      url = `${AC_API_URL}/api/3/fieldValues/${existingFieldValueId}`;
      body = JSON.stringify({
        fieldValue: {
          value: fieldValue,
        },
      });
      console.log(
        `Atualizando valor de campo existente com ID: ${existingFieldValueId}`
      );
    } else {
      // Create new field value
      method = "POST";
      url = `${AC_API_URL}/api/3/fieldValues`;
      body = JSON.stringify({
        fieldValue: {
          contact: contactId,
          field: fieldId,
          value: fieldValue,
        },
      });
      console.log("Criando novo valor de campo");
    }

    // Make the request
    response = await fetch(url, {
      method,
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });

    const data = await response.json();

    if (data.fieldValue) {
      console.log(
        `Valor de campo ${
          existingFieldValueId ? "atualizado" : "criado"
        } com sucesso para contato ${contactId}, campo ${fieldId}`
      );
      return data.fieldValue;
    }

    // If the update failed, try a direct approach
    if (!data.fieldValue) {
      console.warn(
        "Falha na atualização do campo. Tentando abordagem alternativa..."
      );

      // Try a direct approach using the contacts endpoint
      const directResponse = await fetch(
        `${AC_API_URL}/api/3/contacts/${contactId}`,
        {
          method: "PUT",
          headers: {
            "Api-Token": AC_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            contact: {
              fieldValues: [
                {
                  field: fieldId,
                  value: fieldValue,
                },
              ],
            },
          }),
        }
      );

      const directData = await directResponse.json();

      if (directData.contact) {
        console.log(
          "Campo atualizado com sucesso usando abordagem alternativa"
        );
        return { field: fieldId, value: fieldValue };
      }

      console.error(
        "Falha na atualização do campo usando abordagem alternativa:",
        directData
      );
    }

    throw new Error(
      `Failed to update custom field value: ${JSON.stringify(data)}`
    );
  } catch (error) {
    console.error(
      "Error updating custom field value in ActiveCampaign:",
      error
    );
    throw error;
  }
}

/**
 * Add a contact to a list in ActiveCampaign
 * @param {number} contactId - Contact ID
 * @param {number} listId - List ID
 * @returns {Promise<object>} - Result of the operation
 */
async function addContactToList(contactId, listId) {
  try {
    const response = await fetch(`${AC_API_URL}/api/3/contactLists`, {
      method: "POST",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        contactList: {
          list: listId,
          contact: contactId,
          status: 1,
        },
      }),
    });

    const data = await response.json();

    if (data.contactList) {
      console.log(`Contact ${contactId} added to list ${listId}`);
      return data.contactList;
    }

    throw new Error(`Failed to add contact to list: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("Error adding contact to list in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Create a new list in ActiveCampaign
 * @param {string} listName - Name of the list
 * @returns {Promise<object>} - Created list
 */
async function createList(listName) {
  try {
    const response = await fetch(`${AC_API_URL}/api/3/lists`, {
      method: "POST",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        list: {
          name: listName,
          stringid: listName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        },
      }),
    });

    const data = await response.json();

    if (data.list) {
      console.log(`List created: ${data.list.id}`);
      return data.list;
    }

    throw new Error(`Failed to create list: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("Error creating list in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Get all lists from ActiveCampaign
 * @returns {Promise<Array>} - Lists
 */
async function getLists() {
  try {
    const response = await fetch(`${AC_API_URL}/api/3/lists?limit=100`, {
      method: "GET",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (data.lists) {
      return data.lists;
    }

    return [];
  } catch (error) {
    console.error("Error getting lists from ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Find or create a list in ActiveCampaign
 * @param {string} listName - Name of the list
 * @returns {Promise<object>} - Found or created list
 */
async function findOrCreateList(listName) {
  try {
    const lists = await getLists();

    const existingList = lists.find(
      (list) => list.name.toLowerCase() === listName.toLowerCase()
    );

    if (existingList) {
      console.log(`List already exists: ${existingList.id}`);
      return existingList;
    }

    return await createList(listName);
  } catch (error) {
    console.error("Error finding or creating list in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Process basic lead information (without mockup URL)
 * @param {object} leadData - Lead data (email, name, phone, segmento)
 * @returns {Promise<object>} - Result of the operation with contact information
 */
async function processLeadBasicInfo(leadData) {
  try {
    console.log(
      "Iniciando processamento dos dados básicos do lead no ActiveCampaign:",
      JSON.stringify(leadData)
    );

    const { email, name, phone, segmento } = leadData;

    // Verificar se temos todos os dados necessários
    if (!email) {
      console.error("Email não fornecido para processamento no ActiveCampaign");
      throw new Error(
        "Email é obrigatório para processamento no ActiveCampaign"
      );
    }

    // Split name into first and last name
    let firstName = name;
    let lastName = "";

    if (name && name.includes(" ")) {
      const nameParts = name.split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    // Find or create contact
    console.log(`Buscando contato com email: ${email}`);
    let contact = await findContactByEmail(email);

    if (contact) {
      console.log(`Contato encontrado com ID: ${contact.id}, atualizando...`);
      // Update existing contact
      contact = await updateContact(contact.id, {
        email,
        firstName,
        lastName,
        phone,
      });
      console.log(`Contato atualizado com sucesso: ${contact.id}`);
    } else {
      console.log(`Contato não encontrado, criando novo contato...`);
      // Create new contact
      contact = await createContact({
        email,
        firstName,
        lastName,
        phone,
      });
      console.log(`Novo contato criado com ID: ${contact.id}`);
    }

    // Process segmento field if provided
    if (segmento) {
      console.log(`Processando campo segmento com valor: ${segmento}`);
      // Find or create segmento custom field
      console.log(
        "Buscando ou criando campo personalizado Segmento de Negócio..."
      );
      const segmentoField = await createOrUpdateCustomField(
        "Segmento de Negócio",
        "DROPDOWN"
      );
      console.log(
        `Campo Segmento de Negócio encontrado/criado com ID: ${segmentoField.id}`
      );

      // Update custom field with segmento value
      console.log(
        `Atualizando campo Segmento de Negócio para contato ${contact.id} com valor: ${segmento}`
      );
      await updateContactCustomField(contact.id, segmentoField.id, segmento);
      console.log("Campo Segmento de Negócio atualizado com sucesso");
    } else {
      console.log("Segmento não fornecido, pulando processamento deste campo");
    }

    // Find or create list for mockup leads
    console.log("Buscando ou criando lista Mockup Leads...");
    const mockupList = await findOrCreateList("Mockup Leads");
    console.log(
      `Lista Mockup Leads encontrada/criada com ID: ${mockupList.id}`
    );

    // Add contact to list
    console.log(
      `Adicionando contato ${contact.id} à lista ${mockupList.id}...`
    );
    await addContactToList(contact.id, mockupList.id);
    console.log(`Contato adicionado à lista com sucesso`);

    return {
      success: true,
      contact,
    };
  } catch (error) {
    console.error("Erro ao processar dados básicos do lead:", error);
    throw error;
  }
}

/**
 * Update mockup URL for an existing contact
 * @param {string} email - Email of the contact
 * @param {string} mockup_url - URL of the generated mockup
 * @returns {Promise<object>} - Result of the operation
 */
async function updateLeadMockupUrl(email, mockup_url) {
  try {
    console.log(`Atualizando URL do mockup para o contato com email: ${email}`);
    console.log("Mockup URL:", mockup_url);

    // Verificar se temos todos os dados necessários
    if (!email) {
      console.error("Email não fornecido para atualização do mockup URL");
      throw new Error("Email é obrigatório para atualização do mockup URL");
    }

    if (!mockup_url) {
      console.error("URL do mockup não fornecido");
      throw new Error("URL do mockup é obrigatório");
    }

    // Find contact
    console.log(`Buscando contato com email: ${email}`);
    const contact = await findContactByEmail(email);

    if (!contact) {
      console.error(`Contato com email ${email} não encontrado`);
      throw new Error(`Contato com email ${email} não encontrado`);
    }

    console.log(`Contato encontrado com ID: ${contact.id}`);

    // Use the known field ID directly (ID: 41, Título: mockup_url, Tipo: text)
    console.log("Usando ID conhecido do campo mockup_url (ID: 41)...");

    // Create a mockupField object with the known information
    const mockupField = {
      id: 41,
      title: "mockup_url",
      type: "text",
    };

    console.log(`Usando campo mockup_url com ID: ${mockupField.id}`);

    // As a fallback, verify if the field exists
    try {
      console.log("Verificando se o campo existe...");
      const response = await fetch(
        `${AC_API_URL}/api/3/fields/${mockupField.id}`,
        {
          method: "GET",
          headers: {
            "Api-Token": AC_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.field) {
        console.log(
          `Campo verificado: ID: ${data.field.id}, Título: ${data.field.title}, Tipo: ${data.field.type}`
        );
        // Update our mockupField object with the actual data
        mockupField.title = data.field.title;
        mockupField.type = data.field.type;
      } else {
        console.warn(
          `Campo com ID ${mockupField.id} não encontrado. Usando informações padrão.`
        );
      }
    } catch (verifyError) {
      console.error("Erro ao verificar campo:", verifyError);
      console.log("Continuando com as informações conhecidas do campo...");
    }

    // Update custom field with mockup URL using multiple approaches
    console.log(
      `Atualizando campo "${mockupField.title}" (ID: ${mockupField.id}) para contato ${contact.id} com valor: ${mockup_url}`
    );

    // Try the standard approach first
    try {
      console.log("Tentando atualizar campo usando abordagem padrão...");
      const updatedField = await updateContactCustomField(
        contact.id,
        mockupField.id,
        mockup_url
      );
      console.log(
        `Campo "${mockupField.title}" atualizado com sucesso (abordagem padrão):`,
        JSON.stringify(updatedField)
      );
    } catch (updateError) {
      console.error("Erro na atualização padrão:", updateError);

      // Try a direct API call as a fallback
      try {
        console.log("Tentando atualização direta via API...");
        const directResponse = await fetch(`${AC_API_URL}/api/3/fieldValues`, {
          method: "POST",
          headers: {
            "Api-Token": AC_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            fieldValue: {
              contact: contact.id,
              field: 41, // Hardcoded ID for mockup_url
              value: mockup_url,
            },
          }),
        });

        const directData = await directResponse.json();

        if (directData.fieldValue) {
          console.log(
            "Campo atualizado com sucesso via API direta:",
            directData.fieldValue
          );
        } else {
          console.error("Falha na atualização direta:", directData);
        }
      } catch (directError) {
        console.error("Erro na atualização direta:", directError);
      }
    }

    // Verify the field was updated correctly
    try {
      console.log("Verificando se o campo foi atualizado corretamente...");
      const response = await fetch(
        `${AC_API_URL}/api/3/contacts/${contact.id}/fieldValues`,
        {
          method: "GET",
          headers: {
            "Api-Token": AC_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.fieldValues) {
        console.log(
          `Encontrados ${data.fieldValues.length} valores de campo para o contato ${contact.id}`
        );

        // Log all field values for debugging
        data.fieldValues.forEach((fv) => {
          console.log(`- Campo ID: ${fv.field}, Valor: ${fv.value}`);
        });

        // Find our specific field
        const fieldValue = data.fieldValues.find(
          (fv) => parseInt(fv.field) === parseInt(mockupField.id)
        );

        if (fieldValue) {
          console.log(
            `Valor atual do campo "${mockupField.title}" (ID: ${mockupField.id}): ${fieldValue.value}`
          );

          // Check if the value matches what we set
          if (fieldValue.value === mockup_url) {
            console.log(
              "✅ Campo atualizado com sucesso! O valor corresponde ao URL do mockup."
            );
          } else {
            console.warn(
              "⚠️ Campo atualizado, mas o valor não corresponde exatamente ao URL do mockup."
            );
            console.log("Valor esperado:", mockup_url);
            console.log("Valor atual:", fieldValue.value);
          }
        } else {
          console.warn(
            `⚠️ Campo "${mockupField.title}" (ID: ${mockupField.id}) não encontrado nos valores do contato`
          );

          // Try to find any field that might contain the mockup URL
          const possibleField = data.fieldValues.find(
            (fv) =>
              fv.value &&
              fv.value.includes("mockup") &&
              fv.value.includes(".png")
          );

          if (possibleField) {
            console.log(
              `Encontrado possível campo com URL do mockup: Campo ID: ${possibleField.field}, Valor: ${possibleField.value}`
            );
          }
        }
      } else {
        console.log("Nenhum valor de campo encontrado para o contato");
      }
    } catch (verifyError) {
      console.error("Erro ao verificar valores de campo:", verifyError);
    }

    return {
      success: true,
      contact,
      mockup_url,
    };
  } catch (error) {
    console.error("Erro ao atualizar URL do mockup:", error);
    throw error;
  }
}

/**
 * Process a lead for mockup generation (legacy function for backward compatibility)
 * @param {object} leadData - Lead data
 * @param {string} mockup_url - URL of the generated mockup
 * @returns {Promise<object>} - Result of the operation
 */
async function processLeadWithMockup(leadData, mockup_url) {
  try {
    console.log(
      "Usando função legada processLeadWithMockup. Processando dados básicos primeiro..."
    );

    // Process basic info first
    await processLeadBasicInfo(leadData);

    // Then update mockup URL
    console.log("Atualizando URL do mockup...");
    return await updateLeadMockupUrl(leadData.email, mockup_url);
  } catch (error) {
    console.error("Error processing lead with mockup:", error);
    throw error;
  }
}

/**
 * Update logo URL for an existing contact
 * @param {string} email - Email of the contact
 * @param {string} logo_url - URL of the original logo
 * @returns {Promise<object>} - Result of the operation
 */
async function updateLeadLogoUrl(email, logo_url) {
  try {
    console.log(
      `Atualizando URL do logotipo original para o contato com email: ${email}`
    );
    console.log("Logo URL original:", logo_url);

    // Log more detailed information about the logo URL
    if (logo_url) {
      console.log(`Logo URL length: ${logo_url.length}`);
      console.log(`Logo URL starts with: ${logo_url.substring(0, 50)}...`);

      // Check if it's an S3 URL
      if (logo_url.includes("s3.amazonaws.com")) {
        console.log("Logo URL is an S3 URL");

        // Try to extract the file extension from the URL
        const urlParts = logo_url.split(".");
        if (urlParts.length > 1) {
          const extension = urlParts[urlParts.length - 1]
            .split("?")[0]
            .toLowerCase();
          console.log(`Detected file extension from URL: ${extension}`);

          if (extension === "jpg" || extension === "jpeg") {
            console.log("Logo appears to be a JPG/JPEG file");
          } else if (extension === "png") {
            console.log("Logo appears to be a PNG file");
          } else if (extension === "pdf") {
            console.log("Logo appears to be a PDF file");
          } else {
            console.log(`Logo has unknown extension: ${extension}`);
          }
        } else {
          console.log("Could not detect file extension from URL");
        }
      } else {
        console.log("Logo URL is not an S3 URL");
      }
    }

    // Verificar se temos todos os dados necessários
    if (!email) {
      console.error("Email não fornecido para atualização do logo URL");
      throw new Error("Email é obrigatório para atualização do logo URL");
    }

    if (!logo_url) {
      console.error("URL do logotipo não fornecido");
      throw new Error("URL do logotipo é obrigatório");
    }

    // Find contact
    console.log(`Buscando contato com email: ${email}`);
    const contact = await findContactByEmail(email);

    if (!contact) {
      console.error(`Contato com email ${email} não encontrado`);
      throw new Error(`Contato com email ${email} não encontrado`);
    }

    console.log(`Contato encontrado com ID: ${contact.id}`);

    // Use the known field ID directly (ID: 42, Título: mockup_logotipo, Tipo: text)
    console.log("Usando ID conhecido do campo mockup_logotipo (ID: 42)...");

    // Create a logoField object with the known information
    const logoField = {
      id: 42,
      title: "mockup_logotipo",
      type: "text",
    };

    console.log(`Usando campo mockup_logotipo com ID: ${logoField.id}`);

    // Since the bucket is now public, we'll use direct URLs instead of pre-signed URLs
    let finalLogoUrl = logo_url;
    console.log("Usando URL direta do S3 (bucket público):", finalLogoUrl);

    // Update custom field with logo URL
    console.log(
      `Atualizando campo "${logoField.title}" (ID: ${logoField.id}) para contato ${contact.id}`
    );
    console.log(
      `URL a ser armazenada (primeiros 100 caracteres): ${finalLogoUrl.substring(
        0,
        100
      )}...`
    );

    let updateSuccess = false;
    let updateResult = null;

    // Try the standard approach first
    try {
      console.log("Tentando atualizar campo usando abordagem padrão...");
      const updatedField = await updateContactCustomField(
        contact.id,
        logoField.id,
        finalLogoUrl
      );
      console.log(
        `Campo "${logoField.title}" atualizado com sucesso (abordagem padrão):`,
        JSON.stringify(updatedField)
      );
      updateSuccess = true;
      updateResult = updatedField;
    } catch (updateError) {
      console.error("Erro na atualização padrão:", updateError);

      // Try a direct API call as a fallback
      try {
        console.log("Tentando atualização direta via API...");
        const directResponse = await fetch(`${AC_API_URL}/api/3/fieldValues`, {
          method: "POST",
          headers: {
            "Api-Token": AC_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            fieldValue: {
              contact: contact.id,
              field: 42, // Hardcoded ID for mockup_logotipo
              value: finalLogoUrl,
            },
          }),
        });

        const directData = await directResponse.json();

        if (directData.fieldValue) {
          console.log(
            "Campo atualizado com sucesso via API direta:",
            directData.fieldValue
          );
          updateSuccess = true;
          updateResult = directData.fieldValue;
        } else {
          console.error("Falha na atualização direta:", directData);
        }
      } catch (directError) {
        console.error("Erro na atualização direta:", directError);
      }
    }

    // Verify the update was successful
    if (updateSuccess) {
      try {
        console.log("Verificando se o campo foi atualizado corretamente...");
        const fieldValues = await getContactFieldValues(contact.id);
        const logoFieldValue = fieldValues.find(
          (field) => parseInt(field.id) === logoField.id
        );

        if (logoFieldValue) {
          console.log(
            `Valor atual do campo "${
              logoField.title
            }": ${logoFieldValue.value.substring(0, 100)}...`
          );

          // Check if the value contains the expected parts of the URL
          if (
            logoFieldValue.value.includes("s3.amazonaws.com") &&
            (logoFieldValue.value.includes("X-Amz-Signature=") ||
              logoFieldValue.value.includes("AWSAccessKeyId="))
          ) {
            console.log(
              "✅ Campo verificado e contém uma URL pré-assinada válida"
            );
          } else {
            console.warn(
              "⚠️ Campo atualizado, mas a URL não parece ser uma URL pré-assinada válida"
            );
          }
        } else {
          console.warn(
            `⚠️ Campo "${logoField.title}" não encontrado após atualização`
          );
        }
      } catch (verifyError) {
        console.error("Erro ao verificar atualização do campo:", verifyError);
      }
    }

    return {
      success: updateSuccess,
      contact,
      logo_url: finalLogoUrl,
      updateResult,
    };
  } catch (error) {
    console.error("Erro ao atualizar URL do logotipo:", error);
    throw error;
  }
}

/**
 * Get all field values for a contact
 * @param {number} contactId - Contact ID
 * @returns {Promise<Array>} - Field values
 */
async function getContactFieldValues(contactId) {
  try {
    console.log(`Buscando valores de campo para contato ${contactId}...`);
    const response = await fetch(
      `${AC_API_URL}/api/3/contacts/${contactId}/fieldValues`,
      {
        method: "GET",
        headers: {
          "Api-Token": AC_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.fieldValues) {
      console.log(`Encontrados ${data.fieldValues.length} valores de campo`);

      // Get field details for each field value
      const fieldDetails = [];

      for (const fieldValue of data.fieldValues) {
        try {
          const fieldResponse = await fetch(
            `${AC_API_URL}/api/3/fields/${fieldValue.field}`,
            {
              method: "GET",
              headers: {
                "Api-Token": AC_API_KEY,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            }
          );

          const fieldData = await fieldResponse.json();

          if (fieldData.field) {
            fieldDetails.push({
              id: fieldValue.field,
              title: fieldData.field.title,
              type: fieldData.field.type,
              value: fieldValue.value,
              fieldValueId: fieldValue.id,
            });
          } else {
            fieldDetails.push({
              id: fieldValue.field,
              title: "Unknown",
              type: "Unknown",
              value: fieldValue.value,
              fieldValueId: fieldValue.id,
            });
          }
        } catch (fieldError) {
          console.error(
            `Erro ao buscar detalhes do campo ${fieldValue.field}:`,
            fieldError
          );
          fieldDetails.push({
            id: fieldValue.field,
            title: "Error",
            type: "Error",
            value: fieldValue.value,
            fieldValueId: fieldValue.id,
            error: fieldError.message,
          });
        }
      }

      // Check specifically for mockup_url field (ID: 41)
      const mockupUrlField = fieldDetails.find(
        (field) => parseInt(field.id) === 41
      );

      if (mockupUrlField) {
        console.log(
          `Campo mockup_url encontrado: ID: ${mockupUrlField.id}, Valor: ${mockupUrlField.value}`
        );
      } else {
        console.log(
          "Campo mockup_url (ID: 41) não encontrado para este contato"
        );
      }

      return fieldDetails;
    }

    return [];
  } catch (error) {
    console.error("Error getting contact field values:", error);
    throw error;
  }
}

module.exports = {
  findContactByEmail,
  createContact,
  updateContact,
  createOrUpdateCustomField,
  updateContactCustomField,
  addContactToList,
  createList,
  getLists,
  findOrCreateList,
  processLeadWithMockup,
  processLeadBasicInfo,
  updateLeadMockupUrl,
  updateLeadLogoUrl,
  getContactFieldValues,
};
