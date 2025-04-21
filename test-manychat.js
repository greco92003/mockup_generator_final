const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ManyChat API configuration
const MC_API = 'https://api.manychat.com';
const MC_KEY = process.env.MANYCHAT_API_KEY || '7044882:cc66bd757dd062d297296fb85610330b';

async function findSubscriberByEmail(email) {
  try {
    console.log(`Finding subscriber by email: ${email}`);
    
    const response = await fetch(`${MC_API}/fb/subscriber/findByEmail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MC_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.status === 'success' && data.data && data.data.id) {
      console.log(`Subscriber found: ${data.data.id}`);
      return data.data;
    }
    
    console.log('Subscriber not found');
    return null;
  } catch (error) {
    console.error('Error finding subscriber:', error);
    throw error;
  }
}

async function getCustomFields() {
  try {
    console.log('Getting custom fields...');
    
    const response = await fetch(`${MC_API}/fb/page/getCustomFields`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MC_KEY}`
      }
    });
    
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error getting custom fields:', error);
    throw error;
  }
}

async function testManyChat() {
  try {
    // Test finding a subscriber
    const testEmail = 'test@example.com';
    const subscriber = await findSubscriberByEmail(testEmail);
    
    // Test getting custom fields
    const customFields = await getCustomFields();
    
    console.log('ManyChat API test completed');
  } catch (error) {
    console.error('Error testing ManyChat API:', error);
  }
}

testManyChat();
