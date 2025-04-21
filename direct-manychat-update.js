const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ManyChat API configuration
const MC_API = 'https://api.manychat.com';
const MC_KEY = process.env.MANYCHAT_API_KEY || '7044882:cc66bd757dd062d297296fb85610330b';
const MC_FIELD_ID = '12882990'; // mockup_url field ID in ManyChat

/**
 * Update a custom field for a subscriber in ManyChat
 * @param {string} email - Email of the subscriber
 * @param {string} fieldValue - Value to set for the custom field
 */
async function updateManyChat(email, fieldValue) {
  try {
    console.log(`Updating ManyChat for email: ${email}`);
    console.log(`Setting mockup_url to: ${fieldValue}`);
    
    // First, find the subscriber by email
    console.log('Finding subscriber by email...');
    const searchResponse = await fetch(`${MC_API}/fb/subscriber/findByEmail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MC_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    // Log the raw response for debugging
    const rawResponse = await searchResponse.text();
    console.log('Raw response:', rawResponse);
    
    try {
      const searchData = JSON.parse(rawResponse);
      
      if (searchData.status === 'success' && searchData.data && searchData.data.id) {
        const subscriberId = searchData.data.id;
        console.log(`Subscriber found: ${subscriberId}`);
        
        // Update the custom field
        console.log(`Updating custom field ${MC_FIELD_ID} for subscriber ${subscriberId}...`);
        const updateResponse = await fetch(`${MC_API}/fb/subscriber/setCustomFieldByFieldId`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MC_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscriber_id: subscriberId,
            field_id: MC_FIELD_ID,
            field_value: fieldValue
          })
        });
        
        const updateRawResponse = await updateResponse.text();
        console.log('Update raw response:', updateRawResponse);
        
        try {
          const updateData = JSON.parse(updateRawResponse);
          
          if (updateData.status === 'success') {
            console.log('Custom field updated successfully!');
            return { success: true, message: 'Custom field updated successfully' };
          } else {
            console.error('Error updating custom field:', updateData);
            return { success: false, error: updateData };
          }
        } catch (parseError) {
          console.error('Error parsing update response:', parseError);
          return { success: false, error: 'Invalid JSON response from update API' };
        }
      } else {
        console.error('Subscriber not found:', searchData);
        return { success: false, error: 'Subscriber not found' };
      }
    } catch (parseError) {
      console.error('Error parsing search response:', parseError);
      return { success: false, error: 'Invalid JSON response from search API' };
    }
  } catch (error) {
    console.error('Error updating ManyChat:', error);
    return { success: false, error: error.message };
  }
}

// Test with a sample email and mockup URL
const testEmail = 'test@example.com';
const testMockupUrl = 'http://localhost:3000/mockups/mockup-3de3d4d7-ac49-4409-ab7c-d4b4d435d433.png';

updateManyChat(testEmail, testMockupUrl)
  .then(result => {
    console.log('Result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
