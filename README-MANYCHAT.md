# Integração do Gerador de Mockups com ManyChat

Este guia explica como integrar o gerador de mockups com o ManyChat para enviar as imagens geradas para os leads via WhatsApp.

## Visão Geral

O fluxo de integração funciona da seguinte forma:

1. O usuário envia seu logo e informações (nome, email, telefone) através do formulário
2. O sistema gera o mockup e o armazena no Supabase Storage
3. Os metadados (email, URL do mockup) são salvos no banco de dados Supabase
4. O ManyChat pode acessar o mockup do lead através do email usando nossa API

## Configuração

### 1. Configurar o Supabase

1. Crie uma conta no [Supabase](https://supabase.com) se ainda não tiver
2. Crie um novo projeto
3. Copie a URL do projeto e a chave de API (em Settings > API)
4. Crie um arquivo `.env` baseado no `.env.example` e preencha as variáveis do Supabase
5. Execute o script de configuração:

```bash
npm install
node setup-supabase.js
```

### 2. Configurar o ManyChat

#### Opção 1: Usando a API do ManyChat (Recomendado)

1. No ManyChat, crie um Custom Field chamado `mockup_url` do tipo Text
2. Crie um Flow chamado "Enviar Mockup" que contenha:
   - Um bloco de Imagem com a fonte definida como `{{mockup_url}}`
   - Texto ou botões adicionais conforme necessário
3. Obtenha o ID do Flow (flow_ns) da URL quando estiver editando o Flow
4. Obtenha uma API Key do ManyChat (em Settings > API)
5. Adicione a API Key ao arquivo `.env`

#### Opção 2: Usando Webhooks do ManyChat

1. No ManyChat, configure um External Request para chamar:
   - `GET https://seu-servidor.com/api/manychat/mockup?email={{email}}`
   - Isso retornará a URL do mockup no formato que o ManyChat espera

### 3. Iniciar o Servidor

```bash
node manychat-mockup.js
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
  "url": "https://supabase-url.com/storage/v1/object/public/mockups/..."
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

### 3. Webhook para Enviar Mockup via ManyChat

```
POST /api/manychat/send-mockup
```

Corpo:
```json
{
  "email": "email@exemplo.com",
  "subscriber_id": "12345",
  "phone": "11999999999"
}
```

Resposta:
```json
{
  "success": true,
  "message": "Mockup sent to ManyChat for delivery",
  "mockup_url": "https://supabase-url.com/storage/v1/object/public/mockups/..."
}
```

## Configuração no ManyChat

### Exemplo de Fluxo no ManyChat

1. **Trigger**: Quando o lead envia uma mensagem "mockup" ou clica em um botão
2. **External Request**: Chama a API para obter o mockup
   - URL: `https://seu-servidor.com/api/manychat/mockup?email={{email}}`
   - Método: GET
3. **Send Message**: Envia a imagem do mockup para o lead

### Alternativa: Integração Direta com a API do ManyChat

Se preferir uma integração mais direta, você pode usar o código fornecido no arquivo `manychat-api.js` para:

1. Verificar se o contato existe no ManyChat (ou criá-lo)
2. Definir o Custom Field `mockup_url` com a URL do mockup
3. Disparar o Flow "Enviar Mockup" para o contato

## Considerações de Segurança

- As imagens são armazenadas publicamente no Supabase Storage
- Considere implementar autenticação nos endpoints da API
- Para produção, considere adicionar rate limiting e proteção contra abusos
