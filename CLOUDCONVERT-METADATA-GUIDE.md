# Guia de Metadados com CloudConvert e AWS S3

Este documento explica como lidar com metadados ao converter arquivos PDF para PNG usando o CloudConvert e depois armazená-los no AWS S3.

## O Problema

Ao converter arquivos PDF para PNG usando o CloudConvert e depois enviá-los para o AWS S3, os metadados definidos durante a conversão não estavam sendo preservados corretamente. Embora o CloudConvert ofereça uma operação `metadata/write` para adicionar metadados aos arquivos convertidos, esses metadados não estavam sendo reconhecidos pelo AWS S3 quando o arquivo era enviado.

## A Solução

Implementamos uma solução em duas partes para garantir que os metadados sejam preservados:

1. **Arquivo de Metadados Auxiliar**: Criamos um arquivo JSON auxiliar que armazena os metadados do arquivo convertido.
2. **Detecção e Aplicação Aprimoradas**: Modificamos o código de upload para o S3 para detectar arquivos convertidos e aplicar os metadados corretos.

## Como Funciona

### 1. Conversão de PDF para PNG com CloudConvert

```javascript
// Definir metadados personalizados
const customMetadata = {
  "is-original": "false",
  "uncompressed": "false",
  "file-type": "png",
  "original-filename": outputFilename,
  "converted-from": filename,
  "conversion-source": "pdf",
  "conversion-type": "cloudconvert",
};

// Criar job com tarefa de metadados
const job = await cloudConvert.jobs.create({
  tasks: {
    upload_logo: { operation: "import/upload" },
    convert_logo: {
      operation: "convert",
      input: "upload_logo",
      output_format: "png",
      // ... outras opções
    },
    // Adicionar tarefa para escrever metadados
    add_metadata: {
      operation: "metadata/write",
      input: "convert_logo",
      metadata: customMetadata,
    },
    export_logo: { operation: "export/url", input: "add_metadata" },
  },
});
```

### 2. Criação de Arquivo de Metadados Auxiliar

Após baixar o arquivo convertido, criamos um arquivo JSON auxiliar com os mesmos metadados:

```javascript
// Criar um arquivo de metadados auxiliar
const metadataFilePath = `${localPath}.metadata.json`;
fs.writeFileSync(metadataFilePath, JSON.stringify(customMetadata, null, 2));
```

### 3. Detecção de Arquivos Convertidos

Ao fazer upload para o S3, verificamos se existe um arquivo de metadados auxiliar:

```javascript
// Verificar se existe um arquivo de metadados auxiliar
const possibleMetadataFile = path.join(
  process.cwd(),
  'temp',
  `${fileName}.metadata.json`
);

if (fs.existsSync(possibleMetadataFile)) {
  metadataFromFile = JSON.parse(fs.readFileSync(possibleMetadataFile, 'utf8'));
  
  // Se o arquivo de metadados existe e contém informações de conversão
  if (metadataFromFile && 
      metadataFromFile["converted-from"] && 
      metadataFromFile["conversion-source"] === "pdf") {
    isPngFromCloudConvert = true;
  }
}
```

### 4. Aplicação de Metadados no S3

Se encontramos metadados no arquivo auxiliar, aplicamos esses metadados ao fazer upload para o S3:

```javascript
// Se temos metadados do arquivo auxiliar, usá-los
if (metadataFromFile) {
  // Adicionar todos os metadados do arquivo auxiliar
  Object.entries(metadataFromFile).forEach(([key, value]) => {
    params.Metadata[key] = value;
  });
}
```

### 5. Verificação de Metadados

Após o upload, verificamos se os metadados foram aplicados corretamente:

```javascript
// Verificar se os metadados foram aplicados corretamente
const headResult = await s3.headObject({
  Bucket: params.Bucket,
  Key: params.Key
}).promise();

if (headResult.Metadata) {
  console.log("Metadata successfully applied to S3 object:");
  console.log(JSON.stringify(headResult.Metadata, null, 2));
}
```

## Limitações do CloudConvert

O CloudConvert oferece a operação `metadata/write`, mas há algumas limitações:

1. **Suporte Limitado a Formatos**: Nem todos os formatos de arquivo suportam metadados da mesma forma.
2. **Perda Durante o Download**: Os metadados podem ser perdidos durante o download do arquivo.
3. **Incompatibilidade com S3**: Os metadados adicionados pelo CloudConvert podem estar em um formato que não é reconhecido pelo AWS S3.

## Testando a Solução

Incluímos um script de teste `test-cloudconvert-metadata.js` que:

1. Converte um arquivo PDF para PNG usando o CloudConvert
2. Cria um arquivo de metadados auxiliar
3. Faz upload do arquivo convertido para o S3
4. Verifica se os metadados foram aplicados corretamente

Para executar o teste:

```bash
node test-cloudconvert-metadata.js
```

## Conclusão

Esta solução garante que os metadados sejam preservados ao converter arquivos PDF para PNG usando o CloudConvert e depois armazená-los no AWS S3. Embora o CloudConvert ofereça uma operação para adicionar metadados, nossa abordagem com arquivos auxiliares é mais robusta e confiável.

Se você encontrar problemas com metadados, verifique:

1. Se o arquivo de metadados auxiliar está sendo criado corretamente
2. Se os metadados estão sendo detectados e aplicados durante o upload para o S3
3. Se os metadados estão dentro do limite de 2KB do AWS S3
