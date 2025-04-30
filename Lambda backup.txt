import json
import boto3
import os
import time
import base64
import urllib.parse
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import urllib.request

# Configurações
S3_BUCKET = os.environ.get('S3_BUCKET', 'mockup-hudlab')
BACKGROUND_KEY = os.environ.get('BACKGROUND_KEY', 'backgrounds/default-bg.png')
REGION = os.environ.get('AWS_REGION', 'us-east-1')
URL_EXPIRATION = 7 * 24 * 60 * 60  # 7 dias em segundos

# Inicializar cliente S3
s3 = boto3.client('s3', region_name=REGION)

def download_image_from_url(url):
    """Download an image from a URL, with special handling for S3 URLs"""
    try:
        # Verificar se a URL é do S3
        if 's3.amazonaws.com' in url:
            print(f"Detected S3 URL, using boto3 to download: {url}")
            # Extrair o nome do bucket e a chave do objeto da URL
            parsed_url = urllib.parse.urlparse(url)
            bucket_name = parsed_url.netloc.split('.')[0]  # Extrai o nome do bucket da URL
            object_key = parsed_url.path.lstrip('/')  # Remove a barra inicial
            
            print(f"Parsed S3 URL - Bucket: {bucket_name}, Key: {object_key}")
            
            # Baixar o objeto usando boto3
            response = s3.get_object(Bucket=bucket_name, Key=object_key)
            return BytesIO(response['Body'].read())
        else:
            # Para URLs não-S3, usar o método padrão
            print(f"Using standard URL download for: {url}")
            with urllib.request.urlopen(url) as response:
                return BytesIO(response.read())
    except Exception as e:
        print(f"Error downloading image from URL {url}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def download_image_from_s3(bucket, key):
    """Download an image from S3"""
    try:
        print(f"Downloading from S3 using boto3 - Bucket: {bucket}, Key: {key}")
        response = s3.get_object(Bucket=bucket, Key=key)
        return BytesIO(response['Body'].read())
    except Exception as e:
        print(f"Error downloading image from S3 {bucket}/{key}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def upload_image_to_s3(image_bytes, bucket, key, content_type='image/png'):
    """Upload an image to S3 and generate a pre-signed URL"""
    try:
        # Upload the image to S3 (without ACL since bucket is private)
        s3.put_object(
            Body=image_bytes,
            Bucket=bucket,
            Key=key,
            ContentType=content_type
        )
        
        # Generate a pre-signed URL that expires in 7 days
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': key},
            ExpiresIn=URL_EXPIRATION
        )
        
        print(f"Generated pre-signed URL: {url}")
        return url
    except Exception as e:
        print(f"Error uploading image to S3 {bucket}/{key}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def resize_image_with_aspect_ratio(image, max_width, max_height):
    """Resize an image maintaining aspect ratio"""
    width, height = image.size
    
    # Calculate the ratio
    if width > max_width or height > max_height:
        ratio = min(max_width / width, max_height / height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        return image.resize((new_width, new_height), Image.LANCZOS)
    
    return image

def create_mockup(logo_url, email, name):
    """Create a mockup with the logo placed on the background"""
    try:
        print(f"Creating mockup for {email} with logo {logo_url}")
        
        # Download the background image from S3
        print(f"Downloading background from S3: {S3_BUCKET}/{BACKGROUND_KEY}")
        background_bytes = download_image_from_s3(S3_BUCKET, BACKGROUND_KEY)
        background = Image.open(background_bytes).convert("RGBA")
        print(f"Background size: {background.size}")
        
        # Download the logo from the provided URL
        print(f"Downloading logo from URL: {logo_url}")
        logo_bytes = download_image_from_url(logo_url)
        logo = Image.open(logo_bytes).convert("RGBA")
        print(f"Original logo size: {logo.size}")
        
        # Define positions for slippers and labels
        slipper_positions = [
            (306, 330), (487, 330),  # Par 1
            (897, 330), (1077, 330),  # Par 2
            (1533, 330), (1716, 330),  # Par 3
            (307, 789), (487, 789),  # Par 4
            (895, 789), (1077, 789),  # Par 5
            (1533, 789), (1713, 789),  # Par 6
        ]
        
        label_positions = [
            (154, 367),  # Etiqueta Par 1
            (738, 367),  # Etiqueta Par 2
            (1377, 367),  # Etiqueta Par 3
            (154, 825),  # Etiqueta Par 4
            (738, 825),  # Etiqueta Par 5
            (1377, 825),  # Etiqueta Par 6
        ]
        
        # Define size limits
        slipper_width, slipper_height = 163, 100
        label_width, label_height = 64, 60
        
        # Resize logo for slippers
        slipper_logo = resize_image_with_aspect_ratio(logo.copy(), slipper_width, slipper_height)
        print(f"Resized slipper logo size: {slipper_logo.size}")
        
        # Resize logo for labels
        label_logo = resize_image_with_aspect_ratio(logo.copy(), label_width, label_height)
        print(f"Resized label logo size: {label_logo.size}")
        
        # Create a copy of the background for compositing
        result = background.copy()
        
        # Place logos on the background for slippers
        print("Placing slipper logos on background")
        for pos in slipper_positions:
            x, y = pos
            # Center the logo at the position
            paste_x = x - slipper_logo.width // 2
            paste_y = y - slipper_logo.height // 2
            # Create a temporary image for the paste operation
            temp = Image.new('RGBA', result.size, (0, 0, 0, 0))
            temp.paste(slipper_logo, (paste_x, paste_y), slipper_logo)
            # Composite the temporary image with the result
            result = Image.alpha_composite(result, temp)
        
        # Place logos on the background for labels
        print("Placing label logos on background")
        for pos in label_positions:
            x, y = pos
            # Center the logo at the position
            paste_x = x - label_logo.width // 2
            paste_y = y - label_logo.height // 2
            # Create a temporary image for the paste operation
            temp = Image.new('RGBA', result.size, (0, 0, 0, 0))
            temp.paste(label_logo, (paste_x, paste_y), label_logo)
            # Composite the temporary image with the result
            result = Image.alpha_composite(result, temp)
        
        # Convert to RGB for saving as PNG
        result = result.convert("RGB")
        
        # Save the result to a BytesIO object
        print("Saving mockup to BytesIO")
        output = BytesIO()
        result.save(output, format='PNG', quality=95)
        output.seek(0)
        
        # Generate a unique key for the mockup
        timestamp = int(time.time())
        safe_email = email.replace('@', '-at-').replace('.', '-dot-')
        mockup_key = f"mockups/{safe_email}-{timestamp}.png"
        
        # Upload the mockup to S3 and get a pre-signed URL
        print(f"Uploading mockup to S3: {S3_BUCKET}/{mockup_key}")
        mockup_url = upload_image_to_s3(output.getvalue(), S3_BUCKET, mockup_key)
        print(f"Mockup URL (pre-signed): {mockup_url}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'  # For CORS support
            },
            'body': json.dumps({
                'message': 'Mockup created successfully',
                'mockupUrl': mockup_url,
                'email': email,
                'name': name,
                'expiresIn': URL_EXPIRATION
            })
        }
    
    except Exception as e:
        print(f"Error creating mockup: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'  # For CORS support
            },
            'body': json.dumps({
                'message': f'Error creating mockup: {str(e)}'
            })
        }

def lambda_handler(event, context):
    """AWS Lambda handler function"""
    try:
        print(f"Received event: {json.dumps(event)}")
        
        # Parse the input
        if 'body' in event:
            try:
                body = json.loads(event['body'])
            except:
                body = event['body']  # In case it's already parsed
        else:
            body = event
        
        print(f"Parsed body: {json.dumps(body)}")
        
        logo_url = body.get('logoUrl')
        email = body.get('email')
        name = body.get('name', 'Unknown')
        
        # Validate input
        if not logo_url or not email:
            print("Missing required parameters")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'  # For CORS support
                },
                'body': json.dumps({
                    'message': 'Missing required parameters: logoUrl and email are required'
                })
            }
        
        # Create the mockup
        return create_mockup(logo_url, email, name)
    
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'  # For CORS support
            },
            'body': json.dumps({
                'message': f'Error processing request: {str(e)}'
            })
        }