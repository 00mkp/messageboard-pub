"""Waveshare 3.7" E-Ink display driver for real hardware"""
import sys
import os
from pathlib import Path
import requests
from PIL import Image

# Try to import Waveshare library
try:
    # Add Waveshare library path
    libdir = os.path.join(os.path.expanduser('~'), 'e-Paper', 'RaspberryPi_JetsonNano', 'python', 'lib')
    if os.path.exists(libdir):
        sys.path.append(libdir)

    from waveshare_epd import epd3in7
    import time
except ImportError as e:
    print(f"❌ Error importing Waveshare library: {e}")
    print("Make sure you've installed the Waveshare e-Paper library:")
    print("  cd ~")
    print("  git clone https://github.com/waveshare/e-Paper.git")
    print("  cd e-Paper/RaspberryPi_JetsonNano/python")
    print("  sudo python3 setup.py install")
    sys.exit(1)

# Import our render module
import render
import config

# Global display object
epd = None

def init_display():
    """Initialize the e-ink display"""
    global epd

    try:
        print("🖥️  Initializing Waveshare 3.7\" E-Ink display...")

        epd = epd3in7.EPD()
        epd.init(0)  # 0 = full refresh mode

        # Clear display on init
        epd.Clear(0xFF, 0)  # Clear to white

        print("✅ Display initialized successfully")
        return True

    except Exception as e:
        print(f"❌ Failed to initialize display: {e}")
        return False

def display_message(message, api_url="http://localhost:8000/api", api_key=None, use_full_refresh=False):
    """
    Display a message on the e-ink screen

    Args:
        message: Message dict with text, sender, image, etc.
        api_url: Base URL for API (for downloading images)
        api_key: API key for authentication
        use_full_refresh: If True, use full refresh (slow, clears ghosts).
                         If False, use partial refresh (fast, no flicker)
    """
    global epd

    if epd is None:
        print("❌ Display not initialized!")
        return

    try:
        # Reinitialize display with appropriate mode if needed
        refresh_mode = 0 if use_full_refresh else 1  # 0=full, 1=partial
        refresh_type = "full" if use_full_refresh else "partial"

        print(f"📟 Rendering message to display ({refresh_type} refresh)...")

        # Re-init with the desired mode
        epd.init(refresh_mode)

        # Download and get image path if message has one
        image_path = None
        if message.get('image'):
            image_filename = message['image']
            print(f"📷 Image: {image_filename}")

            # Create temp directory if it doesn't exist
            temp_dir = Path(__file__).parent / "temp"
            temp_dir.mkdir(exist_ok=True)

            # Try to download the image
            try:
                image_url = f"{api_url}/images/{image_filename}"
                headers = {}
                if api_key:
                    headers['X-API-Key'] = api_key

                response = requests.get(image_url, headers=headers, timeout=10)

                if response.status_code == 200:
                    # Save to temp directory
                    temp_path = temp_dir / image_filename
                    with open(temp_path, 'wb') as f:
                        f.write(response.content)

                    # Load and display image info
                    img_file = Image.open(temp_path)
                    print(f"   Downloaded: {img_file.format} {img_file.size[0]}x{img_file.size[1]}px")
                    image_path = str(temp_path)
                else:
                    print(f"   ⚠️  Failed to download image: {response.status_code}")
            except Exception as e:
                print(f"   ⚠️  Error downloading image: {e}")

        # Create the image using our render module
        img = render.create_message_image(
            message=message,
            width=config.DISPLAY_WIDTH,
            height=config.DISPLAY_HEIGHT,
            grayscale_levels=config.DISPLAY_GRAYSCALE,
            image_path=image_path
        )

        # Convert to bytes in the format Waveshare expects
        # For 4-level grayscale, we need to pack 4 pixels into 1 byte
        buffer = epd.getbuffer_4Gray(img)

        # Display the image with appropriate method
        if use_full_refresh:
            epd.display_4Gray(buffer)  # Full refresh with flicker
        else:
            epd.display_4Gray(buffer)  # Partial refresh (same function, different init mode)

        print(f"✅ Message displayed on e-ink screen ({refresh_type} refresh)")

        # Put display to sleep to save power and protect display
        # E-ink is persistent - image stays visible even when sleeping
        epd.sleep()
        print("💤 Display sleeping (image remains visible)")

    except Exception as e:
        print(f"❌ Error displaying message: {e}")
        import traceback
        traceback.print_exc()

def sleep_display():
    """Put the display to sleep to save power"""
    global epd

    if epd is None:
        return

    try:
        print("💤 Putting display to sleep...")
        epd.sleep()
        print("✅ Display sleeping")

    except Exception as e:
        print(f"❌ Error sleeping display: {e}")

def clear_display():
    """Clear the display (set to all white)"""
    global epd

    if epd is None:
        return

    try:
        print("🧹 Clearing display...")
        epd.Clear(0xFF, 0)  # Clear to white
        print("✅ Display cleared")

    except Exception as e:
        print(f"❌ Error clearing display: {e}")
