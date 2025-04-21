# Gerador de Mockups HUD LAB

Aplicação para gerar mockups de chinelos personalizados com integração ao ActiveCampaign e ManyChat.

## Funcionalidades

- Upload de logos em PNG ou PDF
- Geração automática de mockups de chinelos personalizados
- Integração com ActiveCampaign para gestão de leads
- Integração com ManyChat para automação de WhatsApp
- Redirecionamento para WhatsApp após geração do mockup

## Tecnologias Utilizadas

- Node.js
- Express.js
- Jimp (processamento de imagens)
- CloudConvert API (conversão de PDF para PNG)
- ActiveCampaign API
- ManyChat API
- Supabase (armazenamento)

## Requisitos

- Node.js 14+
- Conta no CloudConvert (para conversão de PDF para PNG)
- Conta no ActiveCampaign
- Conta no ManyChat
- Conta no Supabase (opcional, para armazenamento em produção)

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/mockup-generator.git
cd mockup-generator
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais.

4. Inicie o servidor:

```bash
npm start
```

A aplicação estará disponível em `http://localhost:3000`.

## Configuração do ActiveCampaign

1. Crie um campo personalizado `mockup_url` no ActiveCampaign
2. Use a variável `%MOCKUPURL%` para referenciar esse campo em automações ou emails

## Configuração do ManyChat

1. Crie um campo personalizado `mockup_url` no ManyChat
2. Configure a sincronização entre o ActiveCampaign e o ManyChat

## Implantação

### Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no Vercel
3. Implante a aplicação

### Supabase (para armazenamento)

1. Crie um bucket `mockups` no Supabase Storage
2. Configure as permissões do bucket para permitir acesso público
3. Atualize as variáveis de ambiente com suas credenciais do Supabase

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.
