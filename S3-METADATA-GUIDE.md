# S3 Metadata Guide for Mockup Generator

This document explains how metadata is handled in the Mockup Generator application when uploading files to AWS S3.

## Overview

The application uses AWS S3 to store logos and mockups. When uploading files, we attach metadata to help identify and categorize the files. This metadata is crucial for tracking file origins, processing status, and other important information.

## Metadata Structure

### Standard Metadata Fields

All files uploaded to S3 include these standard metadata fields:

| Field Name | Description | Example Value |
|------------|-------------|---------------|
| `original-filename` | The original filename before upload | `company-logo.png` |
| `file-type` | The file extension | `png`, `jpg`, `pdf` |
| `is-original` | Whether this is an original unprocessed file | `true`, `false` |
| `uncompressed` | Whether this file is uncompressed | `true`, `false` |

### Special Metadata for Converted Files

Files converted from PDF to PNG using CloudConvert have additional metadata:

| Field Name | Description | Example Value |
|------------|-------------|---------------|
| `converted-from` | Original file format | `pdf` |
| `conversion-source` | Source format | `pdf` |
| `conversion-type` | Conversion service used | `cloudconvert` |

## How Metadata is Applied

The application determines which metadata to apply based on:

1. **File Type**: Different file types (PNG, JPG, PDF) may receive different metadata
2. **Storage Location**: Files in `logo-uncompressed/` are marked as original uncompressed files
3. **Conversion Status**: Files converted from PDF to PNG receive special metadata

## Implementation Details

### JavaScript (Node.js)

In the Node.js code (`s3-upload.js`), metadata is set using the AWS SDK:

```javascript
params.Metadata = {
  "original-filename": fileName,
  "file-type": fileExtension,
  // Additional metadata based on file type and location
};
```

The AWS SDK for Node.js automatically adds the required `x-amz-meta-` prefix to metadata keys.

### Python (AWS Lambda)

In the Python Lambda function (`lambda_function.py`), metadata is set using boto3:

```python
metadata = {
  "file-type": key.split('.')[-1].lower(),
  "is-original": str(is_original).lower(),
  "uncompressed": str(is_original).lower(),
  # Additional metadata based on file type and location
}

s3.put_object(
  Body=image_bytes,
  Bucket=bucket,
  Key=key,
  ContentType=content_type,
  Metadata=metadata
)
```

The boto3 library automatically adds the required `x-amz-meta-` prefix to metadata keys.

## AWS S3 Metadata Requirements

When working with S3 metadata, keep these requirements in mind:

1. **Prefix**: User-defined metadata must have the prefix `x-amz-meta-` (added automatically by AWS SDKs)
2. **Size Limit**: Total metadata size is limited to 2KB
3. **Character Encoding**: 
   - For REST API: Use US-ASCII characters
   - For browser uploads: UTF-8 is supported
4. **Case Sensitivity**: Amazon S3 stores user-defined metadata keys in lowercase

## Permissions Required

To work with S3 metadata, your IAM user or role needs these permissions:

- `s3:PutObject` - Required for uploading objects with metadata
- `s3:GetObject` - Required for retrieving objects and their metadata
- `s3:HeadObject` - Required for retrieving just the metadata of objects

## Troubleshooting

If you encounter issues with metadata:

1. **Metadata Not Appearing**: 
   - Verify IAM permissions include `s3:PutObject`
   - Check that metadata size doesn't exceed 2KB
   - Ensure metadata keys use only allowed characters

2. **Error Messages**:
   - "Access Denied" - Check IAM permissions
   - "Metadata size exceeds limit" - Reduce the amount of metadata

3. **Viewing Metadata**:
   - In AWS Console: Select an object → Properties → Metadata
   - Via API: Use `HeadObject` operation

## Testing Metadata

You can use the included `test-s3-metadata.js` script to verify that metadata is being correctly set and retrieved:

```bash
node test-s3-metadata.js
```

This script:
1. Uploads a test file with metadata
2. Retrieves the metadata to verify it was set correctly
3. Reports any issues or permission problems

## Best Practices

1. Keep metadata concise to stay under the 2KB limit
2. Use lowercase keys for consistency
3. Avoid special characters in metadata values
4. Include error handling for metadata operations
5. Regularly test metadata functionality

---

For more information, refer to the [AWS S3 Metadata Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html).
