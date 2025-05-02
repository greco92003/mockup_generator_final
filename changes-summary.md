# S3 Bucket Structure Changes

## Overview of Changes

We've updated the code to handle the new S3 bucket structure:

1. **Original User Uploads**:
   - PNG/JPG files → `logo-uncompressed/` folder
   - PDF files → `logo-pdf/` folder

2. **Converted Files**:
   - All processed/compressed images (including PNG files converted from PDFs) → `logos/` folder

3. **Cleanup Process**:
   - Removed `cleanupUncompressedFolder` function
   - Added `cleanupLogoPdfFolder` function that only cleans up PNG files in the logo-pdf folder

4. **ActiveCampaign Integration**:
   - `mockup_url` field: Receives the mockup URL (background + logo)
   - `mockup_logotipo` field: Receives the original logo URL (uncompressed PNG/JPG or PDF)

## Files Modified

1. **unified-s3-storage.js**:
   - Updated `uploadToS3` function to handle the new folder structure
   - Replaced `cleanupUncompressedFolder` with `cleanupLogoPdfFolder`
   - Added additional checks to ensure PNG files from PDF conversion go to the logos folder

2. **unified-server.js**:
   - Updated file upload logic to use the new folder structure
   - Updated the cleanup function call to use `cleanupLogoPdfFolder`
   - Added missing `LAMBDA_API_ENDPOINT` constant

3. **unified-pdf-converter.js**:
   - Added "target-folder" metadata to ensure converted PNG files are properly directed to the logos folder

## Testing

To test these changes:

1. **Upload a PNG/JPG file**:
   - The original file should be stored in `logo-uncompressed/`
   - A compressed version should be stored in `logos/`
   - The `mockup_logotipo` field in ActiveCampaign should receive the URL to the original file in `logo-uncompressed/`

2. **Upload a PDF file**:
   - The original PDF should be stored in `logo-pdf/`
   - A converted PNG should be stored in `logos/`
   - No PNG files should remain in the `logo-pdf/` folder
   - The `mockup_logotipo` field in ActiveCampaign should receive the URL to the original PDF in `logo-pdf/`

3. **For all uploads**:
   - The `mockup_url` field in ActiveCampaign should receive the URL to the generated mockup
