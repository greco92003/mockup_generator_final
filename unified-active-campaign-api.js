/**
 * Unified ActiveCampaign API Module
 *
 * This module provides functions for interacting with the ActiveCampaign API.
 */

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

// Log API configuration for debugging (only first 10 characters of API key for security)
console.log("ActiveCampaign API URL:", AC_API_URL);
console.log(
  "ActiveCampaign API Key (primeiros 10 caracteres):",
  AC_API_KEY.substring(0, 10) + "..."
);

/**
 * Verify ActiveCampaign credentials
 * @returns {Promise<boolean>} - True if credentials are valid, false otherwise
 */
async function verifyCredentials() {
  try {
    console.log("Verifying ActiveCampaign credentials...");

    const response = await fetch(`${AC_API_URL}/api/3/users/me`, {
      method: "GET",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (data.user) {
      console.log("ActiveCampaign credentials are valid!");
      console.log(
        `Authenticated as: ${data.user.username} (${data.user.email})`
      );
      return true;
    }

    console.error("ActiveCampaign credentials are invalid!");
    console.error("API response:", JSON.stringify(data));
    return false;
  } catch (error) {
    console.error("Error verifying ActiveCampaign credentials:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

// Verify credentials on startup
verifyCredentials().then((valid) => {
  if (!valid) {
    console.error(
      "WARNING: ActiveCampaign credentials are invalid! Users will not be created in ActiveCampaign."
    );
  }
});

/**
 * Find a contact in ActiveCampaign by email
 * @param {string} email - Email to search for
 * @returns {Promise<object|null>} - Contact object or null if not found
 */
async function findContactByEmail(email) {
  try {
    console.log(`Finding contact by email: ${email}`);

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

    console.log(`Contact with email ${email} not found in ActiveCampaign`);
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

    console.log(`Creating contact in ActiveCampaign: ${email}`);
    console.log(`Contact data:`, JSON.stringify(contactData));

    // Validate input data
    if (!email) {
      console.error("Invalid contact data: Missing email");
      throw new Error("Invalid contact data: Missing email");
    }

    // Prepare request body
    const requestBody = {
      contact: {
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        phone: phone || "",
      },
    };

    console.log(`Request body:`, JSON.stringify(requestBody));

    // Make the API request
    console.log(`Making API request to: ${AC_API_URL}/api/3/contacts`);
    const response = await fetch(`${AC_API_URL}/api/3/contacts`, {
      method: "POST",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`API response status: ${response.status}`);

    // Check for HTTP errors
    if (!response.ok) {
      console.error(`HTTP error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error response body: ${errorText}`);
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`API response data:`, JSON.stringify(data));

    if (data.contact) {
      console.log(`Contact created in ActiveCampaign: ${data.contact.id}`);
      return data.contact;
    }

    // If we get here, the API returned a successful response but no contact data
    console.error(
      `Failed to create contact. API response:`,
      JSON.stringify(data)
    );
    throw new Error(`Failed to create contact: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("Error creating contact in ActiveCampaign:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    throw new Error(`Failed to create contact: ${error.message}`);
  }
}

/**
 * Update an existing contact in ActiveCampaign
 * @param {object} contactData - Contact data
 * @returns {Promise<object>} - Updated contact
 */
async function updateContact(contactData) {
  try {
    const { id, email, firstName, lastName, phone } = contactData;

    console.log(`Updating contact in ActiveCampaign: ${id}`);

    const response = await fetch(`${AC_API_URL}/api/3/contacts/${id}`, {
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
    console.log(`Creating or updating custom field: ${fieldLabel}`);

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
      // Find field by title (case insensitive)
      const existingField = data.fields.find(
        (field) => field.title.toLowerCase() === fieldLabel.toLowerCase()
      );

      if (existingField) {
        console.log(`Custom field already exists: ${existingField.id}`);
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
    console.log(`Updating custom field ${fieldId} for contact ${contactId}`);

    // First check if the field value already exists
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
    let existingFieldValueId = null;

    if (data.fieldValues) {
      const existingFieldValue = data.fieldValues.find(
        (value) => value.field === fieldId
      );

      if (existingFieldValue) {
        existingFieldValueId = existingFieldValue.id;
        console.log(`Existing field value found: ${existingFieldValueId}`);
      }
    }

    let response2;
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
        `Updating existing field value with ID: ${existingFieldValueId}`
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
      console.log("Creating new field value");
    }

    // Make the request
    response2 = await fetch(url, {
      method,
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });

    const data2 = await response2.json();

    if (data2.fieldValue) {
      console.log(`Field value updated: ${data2.fieldValue.id}`);
      return data2.fieldValue;
    }

    // If the update failed, try a direct approach
    if (!data2.fieldValue) {
      console.warn("Failed to update field. Trying alternative approach...");

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
        console.log("Field updated successfully using alternative approach");
        return { field: fieldId, value: fieldValue };
      }
    }

    throw new Error(
      `Failed to update contact custom field: ${JSON.stringify(data2)}`
    );
  } catch (error) {
    console.error("Error updating contact custom field:", error);
    throw error;
  }
}

/**
 * Add a contact to a list
 * @param {number} contactId - Contact ID
 * @param {number} listId - List ID
 * @returns {Promise<object>} - Result of the operation
 */
async function addContactToList(contactId, listId) {
  try {
    console.log(`Adding contact ${contactId} to list ${listId}`);

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
      console.log(`Contact added to list: ${data.contactList.id}`);
      return data.contactList;
    }

    throw new Error(`Failed to add contact to list: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error("Error adding contact to list:", error);
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
    console.log(`Creating list: ${listName}`);

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
    console.log("Getting all lists");

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
      console.log(`Found ${data.lists.length} lists`);
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
    console.log(`Finding or creating list: ${listName}`);

    // Get all lists
    const lists = await getLists();

    // Find list by name (case insensitive)
    const existingList = lists.find(
      (list) => list.name.toLowerCase() === listName.toLowerCase()
    );

    if (existingList) {
      console.log(`List already exists: ${existingList.id}`);
      return existingList;
    }

    // Create new list if not found
    return await createList(listName);
  } catch (error) {
    console.error("Error finding or creating list:", error);
    throw error;
  }
}

/**
 * Get custom field values for a contact
 * @param {number} contactId - Contact ID
 * @returns {Promise<Array>} - Custom field values
 */
async function getContactFieldValues(contactId) {
  try {
    console.log(`Getting field values for contact: ${contactId}`);

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
      console.log(`Found ${data.fieldValues.length} field values`);
      return data.fieldValues;
    }

    return [];
  } catch (error) {
    console.error("Error getting contact field values:", error);
    throw error;
  }
}

/**
 * Process a lead with mockup URL in ActiveCampaign
 * @param {object} leadData - Lead data (email, name, phone)
 * @param {string} mockupUrl - URL of the mockup
 * @returns {Promise<object>} - Result of the operation
 */
async function processLeadWithMockup(leadData, mockupUrl) {
  try {
    console.log(`Processing lead with mockup URL: ${leadData.email}`);

    const { email, name, phone, segmento } = leadData;

    // Split name into first and last name
    let firstName = name;
    let lastName = "";

    if (name && name.includes(" ")) {
      const nameParts = name.split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    // Find or create contact
    let contact = await findContactByEmail(email);

    if (!contact) {
      // Create new contact
      contact = await createContact({
        email,
        firstName,
        lastName,
        phone,
      });
    } else {
      // Update existing contact
      contact = await updateContact({
        id: contact.id,
        email,
        firstName,
        lastName,
        phone,
      });
    }

    // Process segmento field if provided
    if (segmento) {
      console.log(`Processing segmento field with value: ${segmento}`);
      // Find or create segmento custom field
      const segmentoField = await createOrUpdateCustomField(
        "Segmento de Negócio",
        "DROPDOWN"
      );

      // Update custom field with segmento value
      await updateContactCustomField(contact.id, segmentoField.id, segmento);
    }

    // Find or create mockup_url custom field
    const mockupField = await createOrUpdateCustomField("mockup_url", "TEXT");

    // Update custom field with mockup URL
    await updateContactCustomField(contact.id, mockupField.id, mockupUrl);

    // Add contact to default list
    const defaultList = await findOrCreateList("Mockup Generator");
    await addContactToList(contact.id, defaultList.id);

    console.log(`Lead processed successfully: ${contact.id}`);
    return { contact, mockupUrl };
  } catch (error) {
    console.error("Error processing lead with mockup:", error);
    throw error;
  }
}

/**
 * Process basic lead information in ActiveCampaign
 * @param {object} leadData - Lead data (email, name, phone, segmento)
 * @returns {Promise<object>} - Result of the operation
 */
async function processLeadBasicInfo(leadData) {
  try {
    console.log(`Processing basic lead information: ${leadData.email}`);
    console.log(`Lead data:`, JSON.stringify(leadData));

    // Validate input data
    if (!leadData || !leadData.email) {
      console.error("Invalid lead data: Missing email");
      throw new Error("Invalid lead data: Missing email");
    }

    const { email, name, phone, segmento } = leadData;

    // Split name into first and last name
    let firstName = name || "";
    let lastName = "";

    if (name && name.includes(" ")) {
      const nameParts = name.split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    console.log(`Parsed name: firstName=${firstName}, lastName=${lastName}`);

    // Verify credentials before proceeding
    const credentialsValid = await verifyCredentials();
    if (!credentialsValid) {
      console.error(
        "Cannot process lead: ActiveCampaign credentials are invalid"
      );
      throw new Error("ActiveCampaign credentials are invalid");
    }

    // Find or create contact
    console.log(`Looking for existing contact with email: ${email}`);
    let contact = await findContactByEmail(email);

    if (!contact) {
      console.log(
        `Contact not found. Creating new contact with email: ${email}`
      );
      // Create new contact
      contact = await createContact({
        email,
        firstName,
        lastName,
        phone,
      });
      console.log(`New contact created with ID: ${contact.id}`);
    } else {
      console.log(`Contact found with ID: ${contact.id}. Updating contact...`);
      // Update existing contact
      contact = await updateContact({
        id: contact.id,
        email,
        firstName,
        lastName,
        phone,
      });
      console.log(`Contact updated successfully: ${contact.id}`);
    }

    // Process segmento field if provided
    if (segmento) {
      console.log(`Processing segmento field with value: ${segmento}`);
      // Find or create segmento custom field
      const segmentoField = await createOrUpdateCustomField(
        "Segmento de Negócio",
        "DROPDOWN"
      );
      console.log(`Segmento field ID: ${segmentoField.id}`);

      // Update custom field with segmento value
      const segmentoResult = await updateContactCustomField(
        contact.id,
        segmentoField.id,
        segmento
      );
      console.log(`Segmento field updated: ${JSON.stringify(segmentoResult)}`);
    }

    // Add contact to default list
    console.log(`Adding contact to default list: Mockup Generator`);
    const defaultList = await findOrCreateList("Mockup Generator");
    console.log(`Default list ID: ${defaultList.id}`);
    const listResult = await addContactToList(contact.id, defaultList.id);
    console.log(`Contact added to list: ${JSON.stringify(listResult)}`);

    console.log(`Lead basic info processed successfully: ${contact.id}`);
    return { contact };
  } catch (error) {
    console.error("Error processing lead basic info:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);

    // Rethrow the error with more context
    throw new Error(`Failed to process lead: ${error.message}`);
  }
}

/**
 * Update mockup URL for a lead in ActiveCampaign
 * @param {string} email - Email of the lead
 * @param {string} mockupUrl - URL of the mockup
 * @returns {Promise<object>} - Result of the operation
 */
async function updateLeadMockupUrl(email, mockupUrl) {
  try {
    console.log(`Updating mockup URL for lead: ${email}`);
    console.log(`Initial mockup URL: ${mockupUrl}`);

    // If we don't have a valid mockup URL, return null
    if (!mockupUrl) {
      console.warn(
        "No valid mockup URL provided. Cannot update ActiveCampaign with an invalid URL."
      );
      return null;
    }

    // Ensure we're using a direct S3 URL without query parameters
    if (mockupUrl.includes("?")) {
      const directUrl = mockupUrl.split("?")[0];
      console.log("Converting pre-signed URL to direct URL:");
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

    // Find contact
    console.log(`Finding contact with email: ${email}`);
    const contact = await findContactByEmail(email);

    if (!contact) {
      console.log(`Contact with email ${email} not found in ActiveCampaign`);
      return null;
    }

    console.log(`Contact found in ActiveCampaign with ID: ${contact.id}`);

    // DIRECT APPROACH: Use hardcoded field ID 41 for mockup_url
    try {
      console.log("Using direct API call with hardcoded field ID 41");

      // Make a direct API call to update the field
      const response = await fetch(`${AC_API_URL}/api/3/fieldValues`, {
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
            value: mockupUrl,
          },
        }),
      });

      const data = await response.json();

      if (data.fieldValue) {
        console.log("Direct approach successful");
        console.log("Field value updated:", data.fieldValue);

        // Verify the update
        try {
          console.log("Verifying the update...");
          const fieldValues = await getContactFieldValues(contact.id);
          const mockupUrlField = fieldValues.find(
            (field) => parseInt(field.field) === 41
          );

          if (mockupUrlField) {
            console.log(
              "Verification successful. Current mockup_url value:",
              mockupUrlField.value
            );

            if (mockupUrlField.value === mockupUrl) {
              console.log("URL was correctly updated in ActiveCampaign!");
            } else {
              console.warn(
                "URL in ActiveCampaign doesn't match the one we tried to set:",
                mockupUrlField.value
              );
            }
          } else {
            console.warn(
              "Verification failed. Could not find mockup_url field in contact's field values."
            );
          }
        } catch (verifyError) {
          console.error("Error verifying update:", verifyError.message);
        }

        return data.fieldValue;
      } else {
        console.warn("Direct approach failed, trying fallback approach");
      }
    } catch (error) {
      console.error("Error in direct approach:", error.message);
    }

    // FALLBACK APPROACH: Use the contacts endpoint with fieldValues
    try {
      console.log("Fallback: Using contacts endpoint with fieldValues");

      // Try a direct approach using the contacts endpoint
      const directResponse = await fetch(
        `${AC_API_URL}/api/3/contacts/${contact.id}`,
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
                  field: 41, // Hardcoded ID for mockup_url
                  value: mockupUrl,
                },
              ],
            },
          }),
        }
      );

      const directData = await directResponse.json();

      if (directData.contact) {
        console.log("Fallback approach successful");
        console.log("Contact updated:", directData.contact.id);
        return { field: 41, value: mockupUrl };
      } else {
        console.error("Fallback approach failed");
        console.error("API response:", directData);
        return null;
      }
    } catch (error) {
      console.error("Error in fallback approach:", error.message);
      console.error("Stack trace:", error.stack);
      return null;
    }
  } catch (error) {
    console.error("Error updating lead mockup URL:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

/**
 * Update logo URL for a lead in ActiveCampaign
 * @param {string} email - Email of the lead
 * @param {string} logoUrl - URL of the logo
 * @returns {Promise<object>} - Result of the operation
 */
async function updateLeadLogoUrl(email, logoUrl) {
  try {
    console.log(`Updating logo URL for lead: ${email}`);
    console.log(`Logo URL: ${logoUrl}`);

    // Find contact
    console.log(`Finding contact with email: ${email}`);
    const contact = await findContactByEmail(email);

    if (!contact) {
      console.log(`Contact with email ${email} not found in ActiveCampaign`);
      return null;
    }

    console.log(`Contact found in ActiveCampaign with ID: ${contact.id}`);

    // Find or create mockup_logotipo custom field
    console.log(`Finding or creating mockup_logotipo custom field`);
    const logoField = await createOrUpdateCustomField(
      "mockup_logotipo",
      "TEXT"
    );
    console.log(`mockup_logotipo field ID: ${logoField.id}`);

    // Update custom field with logo URL
    console.log(
      `Updating contact ${contact.id} field ${logoField.id} with value: ${logoUrl}`
    );
    const result = await updateContactCustomField(
      contact.id,
      logoField.id,
      logoUrl
    );

    console.log(`Logo URL updated successfully for lead: ${email}`);
    console.log(`Update result:`, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("Error updating lead logo URL:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
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
  getContactFieldValues,
  processLeadWithMockup,
  processLeadBasicInfo,
  updateLeadMockupUrl,
  updateLeadLogoUrl,
};
