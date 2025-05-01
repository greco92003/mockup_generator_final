import fs from "fs";
import path from "path";
import https from "https";
import * as dotenv from "dotenv";

dotenv.config();

// Use require for CloudConvert as it may not support ES modules properly
const CloudConvert = require("cloudconvert");
const cloudConvert = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY || "",
  false
); // false = production

/** Converts a PDF (buffer) to PNG with metadata and returns the local download path */
export async function pdfBufferToPng(
  buffer: Buffer,
  filename = "logo.pdf"
): Promise<string> {
  // Create job (upload + convert + export)
  const job = await cloudConvert.jobs.create({
    tasks: {
      upload_logo: { operation: "import/upload" },
      convert_logo: {
        operation: "convert",
        input: "upload_logo",
        output_format: "png",
        pages: "1", // first page only
        filename: filename.replace(/\.pdf$/i, ".png"),
      },
      // Adicionar tarefa para escrever metadados no arquivo convertido
      add_metadata: {
        operation: "metadata/write",
        input: "convert_logo",
        metadata: {
          "is-original": "false",
          uncompressed: "false",
          "file-type": "png",
          "original-filename": filename.replace(/\.pdf$/i, ".png"),
          "converted-from": filename,
          "conversion-source": "pdf",
          "conversion-type": "cloudconvert",
        },
      },
      export_logo: { operation: "export/url", input: "add_metadata" },
    },
  });

  // Upload the file
  const uploadTask = job.tasks.find((t) => t.name === "upload_logo")!;
  await cloudConvert.tasks.upload(uploadTask, buffer, filename, buffer.length);

  // Wait for completion
  const completed = await cloudConvert.jobs.wait(job.id);

  // Download the generated PNG
  const file = cloudConvert.jobs.getExportUrls(completed)[0];
  const tempDir = path.join(process.cwd(), "temp");

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const localPath = path.join(tempDir, file.filename);

  await new Promise<void>((resolve, reject) => {
    const ws = fs.createWriteStream(localPath);
    https.get(file.url, (response) => response.pipe(ws));
    ws.on("finish", () => resolve());
    ws.on("error", reject);
  });

  return localPath;
}
