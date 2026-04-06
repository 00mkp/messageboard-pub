"""Mock e-ink display for testing without hardware"""
from PIL import Image, ImageDraw, ImageFont
import requests
import os
from pathlib import Path

# Create temp directory for downloaded images
TEMP_DIR = Path(__file__).parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

def init_display():
    """Pretend to initialize display"""
    print("🖥️  Mock display initialized")
    return True

def display_message(message, api_url="http://localhost:8000/api", api_key=None, use_full_refresh=False):
    """Pretend to show message on e-ink"""
    refresh_type = "FULL REFRESH (3s, clears ghosts)" if use_full_refresh else "PARTIAL REFRESH (0.3s, fast)"
    print("\n" + "="*50)
    print(f"📟 DISPLAYING ON E-INK SCREEN ({refresh_type}):")
    print("="*50)
    # Use display name if available
    sender = message.get('sender_display', message.get('sender', 'Unknown'))
    print(f"From: {sender}")
    print(f"Message: {message.get('text', 'No text')}")

    # Download and display image if present
    if message.get('image'):
        image_filename = message['image']
        print(f"📷 Image: {image_filename}")

        # Try to download the image
        try:
            image_url = f"{api_url}/images/{image_filename}"
            headers = {}
            if api_key:
                headers['X-API-Key'] = api_key
            response = requests.get(image_url, headers=headers, timeout=10)

            if response.status_code == 200:
                # Save to temp directory
                image_path = TEMP_DIR / image_filename
                with open(image_path, 'wb') as f:
                    f.write(response.content)

                # Load and display image info
                img = Image.open(image_path)
                print(f"   Downloaded: {img.format} {img.size[0]}x{img.size[1]}px")
                print(f"   Saved to: {image_path}")
            else:
                print(f"   ⚠️  Failed to download image: {response.status_code}")
        except Exception as e:
            print(f"   ⚠️  Error downloading image: {e}")

    print(f"Time: {message.get('timestamp', 'Unknown')}")
    print("="*50)
    print("💤 Display sleeping (image remains visible)")
    print()

def sleep_display():
    """Pretend to sleep the display"""
    print("💤 Display sleeping")

def clear_display():
    """Pretend to clear the display"""
    print("🧹 Display cleared")
