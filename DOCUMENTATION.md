# Mockup Generator - Documentação Completa

Este documento fornece uma visão geral detalhada do sistema de geração de mockups, incluindo todas as suas funcionalidades, integrações e fluxos de trabalho.

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Fluxo de Trabalho Principal](#fluxo-de-trabalho-principal)
4. [Componentes Principais](#componentes-principais)
   - [Geração de Mockups](#geração-de-mockups)
   - [Conversão de PDF para PNG](#conversão-de-pdf-para-png)
   - [Sistema de Cache](#sistema-de-cache)
   - [Processamento Assíncrono](#processamento-assíncrono)
   - [Mecanismo de Fallback](#mecanismo-de-fallback)
5. [Integrações](#integrações)
   - [AWS Lambda](#aws-lambda)
   - [AWS S3](#aws-s3)
   - [ActiveCampaign](#activecampaign)
   - [ManyChat](#manychat)
   - [Supabase](#supabase)
   - [CloudConvert](#cloudconvert)
6. [Endpoints da API](#endpoints-da-api)
7. [Configuração e Variáveis de Ambiente](#configuração-e-variáveis-de-ambiente)
8. [Implantação](#implantação)
9. [Solução de Problemas](#solução-de-problemas)

## Visão Geral

O Mockup Generator é um sistema que permite aos usuários gerar mockups de produtos (chinelos e etiquetas) com seus logotipos personalizados. O sistema aceita arquivos de logotipo em formato PNG ou PDF, posiciona-os em um modelo de mockup e retorna uma imagem do produto final. Além disso, o sistema integra-se com várias plataformas de marketing e automação para facilitar o acompanhamento de leads e a comunicação com os clientes.

### Principais Recursos

- Geração de mockups de chinelos e etiquetas com logotipos personalizados
- Conversão de arquivos PDF para PNG com transparência
- Armazenamento de mockups em AWS S3 ou Supabase Storage
- Integração com ActiveCampaign para gerenciamento de leads
- Integração com ManyChat para comunicação via WhatsApp
- Sistema de cache para otimizar o desempenho
- Processamento assíncrono para melhorar a experiência do usuário
- Mecanismo de fallback para lidar com falhas

## Arquitetura do Sistema

O sistema é construído com Node.js e Express, utilizando uma arquitetura modular para facilitar a manutenção e a escalabilidade. Os principais componentes são:

1. **Servidor Web (Express)**: Gerencia as requisições HTTP e coordena os diferentes componentes do sistema.
2. **Gerador de Mockups**: Responsável por posicionar os logotipos nos modelos de mockup.
3. **Conversor de PDF para PNG**: Utiliza o CloudConvert para converter arquivos PDF em PNG com transparência.
4. **Sistema de Cache**: Armazena resultados de conversões e mockups para melhorar o desempenho.
5. **Processador Assíncrono**: Gerencia tarefas em segundo plano para não bloquear o fluxo principal.
6. **Integrações Externas**: Conecta-se a serviços como AWS Lambda, S3, ActiveCampaign, ManyChat e Supabase.

## Fluxo de Trabalho Principal

1. **Recebimento da Requisição**: O usuário envia um formulário com seu nome, email, telefone, segmento de negócio e arquivo de logotipo.
2. **Processamento Básico do Lead**: Os dados básicos do lead são enviados imediatamente para o ActiveCampaign.
3. **Processamento do Logotipo**:
   - Se o arquivo for um PDF, ele é convertido para PNG usando o CloudConvert.
   - O arquivo é armazenado no AWS S3.
4. **Geração do Mockup**:
   - O sistema chama o AWS Lambda para gerar o mockup.
   - O Lambda posiciona o logotipo nos modelos de chinelos e etiquetas.
   - O mockup gerado é armazenado no S3.
5. **Atualização do Lead**:
   - O URL do mockup é atualizado no ActiveCampaign.
   - O sistema pode opcionalmente enviar o mockup via ManyChat.
6. **Resposta ao Usuário**: O sistema redireciona o usuário para uma página de agradecimento.

## Componentes Principais

### Geração de Mockups

A geração de mockups é realizada pelo AWS Lambda, que recebe o URL do logotipo e posiciona-o em um modelo de mockup. O sistema suporta dois tipos de produtos:

1. **Chinelos**: O logotipo é posicionado em 12 locais diferentes, representando 6 pares de chinelos.
2. **Etiquetas**: O logotipo é posicionado em 6 locais diferentes, representando etiquetas para os chinelos.

O sistema ajusta automaticamente o tamanho do logotipo para garantir que ele se encaixe corretamente nos produtos, mantendo a proporção original.

**Arquivo Principal**: `aws-lambda-config.js`

### Conversão de PDF para PNG

O sistema utiliza o CloudConvert para converter arquivos PDF em PNG com transparência. A conversão é otimizada com um sistema de cache para evitar conversões repetidas do mesmo arquivo.

**Arquivo Principal**: `optimized-pdf-converter.js`

### Sistema de Cache

O sistema implementa um cache em dois níveis:

1. **Cache em Memória**: Armazena resultados recentes para acesso rápido.
2. **Cache em Arquivo**: Armazena resultados por um período mais longo (7 dias por padrão).

O cache é utilizado para:
- Conversões de PDF para PNG
- Mockups gerados

**Arquivos Principais**: `mockup-cache.js`, `cache-manager.js`

### Processamento Assíncrono

O sistema utiliza um processador assíncrono para gerenciar tarefas em segundo plano, como:

1. **Processamento de Leads**: Envio de dados para o ActiveCampaign.
2. **Atualização de Mockups**: Atualização do URL do mockup no ActiveCampaign.

Isso permite que o sistema responda rapidamente ao usuário, enquanto as tarefas mais demoradas são executadas em segundo plano.

**Arquivo Principal**: `async-processor.js`

### Mecanismo de Fallback

O sistema implementa um mecanismo de fallback para lidar com falhas no AWS Lambda. Se o Lambda falhar devido a problemas de recursos ou timeout, o sistema gera um URL de fallback e continua o fluxo normalmente.

**Arquivo Principal**: `aws-lambda-config.js`

## Integrações

### AWS Lambda

O sistema utiliza o AWS Lambda para gerar os mockups. O Lambda recebe o URL do logotipo, baixa-o, posiciona-o nos modelos e retorna o URL do mockup gerado.

**Configuração**:
- **Endpoint**: `https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod/mockup`
- **Região**: `us-east-1`

**Arquivo Principal**: `aws-lambda-config.js`

### AWS S3

O sistema utiliza o AWS S3 para armazenar logotipos e mockups gerados. Os arquivos são armazenados em buckets específicos e são acessíveis publicamente via URLs pré-assinados.

**Configuração**:
- **Bucket para Logotipos**: `mockup-hudlab`
- **Região**: `us-east-1`

**Arquivo Principal**: `s3-upload.js`

### ActiveCampaign

O sistema integra-se com o ActiveCampaign para gerenciamento de leads. Os dados do lead (nome, email, telefone, segmento) são enviados para o ActiveCampaign, e o URL do mockup é atualizado em um campo personalizado.

**Configuração**:
- **URL da API**: `https://hudlabprivatelabel.api-us1.com`
- **Campo para URL do Mockup**: `mockup_url` (ID: 41)

**Arquivo Principal**: `active-campaign-api.js`

### ManyChat

O sistema pode enviar o mockup para o cliente via ManyChat, que por sua vez pode enviar mensagens via WhatsApp. O sistema cria ou atualiza um assinante no ManyChat, define o URL do mockup em um campo personalizado e aciona um fluxo para enviar a mensagem.

**Configuração**:
- **Campo para URL do Mockup**: `mockup_url`
- **Fluxo**: `content20250420010052_915525`

**Arquivo Principal**: `manychat-api.js`

### Supabase

O sistema pode utilizar o Supabase Storage como alternativa ao AWS S3 para armazenar mockups. Isso é especialmente útil em ambientes de desenvolvimento ou quando o S3 não está disponível.

**Arquivo Principal**: `supabase-storage.js`

### CloudConvert

O sistema utiliza o CloudConvert para converter arquivos PDF em PNG com transparência. A API do CloudConvert é chamada para criar um job de conversão, fazer upload do arquivo, aguardar a conversão e baixar o resultado.

**Arquivo Principal**: `optimized-pdf-converter.js`

## Endpoints da API

### `/api/mockup` (POST)

Endpoint principal para geração de mockups. Recebe um formulário com os dados do lead e o arquivo de logotipo, processa-os e retorna o URL do mockup gerado.

**Parâmetros**:
- `name`: Nome do lead
- `email`: Email do lead
- `phone`: Telefone do lead
- `segmento`: Segmento de negócio do lead
- `logo`: Arquivo de logotipo (PNG ou PDF)

### `/api/check-contact-fields` (GET)

Endpoint para verificar os campos de um contato no ActiveCampaign. Útil para diagnóstico.

**Parâmetros**:
- `email`: Email do contato

### `/api/update-mockup-field-direct` (POST)

Endpoint para atualizar diretamente o campo `mockup_url` no ActiveCampaign. Útil para atualizações manuais.

**Parâmetros**:
- `email`: Email do contato
- `mockupUrl`: URL do mockup

### `/api/update-mockup-url` (POST)

Endpoint para atualizar o URL do mockup no ActiveCampaign. Similar ao endpoint anterior, mas com uma abordagem diferente.

**Parâmetros**:
- `email`: Email do contato
- `mockupUrl`: URL do mockup

### `/api/diagnostics` (GET)

Endpoint para verificar o status do servidor e suas configurações. Útil para diagnóstico.

## Configuração e Variáveis de Ambiente

O sistema utiliza variáveis de ambiente para configuração. As principais variáveis são:

```
# Configuração do Servidor
PORT=3000
NODE_ENV=production
BASE_URL=https://seu-dominio.com

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=sua-chave-de-acesso
AWS_SECRET_ACCESS_KEY=sua-chave-secreta
S3_BUCKET=mockup-hudlab
LAMBDA_API_ENDPOINT=https://8ie90ekqcc.execute-api.us-east-1.amazonaws.com/prod/mockup

# CloudConvert
CLOUDCONVERT_API_KEY=sua-chave-api

# ActiveCampaign
ACTIVE_CAMPAIGN_URL=https://hudlabprivatelabel.api-us1.com
ACTIVE_CAMPAIGN_API_KEY=sua-chave-api

# ManyChat
MANYCHAT_API_KEY=sua-chave-api
MANYCHAT_FLOW_NS=content20250420010052_915525
MANYCHAT_STEP=mockup

# Supabase
SUPABASE_URL=sua-url
SUPABASE_KEY=sua-chave

# WhatsApp
WHATSAPP_REDIRECT_URL=https://api.whatsapp.com/send?phone=5551994305831&text=Ola.%20tenho%20interesse%20em%20Chinelos%20Slide%20personalizados%20HUD%20LAB%20Greco
```

## Implantação

O sistema está configurado para implantação na Vercel, mas pode ser implantado em qualquer ambiente que suporte Node.js. A configuração da Vercel está no arquivo `vercel.json`.

### Considerações para Implantação

1. **Variáveis de Ambiente**: Certifique-se de configurar todas as variáveis de ambiente necessárias.
2. **Diretórios Temporários**: Em ambientes serverless como a Vercel, utilize o diretório `/tmp` para arquivos temporários.
3. **Limites de Tempo**: Esteja ciente dos limites de tempo de execução em ambientes serverless.

## Solução de Problemas

### Problemas Comuns

1. **Timeout na Geração de Mockups**: Se o AWS Lambda estiver demorando muito para gerar o mockup, verifique:
   - A memória alocada para a função Lambda
   - O timeout configurado
   - O tamanho do arquivo de logotipo

2. **Falhas na Conversão de PDF**: Se a conversão de PDF para PNG estiver falhando, verifique:
   - A chave de API do CloudConvert
   - O formato do arquivo PDF
   - Os logs do CloudConvert

3. **Problemas com o ActiveCampaign**: Se a atualização do campo `mockup_url` estiver falhando, verifique:
   - A existência do campo no ActiveCampaign (ID: 41)
   - A chave de API do ActiveCampaign
   - Os logs de atualização

### Logs e Diagnóstico

O sistema registra logs detalhados para facilitar o diagnóstico de problemas. Os logs incluem:

1. **Logs de Requisição**: Detalhes sobre as requisições recebidas.
2. **Logs de Processamento**: Detalhes sobre o processamento de arquivos e geração de mockups.
3. **Logs de Integração**: Detalhes sobre as chamadas para serviços externos.
4. **Logs de Erro**: Detalhes sobre erros ocorridos durante o processamento.

Utilize o endpoint `/api/diagnostics` para verificar o status do servidor e suas configurações.

---

Este documento fornece uma visão geral do sistema de geração de mockups. Para mais detalhes sobre componentes específicos, consulte os arquivos de código-fonte correspondentes.
