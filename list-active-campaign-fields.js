const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ActiveCampaign API configuration
const AC_API_URL = process.env.ACTIVE_CAMPAIGN_URL || 'https://hudlabprivatelabel.api-us1.com';
const AC_API_KEY = process.env.ACTIVE_CAMPAIGN_API_KEY || '4a5918adee94f39f5e9393e6e215b01fbe5122c26afb2c57250e2bd51806b94823e0efe5';

/**
 * Get all custom fields
 * @returns {Promise<object>} - Custom fields
 */
async function getAllCustomFields() {
  try {
    console.log('Getting all custom fields');
    
    const response = await fetch(`${AC_API_URL}/api/3/fields`, {
      method: 'GET',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.fields) {
      console.log(`Found ${data.fields.length} custom fields`);
      
      // Print all custom fields
      data.fields.forEach(field => {
        console.log(`Field ID: ${field.id}, Title: ${field.title}, Type: ${field.type}`);
      });
      
      return data.fields;
    }
    
    console.log('No custom fields found');
    return [];
  } catch (error) {
    console.error('Error getting custom fields:', error);
    throw error;
  }
}

getAllCustomFields()
  .then(result => {
    console.log('Result:', result.length, 'custom fields');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
