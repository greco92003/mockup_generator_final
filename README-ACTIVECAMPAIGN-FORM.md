# ActiveCampaign Form Integration

Este módulo integra o formulário do ActiveCampaign com o upload de arquivos e geração de mockups.

## Visão Geral

O sistema permite que os usuários preencham um formulário do ActiveCampaign e façam upload de um logo (PNG, JPG ou PDF). O sistema então:

1. Envia o logo para o AWS S3
2. Gera um mockup usando AWS Lambda
3. Atualiza os campos personalizados no ActiveCampaign com as URLs do logo original e do mockup gerado
4. Envia os dados do formulário para o ActiveCampaign
5. Redireciona o usuário para a página de agradecimento

## Arquivos Principais

- `integrated-form-activecampaign.html` - Formulário HTML integrado com ActiveCampaign e upload de arquivo
- `activecampaign-form-handler.js` - Servidor Express que processa o upload de arquivo e integração com S3/Lambda
- `start-form-server.js` - Script simples para iniciar o servidor

## Como Usar

### 1. Configuração

Certifique-se de que as variáveis de ambiente estejam configuradas no arquivo `.env`:

```
# AWS Configuration
AWS_ACCESS_KEY_ID=seu_access_key_id
AWS_SECRET_ACCESS_KEY=sua_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET=mockup-hudlab

# ActiveCampaign Configuration
ACTIVE_CAMPAIGN_URL=https://hudlabprivatelabel.activehosted.com
ACTIVE_CAMPAIGN_API_KEY=sua_api_key

# Lambda Configuration
LAMBDA_API_ENDPOINT=https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod/mockup

# WhatsApp Redirect
WHATSAPP_REDIRECT_URL=https://api.whatsapp.com/send?phone=5551994305831
```

### 2. Iniciar o Servidor

```bash
node start-form-server.js
```

O servidor será iniciado na porta 3000 (ou na porta definida na variável de ambiente PORT).

### 3. Integrar o Formulário

Você pode integrar o formulário em qualquer página usando um iframe:

```html
<iframe 
  src="http://seu-dominio.com/integrated-form-activecampaign.html" 
  width="100%" 
  height="700px" 
  frameborder="0">
</iframe>
```

## Campos Personalizados no ActiveCampaign

O sistema atualiza dois campos personalizados no ActiveCampaign:

1. `mockup_url` (ID: 41) - URL do mockup gerado
2. `mockup_logotipo` (ID: 42) - URL do logo original enviado pelo usuário

## Fluxo de Processamento

1. O usuário preenche o formulário e faz upload do logo
2. O formulário é enviado via JavaScript para o endpoint `/api/mockup`
3. O servidor processa o upload, envia o logo para o S3 e solicita a geração do mockup via Lambda
4. O servidor retorna as URLs para o cliente
5. O JavaScript preenche os campos ocultos do formulário com as URLs
6. O formulário é enviado para o ActiveCampaign
7. O ActiveCampaign processa o formulário e redireciona o usuário para a página de agradecimento

## Solução de Problemas

### O formulário é enviado, mas as URLs não são atualizadas no ActiveCampaign

Verifique se o processamento assíncrono está funcionando corretamente. Os logs do servidor devem mostrar mensagens como:

```
Processing lead in ActiveCampaign asynchronously...
Updating mockup URL in ActiveCampaign asynchronously...
Updating logo URL in ActiveCampaign asynchronously...
```

### O upload do arquivo falha

Verifique se as credenciais da AWS estão configuradas corretamente e se o bucket S3 existe e está acessível.

### A geração do mockup falha

Verifique se o endpoint do AWS Lambda está configurado corretamente e se a função Lambda está funcionando.

## Notas Adicionais

- O sistema usa URLs pré-assinadas do S3 com validade de 7 dias
- O sistema inclui um mecanismo de fallback caso a geração do mockup falhe
- Os parâmetros UTM da URL são capturados e enviados para o ActiveCampaign
