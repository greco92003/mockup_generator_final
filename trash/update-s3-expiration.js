/**
 * Script to update the S3 URL expiration time in the AWS Lambda function
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

// Initialize Lambda client
const lambda = new AWS.Lambda();

// Lambda function name
const functionName = 'mockup-generator-python';

// Function to get the current Lambda function code
async function getLambdaFunction() {
  try {
    console.log(`Getting Lambda function configuration for: ${functionName}`);
    
    const params = {
      FunctionName: functionName,
    };
    
    const result = await lambda.getFunction(params).promise();
    console.log('Lambda function configuration retrieved successfully');
    
    return result.Configuration;
  } catch (error) {
    console.error('Error getting Lambda function:', error);
    throw error;
  }
}

// Function to update the Lambda function environment variables
async function updateLambdaEnvironment(envVars) {
  try {
    console.log(`Updating Lambda function environment variables for: ${functionName}`);
    
    const params = {
      FunctionName: functionName,
      Environment: {
        Variables: {
          ...envVars,
          S3_URL_EXPIRATION: '604800', // 7 days in seconds (7 * 24 * 60 * 60)
        },
      },
    };
    
    const result = await lambda.updateFunctionConfiguration(params).promise();
    console.log('Lambda function environment variables updated successfully');
    
    return result;
  } catch (error) {
    console.error('Error updating Lambda function environment variables:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Get current Lambda function configuration
    const lambdaConfig = await getLambdaFunction();
    
    // Get current environment variables
    const currentEnvVars = lambdaConfig.Environment ? lambdaConfig.Environment.Variables : {};
    
    console.log('Current environment variables:');
    console.log(currentEnvVars);
    
    // Update environment variables
    const result = await updateLambdaEnvironment(currentEnvVars);
    
    console.log('Lambda function updated successfully!');
    console.log('New environment variables:');
    console.log(result.Environment.Variables);
    
    console.log('\nIMPORTANT: The Lambda function will now generate S3 URLs that expire after 7 days.');
    console.log('You may need to wait a few seconds for the changes to take effect.');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
main();
