# Manipulação de Arquivos no Sistema de Mockups

Este documento explica como o sistema lida com diferentes tipos de arquivos (PDF, PNG, JPG) e como eles são armazenados no S3.

## Estrutura de Pastas no S3

O sistema utiliza duas pastas principais no bucket S3 para armazenar os logos:

1. **logo-uncompressed/** - Armazena os arquivos originais sem compressão
2. **logos/** - Armazena os arquivos processados para uso na geração de mockups

## Fluxo de Processamento por Tipo de Arquivo

### Arquivos PDF

Quando um usuário envia um arquivo PDF:

1. O PDF original é enviado **apenas** para a pasta `logo-uncompressed/`
2. A URL do PDF na pasta `logo-uncompressed/` é enviada para o AWS Lambda
3. O Lambda detecta que é um PDF (através da extensão do arquivo e/ou da pasta)
4. O Lambda baixa o PDF, converte para PNG e salva o PNG na pasta `logos/`
5. O Lambda usa o PNG convertido para gerar o mockup

Resultado:
- O PDF original fica armazenado em `logo-uncompressed/`
- O PNG convertido fica armazenado em `logos/`
- O mockup é gerado usando o PNG convertido

### Arquivos PNG/JPG

Quando um usuário envia um arquivo PNG ou JPG:

1. O arquivo original é enviado para a pasta `logo-uncompressed/`
2. Uma cópia do arquivo é enviada para a pasta `logos/`
3. A URL da cópia na pasta `logos/` é enviada para o AWS Lambda
4. O Lambda usa diretamente o arquivo da pasta `logos/` para gerar o mockup

Resultado:
- O arquivo original fica armazenado em `logo-uncompressed/`
- Uma cópia do arquivo fica armazenada em `logos/`
- O mockup é gerado usando a cópia da pasta `logos/`

## Detecção de Tipo de Arquivo

O sistema detecta o tipo de arquivo de várias maneiras:

1. **No servidor Node.js**:
   - Através do MIME type do arquivo enviado (`req.file.mimetype`)
   - Através da extensão do arquivo original (`req.file.originalname`)

2. **No AWS Lambda**:
   - Através do parâmetro `isPdf` enviado pelo servidor
   - Através da extensão do arquivo na URL
   - Através da presença da pasta `logo-uncompressed/` na URL (para PDFs)

## Metadados dos Arquivos

Todos os arquivos enviados para o S3 incluem metadados que indicam:

- Se é um arquivo original não comprimido (`is-original: true/false`)
- O nome do arquivo original (`original-filename`)
- O tipo de arquivo (`file-type`)
- Se deve ser tratado como não comprimido (`uncompressed: true`)

## Fluxo de Dados para ActiveCampaign

1. A URL do arquivo original em `logo-uncompressed/` é enviada para o campo `mockup_logotipo` no ActiveCampaign
2. A URL do mockup gerado é enviada para o campo `mockup_url` no ActiveCampaign

Isso garante que o ActiveCampaign sempre tenha acesso tanto ao logo original quanto ao mockup gerado.
