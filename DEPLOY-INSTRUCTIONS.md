# Instruções para Deploy em Produção

Este documento contém instruções para fazer o deploy do formulário integrado com ActiveCampaign em um ambiente de produção.

## Pré-requisitos

- Node.js 14.x ou superior
- Acesso ao AWS S3 e Lambda
- Acesso à API do ActiveCampaign
- Servidor com suporte a Node.js (Vercel, Heroku, AWS, etc.)

## Arquivos Necessários

Os seguintes arquivos são necessários para o deploy:

- `activecampaign-form-handler.js` - Servidor Express
- `active-campaign-api.js` - Módulo de integração com ActiveCampaign
- `s3-upload.js` - Módulo de upload para S3
- `aws-lambda-config.js` - Módulo de integração com AWS Lambda
- `async-processor.js` - Módulo para processamento assíncrono
- `public/integrated-form-activecampaign.html` - Formulário HTML

## Passos para Deploy

### 1. Configuração de Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no seu servidor:

```
AWS_ACCESS_KEY_ID=seu_access_key_id
AWS_SECRET_ACCESS_KEY=sua_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET=mockup-hudlab
ACTIVE_CAMPAIGN_URL=https://hudlabprivatelabel.activehosted.com
ACTIVE_CAMPAIGN_API_KEY=sua_api_key
LAMBDA_API_ENDPOINT=https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod/mockup
WHATSAPP_REDIRECT_URL=https://api.whatsapp.com/send?phone=5551994305831
PORT=3001
```

### 2. Deploy no Vercel

Se estiver usando o Vercel, siga estes passos:

1. Instale a CLI do Vercel:
   ```
   npm install -g vercel
   ```

2. Faça login na sua conta:
   ```
   vercel login
   ```

3. Configure o projeto:
   ```
   vercel init
   ```

4. Deploy:
   ```
   vercel --prod
   ```

### 3. Deploy no Heroku

Se estiver usando o Heroku, siga estes passos:

1. Instale a CLI do Heroku:
   ```
   npm install -g heroku
   ```

2. Faça login na sua conta:
   ```
   heroku login
   ```

3. Crie um novo app:
   ```
   heroku create seu-app-name
   ```

4. Configure as variáveis de ambiente:
   ```
   heroku config:set AWS_ACCESS_KEY_ID=seu_access_key_id
   heroku config:set AWS_SECRET_ACCESS_KEY=sua_secret_access_key
   ...
   ```

5. Deploy:
   ```
   git push heroku main
   ```

### 4. Deploy em um Servidor VPS

Se estiver usando um servidor VPS, siga estes passos:

1. Transfira os arquivos para o servidor:
   ```
   scp -r ./* usuario@seu-servidor:/caminho/para/app
   ```

2. Instale as dependências:
   ```
   npm install --production
   ```

3. Configure o PM2 para manter o servidor rodando:
   ```
   npm install -g pm2
   pm2 start activecampaign-form-handler.js --name "activecampaign-form"
   pm2 save
   pm2 startup
   ```

## Testando o Deploy

Após o deploy, acesse a URL do seu servidor seguida de `/test` para verificar se o formulário está funcionando corretamente:

```
https://seu-servidor.com/test
```

## Integrando o Formulário em um Site

Para integrar o formulário em um site, use um iframe:

```html
<iframe 
  src="https://seu-servidor.com/public/integrated-form-activecampaign.html" 
  width="100%" 
  height="800px" 
  frameborder="0">
</iframe>
```

## Solução de Problemas

### O formulário não está enviando os arquivos

Verifique se o servidor está rodando e se as permissões CORS estão configuradas corretamente.

### As URLs não estão sendo atualizadas no ActiveCampaign

Verifique os logs do servidor para ver se há erros na comunicação com a API do ActiveCampaign.

### O mockup não está sendo gerado

Verifique se a função Lambda está funcionando corretamente e se as credenciais AWS estão configuradas corretamente.
