/**
 * Test script to verify S3 metadata permissions and handling
 * 
 * This script:
 * 1. Uploads a test file to S3 with metadata
 * 2. Retrieves the object's metadata to verify it was set correctly
 * 3. Logs any errors or permission issues
 */

const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize S3 client
const s3 = new AWS.S3();

// Test file path - create a small test file if it doesn't exist
const testFilePath = path.join(__dirname, 'test-metadata-file.txt');
if (!fs.existsSync(testFilePath)) {
  fs.writeFileSync(testFilePath, 'This is a test file for S3 metadata testing.');
}

// Test bucket and key
const bucket = process.env.S3_BUCKET || 'mockup-hudlab';
const key = `test/metadata-test-${Date.now()}.txt`;

// Test metadata
const testMetadata = {
  'original-filename': 'test-metadata-file.txt',
  'file-type': 'txt',
  'is-original': 'true',
  'uncompressed': 'true',
  'test-field': 'test-value',
};

// Function to upload test file with metadata
async function uploadTestFile() {
  try {
    console.log('Reading test file...');
    const fileContent = fs.readFileSync(testFilePath);
    
    console.log(`Uploading test file to S3: ${bucket}/${key}`);
    console.log(`With metadata: ${JSON.stringify(testMetadata, null, 2)}`);
    
    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: 'text/plain',
      Metadata: testMetadata,
    };
    
    const result = await s3.upload(params).promise();
    console.log('File uploaded successfully:');
    console.log(`- Location: ${result.Location}`);
    console.log(`- Key: ${result.Key}`);
    
    return result;
  } catch (error) {
    console.error('Error uploading test file:', error);
    throw error;
  }
}

// Function to retrieve object metadata
async function getObjectMetadata(bucket, key) {
  try {
    console.log(`Retrieving metadata for object: ${bucket}/${key}`);
    
    const params = {
      Bucket: bucket,
      Key: key,
    };
    
    const result = await s3.headObject(params).promise();
    console.log('Object metadata retrieved successfully:');
    console.log(`- Metadata: ${JSON.stringify(result.Metadata, null, 2)}`);
    console.log(`- Content Type: ${result.ContentType}`);
    console.log(`- Last Modified: ${result.LastModified}`);
    
    return result;
  } catch (error) {
    console.error('Error retrieving object metadata:', error);
    throw error;
  }
}

// Function to check IAM permissions
async function checkIAMPermissions() {
  try {
    console.log('Checking IAM permissions...');
    
    // Test GetBucketLocation permission
    console.log('Testing GetBucketLocation permission...');
    await s3.getBucketLocation({ Bucket: bucket }).promise();
    console.log('✅ GetBucketLocation permission: OK');
    
    // Test ListObjects permission
    console.log('Testing ListObjects permission...');
    await s3.listObjectsV2({ Bucket: bucket, MaxKeys: 1 }).promise();
    console.log('✅ ListObjects permission: OK');
    
    // Test PutObject permission (will be tested in uploadTestFile)
    console.log('PutObject permission will be tested during file upload');
    
    // Test GetObject permission
    console.log('Testing GetObject permission...');
    try {
      // Try to get a known object or the one we'll upload
      await s3.getObject({ Bucket: bucket, Key: 'test/test-permissions.txt' }).promise();
      console.log('✅ GetObject permission: OK');
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        console.log('⚠️ GetObject permission: Could not verify (no test object found)');
      } else if (error.code === 'AccessDenied') {
        console.log('❌ GetObject permission: DENIED');
      } else {
        console.log(`⚠️ GetObject permission: ${error.code}`);
      }
    }
    
    console.log('IAM permissions check completed');
  } catch (error) {
    console.error('Error checking IAM permissions:', error);
    if (error.code === 'AccessDenied') {
      console.error('❌ ACCESS DENIED: Your IAM user/role does not have sufficient permissions');
    }
  }
}

// Main function
async function main() {
  try {
    console.log('=== S3 Metadata Test ===');
    
    // Check IAM permissions
    await checkIAMPermissions();
    
    // Upload test file with metadata
    const uploadResult = await uploadTestFile();
    
    // Wait a moment for S3 to process the upload
    console.log('Waiting for S3 to process the upload...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Retrieve and verify metadata
    const metadataResult = await getObjectMetadata(bucket, key);
    
    // Verify metadata was set correctly
    console.log('\nMetadata Verification:');
    let allMetadataCorrect = true;
    
    for (const [key, value] of Object.entries(testMetadata)) {
      if (metadataResult.Metadata[key] === value) {
        console.log(`✅ Metadata '${key}': OK (${value})`);
      } else {
        console.log(`❌ Metadata '${key}': FAILED - Expected '${value}', got '${metadataResult.Metadata[key]}'`);
        allMetadataCorrect = false;
      }
    }
    
    if (allMetadataCorrect) {
      console.log('\n✅ All metadata was set correctly!');
    } else {
      console.log('\n⚠️ Some metadata was not set correctly.');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
main();
