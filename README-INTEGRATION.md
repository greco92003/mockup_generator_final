# Integração do Gerador de Mockups com ActiveCampaign e ManyChat

Este guia explica como configurar e usar a integração do gerador de mockups com ActiveCampaign e ManyChat para automatizar o envio de mockups para leads via WhatsApp.

## Visão Geral do Fluxo

1. O usuário preenche o formulário com nome, email, telefone e faz upload do logo
2. O sistema gera o mockup e o armazena no Supabase Storage
3. Os dados do lead são enviados para o ActiveCampaign com a URL do mockup
4. O usuário é redirecionado para o WhatsApp para continuar o atendimento
5. O ManyChat pode acessar o mockup usando o email do lead para envio posterior

## Configuração

### 1. Configurar o Supabase

1. Verifique se você tem acesso ao projeto Supabase
2. Execute o script de configuração para criar as tabelas e buckets necessários:

```bash
npm run setup-supabase
```

### 2. Configurar o ActiveCampaign

1. Verifique se você tem acesso à conta do ActiveCampaign
2. Crie um campo personalizado chamado `mockup_url` (se ainda não existir)
3. Crie uma lista chamada "Mockup Leads" para armazenar os leads que geraram mockups

### 3. Configurar o ManyChat

1. Verifique se você tem acesso à conta do ManyChat
2. Crie um campo personalizado chamado `mockup_url` em "Campos do Usuário"
3. Crie um fluxo para enviar o mockup via WhatsApp usando o campo personalizado

### 4. Iniciar o Servidor Integrado

```bash
npm run integrated
```

## Endpoints da API

### 1. Gerar Mockup

```
POST /api/mockup
```

Parâmetros:
- `logo` (arquivo): O logo para gerar o mockup (PNG, JPG ou PDF)
- `name` (string): Nome do lead
- `email` (string): Email do lead (obrigatório)
- `phone` (string): Telefone do lead

Resposta:
```json
{
  "name": "Nome do Lead",
  "email": "email@exemplo.com",
  "phone": "11999999999",
  "image": "data:image/png;base64,...",
  "url": "https://supabase-url.com/storage/v1/object/public/mockups/...",
  "redirect_url": "https://api.whatsapp.com/send?phone=5551994305831&text=..."
}
```

### 2. Obter Mockup para ManyChat

```
GET /api/manychat/mockup?email=email@exemplo.com
```

Resposta (formato ManyChat v2):
```json
{
  "version": "v2",
  "content": {
    "messages": [
      {
        "type": "image",
        "url": "https://supabase-url.com/storage/v1/object/public/mockups/...",
        "buttons": [
          {
            "type": "url",
            "caption": "Download Mockup",
            "url": "https://supabase-url.com/storage/v1/object/public/mockups/..."
          }
        ]
      },
      {
        "type": "text",
        "text": "Aqui está o seu mockup, Nome do Lead! Esperamos que goste do resultado."
      }
    ]
  }
}
```

### 3. Webhook para ActiveCampaign

```
POST /api/webhook/active-campaign
```

Corpo:
```json
{
  "contact": {
    "email": "email@exemplo.com",
    "firstName": "Nome",
    "lastName": "Sobrenome",
    "phone": "11999999999"
  },
  "mockup_url": "https://supabase-url.com/storage/v1/object/public/mockups/..."
}
```

## Fluxo de Integração Detalhado

### 1. Formulário para Lead

- O usuário preenche o formulário em `integrated-client.html`
- O formulário envia os dados para `/api/mockup`
- O sistema gera o mockup e o armazena no Supabase
- Os dados do lead são enviados para o ActiveCampaign
- O usuário é redirecionado para o WhatsApp após 5 segundos

### 2. ActiveCampaign para ManyChat

- O ActiveCampaign já está integrado com o ManyChat através da sua configuração existente
- O campo personalizado `mockup_url` no ActiveCampaign pode ser sincronizado com o campo correspondente no ManyChat
- Alternativamente, você pode usar o webhook `/api/webhook/active-campaign` para enviar os dados diretamente do ActiveCampaign para o ManyChat

### 3. ManyChat para WhatsApp

- O ManyChat pode usar o campo personalizado `mockup_url` para enviar o mockup via WhatsApp
- Você pode criar um fluxo no ManyChat que envia o mockup automaticamente ou em resposta a uma palavra-chave

## Considerações Importantes

1. **Tamanhos de Logo**:
   - Chinelos: altura padrão de 100px, largura máxima de 163px
   - Etiquetas: altura padrão de 60px, largura máxima de 64px

2. **Formatos de Arquivo**:
   - Recomendado: PNG com fundo transparente
   - Suportados: JPG, PDF (convertido para PNG)

3. **Redirecionamento para WhatsApp**:
   - URL configurada: `https://api.whatsapp.com/send?phone=5551994305831&text=Ola.%20tenho%20interesse%20em%20Chinelos%20Slide%20personalizados%20HUD%20LAB%20Greco`
   - O redirecionamento ocorre automaticamente após 5 segundos

4. **Segurança**:
   - As imagens são armazenadas publicamente no Supabase Storage
   - Considere implementar autenticação nos endpoints da API para produção

## Solução de Problemas

### Problemas com o ActiveCampaign

- Verifique se a API Key está correta no arquivo `.env`
- Verifique se o campo personalizado `mockup_url` existe no ActiveCampaign
- Verifique os logs do servidor para mensagens de erro específicas

### Problemas com o ManyChat

- Verifique se a API Key está correta no arquivo `.env`
- Verifique se o campo personalizado `mockup_url` existe no ManyChat
- Verifique se o fluxo está configurado corretamente

### Problemas com o Supabase

- Verifique se você tem acesso ao projeto Supabase
- Verifique se as tabelas e buckets foram criados corretamente
- Verifique se o bucket `mockups` está configurado como público
