# PDF Logo Handling in Mockup Generator

This document explains how PDF logo files are handled in the mockup generator system.

## Overview

When a user uploads a PDF logo file, the system performs the following steps:

1. The original PDF file is uploaded to the `logo-uncompressed` folder in the S3 bucket
2. The PDF file is sent to the AWS Lambda function for mockup generation
3. The Lambda function detects that the file is a PDF and converts it to PNG using CloudConvert
4. The converted PNG is used to generate the mockup
5. The mockup is saved to the S3 bucket and the URL is returned

## Implementation Details

### File Upload Process

1. When a user uploads a PDF file, the `activecampaign-form-handler.js` file:
   - Uploads the original PDF to the `logo-uncompressed` folder with `isUncompressed=true`
   - Passes the PDF URL directly to the Lambda function along with a flag indicating it's a PDF

2. For non-PDF files (PNG, JPG), the system:
   - Uploads the original file to the `logo-uncompressed` folder with `isUncompressed=true`
   - Uploads a copy of the file to the `logos/` folder with `isUncompressed=false`
   - Passes the URL of the file in the `logos/` folder to the Lambda function

### AWS Lambda Function

The AWS Lambda function receives:
- The URL of the logo file
- A flag indicating if the file is a PDF that needs conversion
- User information (email, name)

If the file is a PDF:
1. The Lambda function downloads the PDF from the S3 bucket
2. Converts it to PNG using CloudConvert
3. Uploads the converted PNG to the `logos/` folder in the S3 bucket
4. Uses the converted PNG to generate the mockup

If the file is not a PDF:
1. The Lambda function downloads the file from the S3 bucket
2. Uses it directly to generate the mockup

### Benefits of This Approach

- Original PDF files are preserved in the `logo-uncompressed` folder
- Converted PNG files are stored in the `logos/` folder
- The system avoids storing duplicate copies of PDF files in both folders
- The mockup generation process always uses the appropriate file format (PNG)

## Troubleshooting

If you encounter issues with PDF handling:

1. Check the logs to ensure the `isPdf` flag is being correctly passed to the Lambda function
2. Verify that the Lambda function is correctly detecting PDF files and converting them
3. Ensure the CloudConvert API is properly configured and has sufficient credits
4. Check that the S3 bucket permissions allow the Lambda function to read and write files
