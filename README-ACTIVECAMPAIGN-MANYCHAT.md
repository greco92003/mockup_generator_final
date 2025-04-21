# Integração do Gerador de Mockups com ActiveCampaign e ManyChat

Este guia explica como configurar e usar a integração do gerador de mockups com ActiveCampaign e ManyChat para automatizar o envio de mockups para leads via WhatsApp.

## Visão Geral do Fluxo

1. O usuário preenche o formulário com nome, email, telefone e faz upload do logo
2. O sistema gera o mockup e o armazena na pasta `public/mockups`
3. Os dados do lead são enviados para o ActiveCampaign com a URL do mockup
4. O campo personalizado `mockup_url` (ID: 22) é atualizado no ActiveCampaign
5. O ManyChat sincroniza esse campo e usa a URL para enviar o mockup via WhatsApp
6. O usuário é redirecionado para o WhatsApp para continuar o atendimento

## Configuração

### 1. ActiveCampaign

1. O campo personalizado `mockup_url` (ID: 22) já está configurado no ActiveCampaign
2. Para referenciar esse campo em automações ou emails, use a variável `%MOCKUPURL%`
3. Certifique-se de que o campo esteja visível na lista de leads e mockup leads

### 2. ManyChat

1. Certifique-se de que o campo personalizado `mockup_url` esteja configurado no ManyChat
2. Configure a sincronização entre o ActiveCampaign e o ManyChat para mapear o campo `mockup_url`
3. No fluxo do ManyChat, use o campo personalizado para enviar o mockup via WhatsApp

## Variáveis e Campos Personalizados

### ActiveCampaign

- Nome do campo: `mockup_url`
- ID do campo: 22
- Variável de personalização: `%MOCKUPURL%`

### ManyChat

- Nome do campo: `mockup_url`
- ID do campo: 12882990

## Uso em Automações

### ActiveCampaign

Para usar o campo `mockup_url` em emails ou automações do ActiveCampaign, insira a variável `%MOCKUPURL%` no conteúdo do email ou da automação.

### ManyChat

Para usar o campo `mockup_url` em fluxos do ManyChat, insira o campo personalizado no conteúdo da mensagem ou use-o como fonte de uma imagem.

## Solução de Problemas

### O campo `mockup_url` não está sendo atualizado no ActiveCampaign

1. Verifique se o ID do campo está correto (ID: 22)
2. Verifique se o contato existe no ActiveCampaign
3. Verifique os logs do servidor para mensagens de erro

### O ManyChat não está enviando o mockup

1. Verifique se a sincronização entre o ActiveCampaign e o ManyChat está configurada corretamente
2. Verifique se o campo personalizado `mockup_url` está mapeado corretamente entre os dois sistemas
3. Verifique se o fluxo do ManyChat está configurado para usar o campo personalizado

## Exemplos

### Exemplo de URL de mockup

```
http://localhost:3000/mockups/mockup-3de3d4d7-ac49-4409-ab7c-d4b4d435d433.png
```

### Exemplo de uso da variável no ActiveCampaign

```
Olá %FIRSTNAME%,

Aqui está o seu mockup personalizado: %MOCKUPURL%

Clique no link acima para visualizar o seu mockup.
```

### Exemplo de uso do campo personalizado no ManyChat

No fluxo do ManyChat, configure um bloco de imagem com a fonte definida como o campo personalizado `mockup_url`.
