const AWS = require("aws-sdk");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");

// Load environment variables
dotenv.config();

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize S3 client
const s3 = new AWS.S3();

// Default expiration time for pre-signed URLs (7 days in seconds)
const DEFAULT_EXPIRATION = 7 * 24 * 60 * 60;

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Original file name
 * @param {string} folder - Folder to upload to
 * @param {boolean} isUncompressed - Whether this is an uncompressed original file
 * @returns {Promise<object>} - S3 upload result with URL
 */
async function uploadToS3(
  fileBuffer,
  fileName,
  folder = "logos",
  isUncompressed = false
) {
  try {
    console.log(`Uploading file to S3: ${fileName}`);
    console.log(`File extension: ${fileName.split(".").pop().toLowerCase()}`);
    console.log(
      `File type: ${
        fileName.split(".").pop().toLowerCase() === "jpg" ||
        fileName.split(".").pop().toLowerCase() === "jpeg"
          ? "JPEG Image"
          : fileName.split(".").pop().toLowerCase() === "png"
          ? "PNG Image"
          : fileName.split(".").pop().toLowerCase() === "pdf"
          ? "PDF Document"
          : "Unknown"
      }`
    );
    console.log(`Is uncompressed original: ${isUncompressed}`);

    // Se o arquivo for marcado como não comprimido original ou se a pasta já for logo-uncompressed
    if (isUncompressed && folder !== "logo-uncompressed") {
      folder = "logo-uncompressed";
      console.log(`Using logo-uncompressed folder for original file`);
    } else if (folder === "logo-uncompressed") {
      console.log(`Folder already set to logo-uncompressed, keeping it`);
    }

    // Generate a unique ID for the file
    const fileId = uuidv4();
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const key = `${folder}/${fileId}.${fileExtension}`;

    // Determine the correct content type
    let contentType;
    if (fileExtension === "jpg" || fileExtension === "jpeg") {
      contentType = "image/jpeg";
      console.log(`Setting content type for JPG/JPEG file: ${contentType}`);
    } else if (fileExtension === "png") {
      contentType = "image/png";
      console.log(`Setting content type for PNG file: ${contentType}`);
    } else if (fileExtension === "pdf") {
      contentType = "application/pdf";
      console.log(`Setting content type for PDF file: ${contentType}`);
    } else {
      contentType = `image/${fileExtension}`;
      console.log(`Setting content type for other file type: ${contentType}`);
    }

    // Upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET || "mockup-hudlab",
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // ACL removed as the bucket does not support ACLs
    };

    // Adicionar metadados para todos os arquivos - usando o prefixo x-amz-meta- para garantir compatibilidade
    // Nota: O AWS SDK para Node.js adiciona automaticamente o prefixo x-amz-meta- aos metadados
    // mas é importante usar nomes de chave em minúsculas e valores compatíveis com ASCII
    params.Metadata = {
      "original-filename": fileName,
      "file-type": fileExtension,
    };

    // Verificar se é um arquivo PNG convertido pelo CloudConvert
    // Podemos verificar pelo nome do arquivo ou por outros indicadores
    let isPngFromCloudConvert = false;
    let metadataFromFile = null;

    // Verificar se existe um arquivo de metadados auxiliar
    const possibleMetadataFile = path.join(
      process.cwd(),
      "temp",
      `${fileName}.metadata.json`
    );

    if (fs.existsSync(possibleMetadataFile)) {
      try {
        console.log(
          `Found metadata file for ${fileName}: ${possibleMetadataFile}`
        );
        metadataFromFile = JSON.parse(
          fs.readFileSync(possibleMetadataFile, "utf8")
        );
        console.log(
          `Loaded metadata from file: ${JSON.stringify(
            metadataFromFile,
            null,
            2
          )}`
        );

        // Se o arquivo de metadados existe e contém informações de conversão, é um arquivo convertido
        if (
          metadataFromFile &&
          metadataFromFile["converted-from"] &&
          metadataFromFile["conversion-source"] === "pdf"
        ) {
          isPngFromCloudConvert = true;
          console.log(
            `Detected PNG file converted from PDF based on metadata file`
          );
        }
      } catch (err) {
        console.error(`Error reading metadata file: ${err.message}`);
      }
    }

    // Se não encontramos um arquivo de metadados, verificar pelo nome e conteúdo
    if (!isPngFromCloudConvert) {
      isPngFromCloudConvert =
        fileExtension === "png" &&
        // Verificar se o nome do arquivo indica que foi convertido de PDF
        (fileName.toLowerCase().includes("converted") ||
          fileName.toLowerCase().includes("pdf-to-png") ||
          // Verificar se o nome do arquivo segue o padrão de conversão (nome.pdf.png)
          fileName.toLowerCase().match(/\.pdf\.png$/) ||
          // Verificar se o nome do arquivo termina com -converted.png
          fileName.toLowerCase().endsWith("-converted.png") ||
          // Ou verificar se há metadados específicos no buffer (não é 100% confiável para arquivos binários)
          (fileBuffer.toString().includes("converted-from") &&
            fileBuffer.toString().includes("conversion-source") &&
            fileBuffer.toString().includes("conversion-type")));
    }

    // Log para depuração
    if (isPngFromCloudConvert) {
      console.log(`Detected PNG file converted from PDF: ${fileName}`);
      console.log(`Detection criteria matched for CloudConvert PNG file`);
    }

    // Verificar se é um arquivo na pasta logo-uncompressed ou marcado como não comprimido
    try {
      if (isPngFromCloudConvert) {
        console.log(
          `PNG file from CloudConvert detected - setting appropriate metadata`
        );

        // Se temos metadados do arquivo auxiliar, usá-los
        if (metadataFromFile) {
          console.log(`Using metadata from auxiliary file`);

          // Adicionar todos os metadados do arquivo auxiliar
          Object.entries(metadataFromFile).forEach(([key, value]) => {
            params.Metadata[key] = value;
          });

          console.log(`Applied metadata from auxiliary file to S3 upload`);
        } else {
          // Adicionar metadados específicos para arquivos convertidos pelo CloudConvert
          // Usando nomes de chave em minúsculas para garantir compatibilidade
          params.Metadata.uncompressed = "false";
          params.Metadata["is-original"] = "false";
          params.Metadata["converted-from"] = "pdf";
          params.Metadata["conversion-source"] = "pdf";
          params.Metadata["conversion-type"] = "cloudconvert";

          console.log(
            `Setting default metadata for CloudConvert converted PNG file`
          );
        }

        // Garantir que estes campos estejam sempre presentes
        params.Metadata.uncompressed = params.Metadata.uncompressed || "false";
        params.Metadata["is-original"] =
          params.Metadata["is-original"] || "false";

        console.log(
          `Final metadata for CloudConvert converted PNG file: ${JSON.stringify(
            params.Metadata,
            null,
            2
          )}`
        );
      } else if (isUncompressed || folder === "logo-uncompressed") {
        console.log(
          `Original uncompressed file detected - setting appropriate metadata`
        );

        // Adicionar metadados específicos para arquivos não comprimidos
        params.Metadata.uncompressed = "true";
        params.Metadata["is-original"] = "true";

        console.log(
          `Setting metadata for uncompressed original file in ${folder}`
        );
      } else {
        // Para arquivos na pasta logos (comprimidos/processados)
        console.log(`Processed file detected - setting appropriate metadata`);

        // Adicionar metadados específicos para arquivos comprimidos/processados
        params.Metadata.uncompressed = "false";
        params.Metadata["is-original"] = "false";

        console.log(`Setting metadata for processed file in ${folder}`);
      }

      // Verificar se o tamanho total dos metadados não excede 2KB
      const metadataSize = Object.entries(params.Metadata).reduce(
        (size, [key, value]) => size + key.length + (value ? value.length : 0),
        0
      );

      if (metadataSize > 2048) {
        console.warn(
          `Metadata size (${metadataSize} bytes) exceeds 2KB limit. Some metadata may be truncated.`
        );
        // Remover metadados menos importantes se necessário
        delete params.Metadata["conversion-source"];
        delete params.Metadata["conversion-type"];
      }
    } catch (metadataError) {
      console.error("Error setting metadata:", metadataError);
      // Continuar com o upload mesmo se houver erro nos metadados
      // Definir metadados mínimos
      params.Metadata = {
        "original-filename": fileName,
        "file-type": fileExtension,
      };
    }

    // Log the upload parameters
    console.log(`S3 upload parameters:
    - Bucket: ${params.Bucket}
    - Key: ${params.Key}
    - ContentType: ${params.ContentType}
    - File size: ${fileBuffer.length} bytes
    - Folder: ${folder}
    - Metadata: ${params.Metadata ? JSON.stringify(params.Metadata) : "None"}`);

    // Upload to S3
    const result = await s3.upload(params).promise();

    console.log("File uploaded to S3:");
    console.log("- Location:", result.Location);
    console.log("- Key:", result.Key);
    console.log("- Folder:", folder);

    // Since the bucket is now public, we'll use direct URLs instead of pre-signed URLs
    console.log("- Direct URL:", result.Location);

    // Verificar se os metadados foram aplicados corretamente
    try {
      console.log("Verifying metadata was applied correctly...");
      const headParams = {
        Bucket: params.Bucket,
        Key: params.Key,
      };

      const headResult = await s3.headObject(headParams).promise();

      if (headResult.Metadata) {
        console.log("Metadata successfully applied to S3 object:");
        console.log(JSON.stringify(headResult.Metadata, null, 2));
      } else {
        console.warn("No metadata found on S3 object after upload");
      }
    } catch (metadataError) {
      console.warn(`Could not verify metadata: ${metadataError.message}`);
    }

    // Create a result object with additional information
    const uploadResult = {
      url: result.Location, // Use direct URL since bucket is public
      directUrl: result.Location, // Also include the direct URL for reference (same as url now)
      key: result.Key,
      contentType: contentType,
      fileExtension: fileExtension,
      isOriginalUncompressed: isUncompressed || folder === "logo-uncompressed", // Flag to indicate if this is an uncompressed original
      originalFileName: fileName,
      folder: folder,
    };

    console.log(`S3 upload result: ${JSON.stringify(uploadResult, null, 2)}`);

    return uploadResult;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for an S3 object
 * @param {string} key - S3 object key
 * @param {number} expirationSeconds - Expiration time in seconds (default: 7 days)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function generatePresignedUrl(
  key,
  expirationSeconds = DEFAULT_EXPIRATION
) {
  try {
    console.log(`Generating pre-signed URL for S3 object: ${key}`);
    console.log(
      `URL will expire in ${expirationSeconds} seconds (${Math.round(
        expirationSeconds / 86400
      )} days)`
    );

    const params = {
      Bucket: process.env.S3_BUCKET || "mockup-hudlab",
      Key: key,
      Expires: expirationSeconds,
    };

    const url = await s3.getSignedUrlPromise("getObject", params);
    console.log(`Pre-signed URL generated: ${url.substring(0, 100)}...`);

    return url;
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    throw error;
  }
}

/**
 * Get a pre-signed URL for an existing S3 object
 * @param {string} url - S3 object URL
 * @param {number} expirationSeconds - Expiration time in seconds (default: 7 days)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getPresignedUrlFromS3Url(
  url,
  expirationSeconds = DEFAULT_EXPIRATION
) {
  try {
    console.log(`Getting pre-signed URL for S3 URL: ${url}`);

    // Ensure we're using the latest AWS credentials
    AWS.config.update({
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    // Reinitialize S3 client with updated credentials
    const s3Client = new AWS.S3();

    // Extract the key from the S3 URL
    // URL format could be one of:
    // 1. https://bucket-name.s3.amazonaws.com/key
    // 2. https://bucket-name.s3.region.amazonaws.com/key
    // 3. https://s3.region.amazonaws.com/bucket-name/key

    const urlObj = new URL(url);
    let key = "";
    let bucket = process.env.S3_BUCKET || "mockup-hudlab";

    console.log(
      `URL hostname: ${urlObj.hostname}, pathname: ${urlObj.pathname}`
    );

    if (urlObj.hostname.includes("s3.amazonaws.com")) {
      // Format: https://bucket-name.s3.amazonaws.com/key or https://bucket-name.s3.region.amazonaws.com/key
      const pathParts = urlObj.pathname
        .split("/")
        .filter((part) => part.length > 0);
      key = pathParts.join("/");

      // Extract bucket name from hostname if it's in the format bucket-name.s3.region.amazonaws.com
      if (urlObj.hostname.split(".")[0] !== "s3") {
        bucket = urlObj.hostname.split(".")[0];
      }
    } else if (
      urlObj.hostname === "s3.amazonaws.com" ||
      urlObj.hostname.startsWith("s3.")
    ) {
      // Format: https://s3.region.amazonaws.com/bucket-name/key
      const pathParts = urlObj.pathname
        .split("/")
        .filter((part) => part.length > 0);
      bucket = pathParts[0];
      key = pathParts.slice(1).join("/");
    }

    console.log(`Extracted bucket: ${bucket}, key: ${key}`);
    console.log(
      `Using AWS credentials: Access Key ID: ${process.env.AWS_ACCESS_KEY_ID.substring(
        0,
        5
      )}...`
    );
    console.log(`Using AWS region: ${process.env.AWS_REGION || "us-east-1"}`);

    // Verify the object exists before generating a pre-signed URL
    try {
      console.log(`Verifying object exists: Bucket=${bucket}, Key=${key}`);
      const headParams = {
        Bucket: bucket,
        Key: key,
      };

      await s3Client.headObject(headParams).promise();
      console.log(
        "Object exists in S3, proceeding with pre-signed URL generation"
      );
    } catch (headError) {
      console.warn(
        `Warning: Could not verify object existence: ${headError.message}`
      );
      console.log("Continuing with pre-signed URL generation anyway...");
    }

    // Generate pre-signed URL with explicit bucket and key
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: expirationSeconds,
    };

    console.log(
      `Generating pre-signed URL with params: ${JSON.stringify(params)}`
    );

    const presignedUrl = await s3Client.getSignedUrlPromise(
      "getObject",
      params
    );

    // Validate the generated URL
    if (!presignedUrl) {
      console.error("Generated URL is undefined or empty");
      throw new Error("Failed to generate valid pre-signed URL");
    }

    // Check if the URL contains AWS access key parameters
    // It could be either X-Amz-Signature (v4) or AWSAccessKeyId (v2)
    if (
      presignedUrl.includes("X-Amz-Signature=") ||
      presignedUrl.includes("AWSAccessKeyId=")
    ) {
      console.log(
        "Valid pre-signed URL generated with AWS authentication parameters"
      );
    } else {
      console.warn(
        "Generated URL does not contain expected AWS authentication parameters"
      );
      console.log(
        "This might still be valid depending on your AWS configuration"
      );
    }

    console.log(
      `Pre-signed URL generated: ${presignedUrl.substring(0, 100)}...`
    );
    console.log(
      `URL will expire in ${expirationSeconds} seconds (${Math.round(
        expirationSeconds / 86400
      )} days)`
    );

    return presignedUrl;
  } catch (error) {
    console.error("Error getting pre-signed URL from S3 URL:", error);
    throw error;
  }
}

module.exports = {
  uploadToS3,
  generatePresignedUrl,
  getPresignedUrlFromS3Url,
};
