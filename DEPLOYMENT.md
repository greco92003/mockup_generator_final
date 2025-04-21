# Guia de Implantação

Este guia explica como implantar o Gerador de Mockups HUD LAB no Vercel e configurar o Supabase para armazenamento.

## Pré-requisitos

1. Conta no [GitHub](https://github.com)
2. Conta no [Vercel](https://vercel.com)
3. Conta no [Supabase](https://supabase.com)
4. Conta no [CloudConvert](https://cloudconvert.com)
5. Conta no [ActiveCampaign](https://www.activecampaign.com)
6. Conta no [ManyChat](https://manychat.com) (opcional)

## Passo 1: Preparar o Repositório GitHub

1. Crie um novo repositório no GitHub
2. Faça push do código para o repositório:
   ```bash
   git init
   git add .
   git commit -m "Versão inicial"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/mockup-generator.git
   git push -u origin main
   ```

## Passo 2: Configurar o Supabase

1. Crie uma nova organização e projeto no Supabase
2. Vá para "Storage" e crie um novo bucket chamado "mockups"
3. Configure as permissões do bucket:
   - Vá para "Storage" > "Policies"
   - Adicione uma nova policy para o bucket "mockups":
     - Nome: "Public Access"
     - Allowed operations: SELECT
     - Policy definition: `true` (para permitir acesso público)
   - Adicione outra policy:
     - Nome: "Insert Access"
     - Allowed operations: INSERT
     - Policy definition: `true` (para permitir inserções)
4. Anote a URL do projeto e a chave de API (Settings > API)

## Passo 3: Implantar no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New" > "Project"
3. Importe o repositório GitHub
4. Configure as variáveis de ambiente:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `BASE_URL`: URL do seu projeto Vercel (ex: https://mockup-generator.vercel.app)
   - `CLOUDCONVERT_API_KEY`: Sua chave de API do CloudConvert
   - `ACTIVE_CAMPAIGN_URL`: URL da sua conta ActiveCampaign
   - `ACTIVE_CAMPAIGN_API_KEY`: Chave de API do ActiveCampaign
   - `MANYCHAT_API_KEY`: Chave de API do ManyChat (opcional)
   - `WHATSAPP_REDIRECT_URL`: URL de redirecionamento para WhatsApp
   - `SUPABASE_URL`: URL do seu projeto Supabase
   - `SUPABASE_KEY`: Chave de API do Supabase
5. Clique em "Deploy"

## Passo 4: Verificar a Implantação

1. Após a implantação, acesse a URL do seu projeto Vercel
2. Teste o formulário de upload de logo
3. Verifique se o mockup é gerado corretamente
4. Verifique se o lead é criado no ActiveCampaign
5. Verifique se o campo personalizado `mockup_url` é atualizado no ActiveCampaign

## Passo 5: Configurar Domínio Personalizado (Opcional)

1. No Vercel, vá para "Settings" > "Domains"
2. Adicione seu domínio personalizado
3. Siga as instruções para configurar os registros DNS

## Solução de Problemas

### Erro ao fazer upload para o Supabase

Verifique se as permissões do bucket estão configuradas corretamente e se as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_KEY` estão definidas corretamente.

### Erro ao gerar mockup

Verifique os logs do Vercel para identificar o problema. Pode ser um problema com o CloudConvert ou com o processamento de imagens.

### Erro ao criar lead no ActiveCampaign

Verifique se as variáveis de ambiente `ACTIVE_CAMPAIGN_URL` e `ACTIVE_CAMPAIGN_API_KEY` estão definidas corretamente e se o campo personalizado `mockup_url` existe no ActiveCampaign.

## Manutenção

### Atualizar o Código

1. Faça as alterações no código localmente
2. Faça commit e push para o GitHub
3. O Vercel irá automaticamente reimplantar o projeto

### Monitorar Uso do Supabase

1. Acesse o painel do Supabase
2. Vá para "Storage" > "Usage"
3. Monitore o uso de armazenamento para evitar exceder os limites do plano gratuito
