const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ActiveCampaign API configuration
const AC_API_URL = process.env.ACTIVE_CAMPAIGN_URL || 'https://hudlabprivatelabel.api-us1.com';
const AC_API_KEY = process.env.ACTIVE_CAMPAIGN_API_KEY || '4a5918adee94f39f5e9393e6e215b01fbe5122c26afb2c57250e2bd51806b94823e0efe5';

/**
 * Find a contact in ActiveCampaign by email
 * @param {string} email - Email to search for
 * @returns {Promise<object|null>} - Contact object or null if not found
 */
async function findContactByEmail(email) {
  try {
    console.log(`Finding contact by email: ${email}`);
    
    const response = await fetch(`${AC_API_URL}/api/3/contacts?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.contacts && data.contacts.length > 0) {
      console.log(`Contact found in ActiveCampaign: ${data.contacts[0].id}`);
      return data.contacts[0];
    }
    
    console.log('Contact not found in ActiveCampaign');
    return null;
  } catch (error) {
    console.error('Error finding contact in ActiveCampaign:', error);
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
    console.log(`Updating custom field ${fieldId} for contact ${contactId} with value: ${fieldValue}`);
    
    // First, check if the field value already exists
    const response = await fetch(`${AC_API_URL}/api/3/contacts/${contactId}/fieldValues`, {
      method: 'GET',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.fieldValues) {
      const existingFieldValue = data.fieldValues.find(value => value.field === fieldId);
      
      if (existingFieldValue) {
        console.log(`Field value already exists: ${existingFieldValue.id}`);
        
        // Update existing field value
        const updateResponse = await fetch(`${AC_API_URL}/api/3/fieldValues/${existingFieldValue.id}`, {
          method: 'PUT',
          headers: {
            'Api-Token': AC_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            fieldValue: {
              value: fieldValue
            }
          })
        });
        
        const updateData = await updateResponse.json();
        
        if (updateData.fieldValue) {
          console.log(`Field value updated: ${updateData.fieldValue.value}`);
          return updateData.fieldValue;
        }
        
        console.error('Error updating field value:', updateData);
        throw new Error('Failed to update field value');
      }
    }
    
    // Create new field value
    const createResponse = await fetch(`${AC_API_URL}/api/3/fieldValues`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        fieldValue: {
          contact: contactId,
          field: fieldId,
          value: fieldValue
        }
      })
    });
    
    const createData = await createResponse.json();
    
    if (createData.fieldValue) {
      console.log(`Field value created: ${createData.fieldValue.value}`);
      return createData.fieldValue;
    }
    
    console.error('Error creating field value:', createData);
    throw new Error('Failed to create field value');
  } catch (error) {
    console.error('Error updating contact custom field:', error);
    throw error;
  }
}

/**
 * Update the mockup_url field for a contact
 * @param {string} email - Email of the contact
 * @param {string} mockupUrl - URL of the mockup
 * @returns {Promise<object>} - Updated field value
 */
async function updateMockupUrl(email, mockupUrl) {
  try {
    // Find contact
    const contact = await findContactByEmail(email);
    
    if (!contact) {
      console.log(`Contact with email ${email} not found`);
      return null;
    }
    
    // Update mockup_url field (assuming field ID is 22)
    const fieldId = 22; // This is an assumption, you may need to adjust this
    const fieldValue = await updateContactCustomField(contact.id, fieldId, mockupUrl);
    
    return fieldValue;
  } catch (error) {
    console.error('Error updating mockup URL:', error);
    throw error;
  }
}

// Test with the email used in the form
const testEmail = 'greco92003@gmail.com';
const mockupUrl = 'http://localhost:3000/mockups/mockup-test.png';

updateMockupUrl(testEmail, mockupUrl)
  .then(result => {
    console.log('Result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
