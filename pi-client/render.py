"""
Rendering utilities for e-ink display
"""
from PIL import Image, ImageDraw, ImageFont, ImageOps
import textwrap
from pathlib import Path

def create_message_image(message, width=480, height=280, grayscale_levels=4, image_path=None):
    """
    Create an image for the e-ink display with adaptive layout

    - With image: Side-by-side layout (text left, image right)
    - Without image: Full-width large text

    Args:
        message: Dict with 'text', 'sender', 'timestamp', 'image'
        width: Display width in pixels (default 480 for 3.7")
        height: Display height in pixels (default 280 for 3.7")
        grayscale_levels: 1 (B&W), 4 (4-gray), or 256 (full grayscale)
        image_path: Path to message image file if available

    Returns:
        PIL Image ready for display
    """
    # Determine color mode based on grayscale levels
    if grayscale_levels == 1:
        mode = '1'  # 1-bit black and white
        bg_color = 255  # White
        text_color = 0  # Black
    else:
        mode = 'L'  # 8-bit grayscale
        bg_color = 255  # White
        text_color = 0  # Black

    # Create blank image
    img = Image.new(mode, (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Check if image exists
    has_image = image_path and Path(image_path).exists()

    # Get message text for length-based font sizing
    text = message.get('text', 'No message')
    text_length = len(text)

    # Dynamic font sizing based on message length
    try:
        if has_image:
            # Side-by-side layout: bigger fonts for short messages
            if text_length <= 20:
                text_size = 28  # Increased from 24
            elif text_length <= 50:
                text_size = 25  # Increased from 22
            elif text_length <= 100:
                text_size = 20
            elif text_length <= 200:
                text_size = 18
            else:
                text_size = 17  # 300 chars - still readable

            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", text_size)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", text_size)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        else:
            # Full-width layout: HUGE for short messages, good size for long (60px to 20px)
            if text_length <= 15:
                text_size = 60  # "I love you" - HUGE
            elif text_length <= 30:
                text_size = 48
            elif text_length <= 60:
                text_size = 38
            elif text_length <= 100:
                text_size = 30
            elif text_length <= 150:
                text_size = 26
            elif text_length <= 250:
                text_size = 22
            else:
                text_size = 20  # 300 chars - bigger than before

            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", text_size)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", text_size)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except:
        # Fallback to default font
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Layout dimensions
    padding = 8  # Reduced from 10 to give more space
    y_pos = padding

    # Draw sender (header) - use display name if available
    sender = message.get('sender_display', message.get('sender', 'Unknown'))
    sender_text = f"From: {sender}"
    draw.text((padding, y_pos), sender_text, font=font_small, fill=text_color)
    y_pos += 18  # Reduced from 20

    # Draw timestamp (top right)
    timestamp_text = message.get('timestamp', '')
    if timestamp_text:
        # Format timestamp nicely, convert UTC to local time
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(timestamp_text.replace('Z', '+00:00'))
            # Convert to Pi's local timezone
            dt_local = dt.astimezone()
            timestamp_text = dt_local.strftime('%b %d, %I:%M %p')
        except:
            pass
        # Calculate text width for right-alignment
        bbox = draw.textbbox((0, 0), timestamp_text, font=font_small)
        text_width = bbox[2] - bbox[0]
        draw.text((width - text_width - padding, padding), timestamp_text, font=font_small, fill=128)

    # Draw divider line
    draw.line([(padding, y_pos), (width - padding, y_pos)], fill=128, width=1)
    y_pos += 8  # Reduced from 10

    # Calculate available space
    available_height = height - y_pos - padding

    # Calculate line spacing based on font size - tighter spacing for better fit
    line_spacing = text_size + 2  # Changed from +4 to +2 for tighter spacing

    if has_image:
        # SIDE-BY-SIDE LAYOUT: Text on left, image on right

        # Split width with safe gap for all font sizes
        center_gap = 20  # Fixed gap down centerline (10px on each side)
        text_width = (width // 2) - padding - (center_gap // 2)
        image_width = (width // 2) - (center_gap // 2)

        # Text area (left side)
        text_x = padding
        text_y = y_pos

        # Wrap text for left half using pixel-based wrapping (handles emojis correctly)
        wrapped_lines = []
        for paragraph in text.split('\n'):
            words = paragraph.split(' ')
            current_line = ''

            for word in words:
                # Check if adding this word would exceed width
                test_line = current_line + (' ' if current_line else '') + word
                bbox = draw.textbbox((0, 0), test_line, font=font_medium)
                line_width = bbox[2] - bbox[0]

                if line_width <= text_width:
                    # Word fits on current line
                    current_line = test_line
                else:
                    # Word doesn't fit - save current line if not empty
                    if current_line:
                        wrapped_lines.append(current_line)
                        current_line = ''

                    # Check if word itself is too long
                    bbox = draw.textbbox((0, 0), word, font=font_medium)
                    word_width = bbox[2] - bbox[0]

                    if word_width <= text_width:
                        # Word fits on its own line
                        current_line = word
                    else:
                        # Word is too long - break character by character
                        for char in word:
                            test_line = current_line + char
                            bbox = draw.textbbox((0, 0), test_line, font=font_medium)
                            line_width = bbox[2] - bbox[0]

                            if line_width <= text_width:
                                current_line = test_line
                            else:
                                if current_line:
                                    wrapped_lines.append(current_line)
                                current_line = char

            if current_line:
                wrapped_lines.append(current_line)

        # Draw text lines
        max_lines = int(available_height / line_spacing)

        for i, line in enumerate(wrapped_lines[:max_lines]):
            if text_y + line_spacing > y_pos + available_height:
                # Truncate with ellipsis if needed
                if i < len(wrapped_lines) - 1:
                    line = line[:-3] + '...'
                draw.text((text_x, text_y), line, font=font_medium, fill=text_color)
                break
            draw.text((text_x, text_y), line, font=font_medium, fill=text_color)
            text_y += line_spacing

        # Image area (right side)
        try:
            msg_img = Image.open(image_path)

            # Apply EXIF orientation (fixes sideways phone photos)
            msg_img = ImageOps.exif_transpose(msg_img)

            # Convert to grayscale if needed
            if mode == 'L':
                msg_img = msg_img.convert('L')
            elif mode == '1':
                msg_img = msg_img.convert('1')

            # Resize to fit right half, maintaining aspect ratio
            img_max_width = image_width
            img_max_height = available_height
            msg_img.thumbnail((img_max_width, img_max_height), Image.Resampling.LANCZOS)

            # Position on right side with safe gap, centered vertically
            img_x = width // 2 + (center_gap // 2)
            img_y = y_pos + (available_height - msg_img.height) // 2

            # Paste image
            img.paste(msg_img, (img_x, img_y))

        except Exception as e:
            # If image fails, show placeholder
            draw.text((width // 2 + (center_gap // 2), y_pos),
                     f"[Image error]",
                     font=font_small, fill=128)

    else:
        # FULL-WIDTH LAYOUT: Large text only

        # Use full width for text
        text_width = width - (2 * padding)

        # Wrap text for full width using pixel-based wrapping (handles emojis correctly)
        wrapped_lines = []
        for paragraph in text.split('\n'):
            words = paragraph.split(' ')
            current_line = ''

            for word in words:
                # Check if adding this word would exceed width
                test_line = current_line + (' ' if current_line else '') + word
                bbox = draw.textbbox((0, 0), test_line, font=font_medium)
                line_width = bbox[2] - bbox[0]

                if line_width <= text_width:
                    # Word fits on current line
                    current_line = test_line
                else:
                    # Word doesn't fit - save current line if not empty
                    if current_line:
                        wrapped_lines.append(current_line)
                        current_line = ''

                    # Check if word itself is too long
                    bbox = draw.textbbox((0, 0), word, font=font_medium)
                    word_width = bbox[2] - bbox[0]

                    if word_width <= text_width:
                        # Word fits on its own line
                        current_line = word
                    else:
                        # Word is too long - break character by character
                        for char in word:
                            test_line = current_line + char
                            bbox = draw.textbbox((0, 0), test_line, font=font_medium)
                            line_width = bbox[2] - bbox[0]

                            if line_width <= text_width:
                                current_line = test_line
                            else:
                                if current_line:
                                    wrapped_lines.append(current_line)
                                current_line = char

            if current_line:
                wrapped_lines.append(current_line)

        # Draw text with dynamic font and spacing
        text_y = y_pos
        max_lines = int(available_height / line_spacing)

        for i, line in enumerate(wrapped_lines[:max_lines]):
            if text_y + line_spacing > y_pos + available_height:
                # Truncate with ellipsis if needed
                if i < len(wrapped_lines) - 1:
                    line = line[:-3] + '...'
                draw.text((padding, text_y), line, font=font_medium, fill=text_color)
                break
            draw.text((padding, text_y), line, font=font_medium, fill=text_color)
            text_y += line_spacing

    # Rotate image 180° because display is physically mounted upside down
    # (GPIO connector at bottom for shorter ribbon cable routing)
    img = img.rotate(180)

    return img
