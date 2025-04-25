"""
Exemplo de como o código Python do AWS Lambda deve ser modificado para aumentar
o tempo de expiração do URL pré-assinado do S3.

Este é um exemplo baseado em como a maioria das funções Lambda geram URLs pré-assinados.
O código real do seu Lambda pode ser diferente, mas o princípio é o mesmo.
"""
import boto3
import os
import json
from PIL import Image
import io
import urllib.request
import uuid
import time

# Configuração do S3
s3_client = boto3.client('s3')
s3_bucket = os.environ.get('S3_BUCKET', 'mockup-hudlab')

# Tempo de expiração do URL pré-assinado (em segundos)
# Modificar este valor para 7 dias (7 * 24 * 60 * 60 = 604800 segundos)
url_expiration = int(os.environ.get('S3_URL_EXPIRATION', '86400'))  # Padrão: 24 horas

def lambda_handler(event, context):
    try:
        # Extrair parâmetros da requisição
        body = event
        if isinstance(event, str):
            body = json.loads(event)
        elif 'body' in event and event['body']:
            body = json.loads(event['body'])
        
        logo_url = body.get('logoUrl')
        email = body.get('email')
        name = body.get('name')
        
        if not logo_url or not email:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'logoUrl and email are required'})
            }
        
        # Baixar o logo
        with urllib.request.urlopen(logo_url) as response:
            logo_data = response.read()
        
        # Processar o logo e gerar o mockup
        # ... (código de processamento de imagem)
        
        # Salvar o mockup no S3
        sanitized_email = email.replace('@', '-at-').replace('.', '-dot-')
        timestamp = int(time.time())
        mockup_key = f"mockups/{sanitized_email}-{timestamp}.png"
        
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=mockup_key,
            Body=mockup_data,  # Dados da imagem do mockup
            ContentType='image/png'
        )
        
        # Gerar URL pré-assinado com expiração de 7 dias
        mockup_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': s3_bucket,
                'Key': mockup_key
            },
            ExpiresIn=url_expiration  # Aqui é onde definimos a expiração
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'mockupUrl': mockup_url,
                'message': 'Mockup generated successfully'
            })
        }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': f'Error generating mockup: {str(e)}'})
        }
