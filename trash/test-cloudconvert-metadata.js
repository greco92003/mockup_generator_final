/**
 * Script para testar a conversão de PDF para PNG com o CloudConvert
 * e verificar se os metadados estão sendo corretamente aplicados
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const CloudConvert = require('cloudconvert');
const https = require('https');
const AWS = require('aws-sdk');
const s3Upload = require('./s3-upload');

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar CloudConvert
const cloudConvert = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY || "",
  false
);

// Configurar AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Inicializar cliente S3
const s3 = new AWS.S3();

// Criar diretório temporário se não existir
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Função para converter PDF para PNG usando CloudConvert
async function convertPdfToPng(pdfPath, outputFilename) {
  try {
    console.log(`\n=== INICIANDO CONVERSÃO DE PDF PARA PNG ===`);
    console.log(`PDF de origem: ${pdfPath}`);
    
    // Ler o arquivo PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Definir metadados personalizados
    const customMetadata = {
      "is-original": "false",
      "uncompressed": "false",
      "file-type": "png",
      "original-filename": outputFilename,
      "converted-from": path.basename(pdfPath),
      "conversion-source": "pdf",
      "conversion-type": "cloudconvert",
    };
    
    console.log(`\nMetadados a serem adicionados:`);
    console.log(JSON.stringify(customMetadata, null, 2));
    
    // Criar job (upload + convert + export)
    console.log(`\nCriando job no CloudConvert...`);
    const job = await cloudConvert.jobs.create({
      tasks: {
        upload_logo: { operation: "import/upload" },
        convert_logo: {
          operation: "convert",
          input: "upload_logo",
          input_format: "pdf",
          output_format: "png",
          engine: "mupdf",
          pages: "1",
          pixel_density: 72,
          width: 326,
          alpha: true,
          filename: outputFilename,
        },
        // Adicionar tarefa para escrever metadados no arquivo convertido
        add_metadata: {
          operation: "metadata/write",
          input: "convert_logo",
          metadata: customMetadata,
        },
        export_logo: { operation: "export/url", input: "add_metadata" },
      },
    });
    
    console.log(`Job criado: ${job.id}`);
    
    // Upload do arquivo
    const uploadTask = job.tasks.find((t) => t.name === "upload_logo");
    await cloudConvert.tasks.upload(
      uploadTask,
      pdfBuffer,
      path.basename(pdfPath),
      pdfBuffer.length
    );
    console.log(`Arquivo enviado para o CloudConvert`);
    
    // Aguardar conclusão
    console.log(`Aguardando conversão...`);
    const completed = await cloudConvert.jobs.wait(job.id);
    console.log(`Conversão concluída!`);
    
    // Exibir detalhes do job concluído
    console.log(`\nDetalhes do job concluído:`);
    console.log(JSON.stringify({
      id: completed.id,
      status: completed.status,
      tasks: completed.tasks.map(t => ({
        name: t.name,
        operation: t.operation,
        status: t.status,
      }))
    }, null, 2));
    
    // Encontrar a tarefa de metadados para verificar se foi bem-sucedida
    const metadataTask = completed.tasks.find(t => t.name === "add_metadata");
    if (metadataTask && metadataTask.status === "finished") {
      console.log(`\nTarefa de metadados concluída com sucesso!`);
      
      // Exibir o payload da tarefa de metadados
      console.log(`Payload da tarefa de metadados:`);
      console.log(JSON.stringify(metadataTask, null, 2));
    } else {
      console.warn(`\nATENÇÃO: A tarefa de metadados pode não ter sido concluída com sucesso`);
    }
    
    // Baixar o PNG gerado
    const file = cloudConvert.jobs.getExportUrls(completed)[0];
    if (!file || !file.url) {
      throw new Error("Nenhuma URL de exportação encontrada na resposta do CloudConvert");
    }
    
    console.log(`\nURL de download: ${file.url}`);
    const localPath = path.join(tempDir, file.filename);
    
    // Baixar o arquivo com tratamento de erros adequado
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(localPath);
      https.get(file.url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Falha ao baixar arquivo: ${response.statusCode} ${response.statusMessage}`));
          return;
        }
        response.pipe(ws);
      }).on('error', (err) => {
        reject(new Error(`Erro de rede ao baixar: ${err.message}`));
      });
      
      ws.on("finish", () => {
        console.log(`Arquivo baixado para: ${localPath}`);
        
        // Criar um arquivo de metadados auxiliar
        const metadataFilePath = `${localPath}.metadata.json`;
        fs.writeFileSync(metadataFilePath, JSON.stringify(customMetadata, null, 2));
        console.log(`Metadados salvos no arquivo auxiliar: ${metadataFilePath}`);
        
        resolve();
      });
      ws.on("error", (err) => {
        reject(new Error(`Erro de sistema de arquivos ao salvar: ${err.message}`));
      });
    });
    
    return { localPath, filename: file.filename };
  } catch (error) {
    console.error(`\nERRO na conversão de PDF para PNG: ${error.message}`);
    throw error;
  }
}

// Função para fazer upload do arquivo convertido para o S3
async function uploadConvertedFileToS3(filePath, fileName) {
  try {
    console.log(`\n=== ENVIANDO ARQUIVO CONVERTIDO PARA O S3 ===`);
    console.log(`Arquivo: ${filePath}`);
    console.log(`Nome: ${fileName}`);
    
    // Ler o conteúdo do arquivo
    const fileContent = fs.readFileSync(filePath);
    
    // Fazer upload para o S3
    const result = await s3Upload.uploadToS3(fileContent, fileName, "logos");
    
    console.log(`\nArquivo enviado para o S3 com sucesso!`);
    console.log(`URL: ${result.url}`);
    
    return result;
  } catch (error) {
    console.error(`\nERRO ao enviar arquivo para o S3: ${error.message}`);
    throw error;
  }
}

// Função para verificar os metadados de um objeto no S3
async function checkS3ObjectMetadata(bucket, key) {
  try {
    console.log(`\n=== VERIFICANDO METADADOS NO S3 ===`);
    console.log(`Bucket: ${bucket}`);
    console.log(`Key: ${key}`);
    
    const params = {
      Bucket: bucket,
      Key: key
    };
    
    const result = await s3.headObject(params).promise();
    
    if (result.Metadata) {
      console.log(`\nMetadados encontrados no objeto S3:`);
      console.log(JSON.stringify(result.Metadata, null, 2));
      return result.Metadata;
    } else {
      console.warn(`\nNenhum metadado encontrado no objeto S3`);
      return null;
    }
  } catch (error) {
    console.error(`\nERRO ao verificar metadados no S3: ${error.message}`);
    throw error;
  }
}

// Função principal
async function main() {
  try {
    console.log("=== TESTE DE METADADOS COM CLOUDCONVERT E S3 ===\n");
    
    // Verificar se existe um arquivo PDF de teste
    const testPdfPath = path.join(__dirname, "test-logo.pdf");
    if (!fs.existsSync(testPdfPath)) {
      console.log("Arquivo PDF de teste não encontrado. Criando um arquivo PDF simples...");
      
      // Aqui você poderia criar um PDF simples, mas isso requer bibliotecas adicionais
      // Por simplicidade, vamos apenas alertar o usuário
      console.error("Por favor, coloque um arquivo PDF chamado 'test-logo.pdf' na raiz do projeto para testar.");
      return;
    }
    
    // Converter PDF para PNG
    const outputFilename = `test-logo-${Date.now()}.png`;
    const { localPath, filename } = await convertPdfToPng(testPdfPath, outputFilename);
    
    // Fazer upload do arquivo convertido para o S3
    const uploadResult = await uploadConvertedFileToS3(localPath, filename);
    
    // Verificar os metadados no S3
    const bucket = process.env.S3_BUCKET || "mockup-hudlab";
    await checkS3ObjectMetadata(bucket, uploadResult.key);
    
    console.log("\n=== TESTE CONCLUÍDO ===");
  } catch (error) {
    console.error(`\nERRO no teste: ${error.message}`);
  }
}

// Executar o teste
main();
