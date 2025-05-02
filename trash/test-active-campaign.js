const activeCampaign = require('./active-campaign-api');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testActiveCampaign() {
  try {
    console.log('Testing ActiveCampaign API...');
    
    // Test finding a contact
    console.log('Testing findContactByEmail...');
    const testEmail = 'test@example.com';
    const contact = await activeCampaign.findContactByEmail(testEmail);
    
    if (contact) {
      console.log('Contact found:', contact.id);
    } else {
      console.log('Contact not found, creating...');
      
      // Test creating a contact
      const newContact = await activeCampaign.createContact({
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        phone: '11999999999'
      });
      
      console.log('Contact created:', newContact.id);
      
      // Test creating a custom field
      console.log('Testing createOrUpdateCustomField...');
      const customField = await activeCampaign.createOrUpdateCustomField('mockup_url');
      
      console.log('Custom field:', customField);
      
      // Test updating a custom field value
      console.log('Testing updateContactCustomField...');
      const testUrl = 'https://example.com/mockup.png';
      const fieldValue = await activeCampaign.updateContactCustomField(
        newContact.id,
        customField.id,
        testUrl
      );
      
      console.log('Field value updated:', fieldValue);
      
      // Test finding or creating a list
      console.log('Testing findOrCreateList...');
      const list = await activeCampaign.findOrCreateList('Mockup Leads');
      
      console.log('List:', list);
      
      // Test adding contact to list
      console.log('Testing addContactToList...');
      const contactList = await activeCampaign.addContactToList(newContact.id, list.id);
      
      console.log('Contact added to list:', contactList);
    }
    
    console.log('ActiveCampaign API test completed successfully!');
  } catch (error) {
    console.error('Error testing ActiveCampaign API:', error);
  }
}

testActiveCampaign();
