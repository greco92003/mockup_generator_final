const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ActiveCampaign API configuration
const AC_API_URL = process.env.ACTIVE_CAMPAIGN_URL || 'https://hudlabprivatelabel.api-us1.com';
const AC_API_KEY = process.env.ACTIVE_CAMPAIGN_API_KEY || '4a5918adee94f39f5e9393e6e215b01fbe5122c26afb2c57250e2bd51806b94823e0efe5';

async function findCustomField(fieldLabel) {
  try {
    console.log(`Finding custom field: ${fieldLabel}`);
    
    const response = await fetch(`${AC_API_URL}/api/3/fields?limit=100`, {
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
      
      const existingField = data.fields.find(field => 
        field.title.toLowerCase() === fieldLabel.toLowerCase()
      );
      
      if (existingField) {
        console.log(`Found custom field: ${existingField.id} - ${existingField.title}`);
        return existingField;
      }
      
      console.log(`Custom field not found: ${fieldLabel}`);
      return null;
    }
    
    console.log('No custom fields found');
    return null;
  } catch (error) {
    console.error('Error finding custom field:', error);
    throw error;
  }
}

async function testActiveCampaignField() {
  try {
    const mockupUrlField = await findCustomField('mockup_url');
    
    if (mockupUrlField) {
      console.log('mockup_url field found:', mockupUrlField);
    } else {
      console.log('mockup_url field not found');
    }
  } catch (error) {
    console.error('Error testing ActiveCampaign field:', error);
  }
}

testActiveCampaignField();
