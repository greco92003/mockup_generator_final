const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ActiveCampaign API configuration
const AC_API_URL = process.env.ACTIVE_CAMPAIGN_URL || 'https://hudlabprivatelabel.api-us1.com';
const AC_API_KEY = process.env.ACTIVE_CAMPAIGN_API_KEY || '4a5918adee94f39f5e9393e6e215b01fbe5122c26afb2c57250e2bd51806b94823e0efe5';

/**
 * Create a custom field in ActiveCampaign
 * @param {string} fieldTitle - Title of the field
 * @param {string} fieldType - Type of the field (text, textarea, date, dropdown, etc.)
 * @returns {Promise<object>} - Created field
 */
async function createCustomField(fieldTitle, fieldType = 'text') {
  try {
    console.log(`Creating custom field: ${fieldTitle}`);
    
    const response = await fetch(`${AC_API_URL}/api/3/fields`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        field: {
          title: fieldTitle,
          type: fieldType,
          visible: 1
        }
      })
    });

    const data = await response.json();
    
    if (data.field) {
      console.log(`Custom field created: ${data.field.id} - ${data.field.title}`);
      return data.field;
    }
    
    console.error('Error creating custom field:', data);
    throw new Error('Failed to create custom field');
  } catch (error) {
    console.error('Error creating custom field:', error);
    throw error;
  }
}

// Create the mockup_url field
createCustomField('mockup_url', 'text')
  .then(result => {
    console.log('Result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
