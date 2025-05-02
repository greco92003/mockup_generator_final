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

    console.log("Contact not found in ActiveCampaign");
    return null;
  } catch (error) {
    console.error("Error finding contact in ActiveCampaign:", error);
    throw error;
  }
}

/**
 * Get custom field values for a contact
 * @param {number} contactId - Contact ID
 * @returns {Promise<object>} - Custom field values
 */
async function getContactCustomFields(contactId) {
  try {
    console.log(`Getting custom field values for contact: ${contactId}`);

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
      console.log(`Found ${data.fieldValues.length} custom field values`);
      return data.fieldValues;
    }

    console.log("No custom field values found");
    return [];
  } catch (error) {
    console.error("Error getting custom field values:", error);
    throw error;
  }
}

/**
 * Get all custom fields
 * @returns {Promise<object>} - Custom fields
 */
async function getAllCustomFields() {
  try {
    console.log("Getting all custom fields");

    const response = await fetch(`${AC_API_URL}/api/3/fields`, {
      method: "GET",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (data.fields) {
      console.log(`Found ${data.fields.length} custom fields`);
      return data.fields;
    }

    console.log("No custom fields found");
    return [];
  } catch (error) {
    console.error("Error getting custom fields:", error);
    throw error;
  }
}

/**
 * Check if a contact has a specific custom field value
 * @param {string} email - Email of the contact
 * @param {string} fieldName - Name of the custom field
 * @returns {Promise<object>} - Custom field value
 */
async function checkContactCustomField(email, fieldName) {
  try {
    // Find contact
    const contact = await findContactByEmail(email);

    if (!contact) {
      console.log(`Contact with email ${email} not found`);
      return null;
    }

    // Get all custom fields
    const customFields = await getAllCustomFields();

    // Find the custom field by name
    const customField = customFields.find(
      (field) => field.title.toLowerCase() === fieldName.toLowerCase()
    );

    if (!customField) {
      console.log(`Custom field ${fieldName} not found`);
      return null;
    }

    console.log(`Custom field ${fieldName} found with ID: ${customField.id}`);

    // Get custom field values for the contact
    const fieldValues = await getContactCustomFields(contact.id);

    // Find the custom field value for the contact
    const fieldValue = fieldValues.find(
      (value) => value.field === customField.id
    );

    if (!fieldValue) {
      console.log(
        `Custom field ${fieldName} not set for contact ${contact.id}`
      );
      return null;
    }

    console.log(
      `Custom field ${fieldName} value for contact ${contact.id}: ${fieldValue.value}`
    );
    return fieldValue;
  } catch (error) {
    console.error("Error checking contact custom field:", error);
    throw error;
  }
}

// Test with the email used in the form
const testEmail = "greco92003@gmail.com";
const fieldName = "mockup_url";

checkContactCustomField(testEmail, fieldName)
  .then((result) => {
    console.log("Result:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
