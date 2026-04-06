"""
Main display script for Raspberry Pi
Polls server for new messages and displays them with error recovery
"""
import time
import sys
import requests
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('messageboard.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import config (will be created by user)
try:
    import config
except ImportError:
    logger.error("❌ config.py not found!")
    logger.error("Copy config.py.example to config.py and fill in your values")
    sys.exit(1)

# Import display module based on config
if config.USE_MOCK_DISPLAY:
    import mock_display as display
    logger.info("Using mock display for testing")
else:
    # Import Waveshare display driver for real hardware
    import waveshare_display as display
    logger.info("Using real Waveshare hardware display")


def cleanup_old_images():
    """Clean up old downloaded images to prevent disk fill"""
    temp_dir = Path(__file__).parent / "temp"
    if not temp_dir.exists():
        return

    try:
        # Get all image files sorted by modification time
        image_files = sorted(
            temp_dir.glob("*"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )

        # Remove files beyond MAX_STORED_IMAGES
        max_images = getattr(config, 'MAX_STORED_IMAGES', 50)
        for old_file in image_files[max_images:]:
            try:
                old_file.unlink()
                logger.info(f"Cleaned up old image: {old_file.name}")
            except Exception as e:
                logger.warning(f"Failed to delete {old_file}: {e}")

        # Remove files older than MAX_IMAGE_AGE_DAYS
        max_age_days = getattr(config, 'MAX_IMAGE_AGE_DAYS', 30)
        cutoff_time = datetime.now() - timedelta(days=max_age_days)

        for image_file in temp_dir.glob("*"):
            try:
                file_time = datetime.fromtimestamp(image_file.stat().st_mtime)
                if file_time < cutoff_time:
                    image_file.unlink()
                    logger.info(f"Cleaned up old image (age): {image_file.name}")
            except Exception as e:
                logger.warning(f"Failed to check/delete {image_file}: {e}")

    except Exception as e:
        logger.error(f"Error during image cleanup: {e}")


def fetch_message_with_retry(retry_count=0):
    """
    Fetch message from API with exponential backoff on failures

    Args:
        retry_count: Number of consecutive failures

    Returns:
        tuple: (success, data, error_message)
    """
    headers = {
        'X-API-Key': config.API_KEY
    }

    try:
        response = requests.get(
            f"{config.API_URL}/{config.MY_USERNAME}",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            return (True, response.json(), None)
        elif response.status_code == 404:
            return (True, {'message': None}, None)
        elif response.status_code == 401:
            return (False, None, "Authentication failed - check API_KEY in config")
        elif response.status_code == 429:
            return (False, None, "Rate limited - too many requests")
        else:
            return (False, None, f"API returned status {response.status_code}")

    except requests.exceptions.Timeout:
        return (False, None, "Request timed out")
    except requests.exceptions.ConnectionError:
        return (False, None, "Connection failed - check network and API_URL")
    except requests.exceptions.RequestException as e:
        return (False, None, f"Network error: {e}")
    except Exception as e:
        return (False, None, f"Unexpected error: {e}")


def mark_message_delivered(message_id):
    """
    Mark a message as delivered in the backend

    Args:
        message_id: ID of the message to mark

    Returns:
        bool: True if successful, False otherwise
    """
    headers = {
        'X-API-Key': config.API_KEY
    }

    try:
        api_base = config.API_URL.replace('/messages', '')
        response = requests.post(
            f"{api_base}/messages/{message_id}/delivered",
            headers=headers,
            timeout=5
        )
        return response.status_code == 200
    except Exception as e:
        logger.warning(f"Failed to mark message {message_id} as delivered: {e}")
        return False


def calculate_retry_interval(retry_count):
    """
    Calculate retry interval with exponential backoff

    Args:
        retry_count: Number of consecutive failures

    Returns:
        int: Seconds to wait before next retry
    """
    min_interval = getattr(config, 'MIN_RETRY_INTERVAL', 60)
    max_interval = getattr(config, 'MAX_RETRY_INTERVAL', 300)

    # Exponential backoff: min * (2 ^ retry_count), capped at max
    interval = min(min_interval * (2 ** retry_count), max_interval)
    return interval


def main():
    logger.info(f"🚀 Starting Message Board Display for {config.MY_USERNAME}")
    logger.info(f"📡 API: {config.API_URL}")
    logger.info(f"⏱️  Poll interval: {config.POLL_INTERVAL}s")

    # Initialize display
    if not display.init_display():
        logger.error("Failed to initialize display!")
        sys.exit(1)

    last_message_id = None
    retry_count = 0
    last_cleanup = datetime.now()
    last_full_refresh = None  # Track when we last did a full refresh

    while True:
        try:
            logger.info("Checking for messages...")

            # Fetch message from API
            success, data, error = fetch_message_with_retry(retry_count)

            if success:
                # Reset retry count on successful fetch
                if retry_count > 0:
                    logger.info("Connection restored")
                    retry_count = 0

                message = data.get('message')

                if message:
                    message_id = message.get('id')
                    is_new_message = message_id != last_message_id

                    if is_new_message:
                        logger.info(f"✉️  New message received (ID: {message_id})")

                        # Determine if we need a full refresh
                        use_partial_refresh = getattr(config, 'USE_PARTIAL_REFRESH', False)
                        full_refresh_hours = getattr(config, 'FULL_REFRESH_INTERVAL_HOURS', 12)
                        use_full_refresh = False

                        if use_partial_refresh:
                            # Check if it's been long enough since last full refresh
                            if last_full_refresh is None:
                                # First message - use full refresh
                                use_full_refresh = True
                                logger.info("🔄 Using full refresh (first message)")
                            else:
                                hours_since_full = (datetime.now() - last_full_refresh).total_seconds() / 3600
                                if hours_since_full >= full_refresh_hours:
                                    use_full_refresh = True
                                    logger.info(f"🔄 Using full refresh ({hours_since_full:.1f}h since last full)")
                                else:
                                    logger.info(f"⚡ Using partial refresh ({hours_since_full:.1f}h since last full)")
                        else:
                            # Partial refresh disabled - always use full
                            use_full_refresh = True

                        # Display the new message on screen
                        api_base = config.API_URL.replace('/messages', '')
                        api_key = getattr(config, 'API_KEY', None)
                        display.display_message(
                            message,
                            api_url=api_base,
                            api_key=api_key,
                            use_full_refresh=use_full_refresh
                        )

                        # Update last full refresh time if we did a full refresh
                        if use_full_refresh:
                            last_full_refresh = datetime.now()

                        # Mark as delivered (only for new messages)
                        if mark_message_delivered(message_id):
                            logger.info("✅ Message marked as delivered")
                        else:
                            logger.warning("⚠️  Failed to mark as delivered")

                        # Update last message ID
                        last_message_id = message_id
                    else:
                        logger.debug(f"📭 Still displaying message ID: {message_id} (no refresh needed)")

                else:
                    logger.info("📭 No messages yet")
                    # Keep displaying last message instead of clearing
                    # display.clear_display()  # Commented out for better UX

                # Clean up old images periodically (every hour)
                if datetime.now() - last_cleanup > timedelta(hours=1):
                    cleanup_old_images()
                    last_cleanup = datetime.now()

                # Normal poll interval on success
                time.sleep(config.POLL_INTERVAL)

            else:
                # Handle failure with exponential backoff
                retry_count += 1
                retry_interval = calculate_retry_interval(retry_count)

                logger.error(f"❌ {error} (attempt {retry_count})")
                logger.info(f"Retrying in {retry_interval}s...")

                # Still display last known message
                # Don't clear display on network errors

                time.sleep(retry_interval)

        except KeyboardInterrupt:
            logger.info("\n👋 Shutting down...")
            display.sleep_display()
            break

        except Exception as e:
            # Catch-all for unexpected errors - don't crash
            logger.error(f"❌ Unexpected error: {e}", exc_info=True)
            retry_count += 1
            retry_interval = calculate_retry_interval(retry_count)
            logger.info(f"Recovering... retrying in {retry_interval}s")
            time.sleep(retry_interval)


if __name__ == "__main__":
    main()
