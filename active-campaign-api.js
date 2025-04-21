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
    const response = await fetch(`${AC_API_URL}/api/3/fieldValues`, {
      method: "POST",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fieldValue: {
          contact: contactId,
          field: fieldId,
          value: fieldValue,
        },
      }),
    });

    const data = await response.json();

    if (data.fieldValue) {
      console.log(
        `Custom field value updated for contact ${contactId}, field ${fieldId}`
      );
      return data.fieldValue;
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
 * Process a lead for mockup generation
 * @param {object} leadData - Lead data
 * @param {string} mockupUrl - URL of the generated mockup
 * @returns {Promise<object>} - Result of the operation
 */
async function processLeadWithMockup(leadData, mockupUrl) {
  try {
    const { email, name, phone } = leadData;

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

    if (contact) {
      // Update existing contact
      contact = await updateContact(contact.id, {
        email,
        firstName,
        lastName,
        phone,
      });
    } else {
      // Create new contact
      contact = await createContact({
        email,
        firstName,
        lastName,
        phone,
      });
    }

    // Find or create mockup_url custom field
    const mockupField = await createOrUpdateCustomField("mockup_url");

    // Update custom field with mockup URL
    await updateContactCustomField(contact.id, mockupField.id, mockupUrl);

    // Find or create list for mockup leads
    const mockupList = await findOrCreateList("Mockup Leads");

    // Add contact to list
    await addContactToList(contact.id, mockupList.id);

    return {
      success: true,
      contact,
      mockupUrl,
    };
  } catch (error) {
    console.error("Error processing lead with mockup:", error);
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
};
