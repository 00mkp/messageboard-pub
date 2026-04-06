from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import database
import auth
from connect4 import router as connect4_router
from deps import get_current_user, active_sessions
import os
import uuid
import logging
import io
from typing import Optional
from dotenv import load_dotenv
from PIL import Image
import pillow_heif
from pathlib import Path
from models import VALID_USERS, MAX_IMAGE_SIZE_MB, ALLOWED_IMAGE_TYPES, MAX_MESSAGE_LENGTH, validate_password_strength

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Register HEIF opener with Pillow
pillow_heif.register_heif_opener()

# Initialize database on startup
database.init_db()

# Create default users if they don't exist
for username in VALID_USERS:
    if auth.create_user(username, "changeme"):
        logger.info(f"Created default user: {username}")
    else:
        logger.debug(f"User {username} already exists")

# Initialize Connect 4 stats rows
database.init_connect4_stats()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Message Board API", version="0.1.0")

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include Connect 4 router
app.include_router(connect4_router, prefix="/api/connect4")

# Get CORS origins from environment, default to localhost for development
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")

# Parse origins
CORS_ORIGINS = CORS_ORIGINS_ENV.split(",") if CORS_ORIGINS_ENV != "*" else ["*"]

# Use regex to allow any origin in development mode when wildcard is set
if CORS_ORIGINS_ENV == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("CORS enabled for all origins (development mode)")
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS enabled for origins: {CORS_ORIGINS}")

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Constants
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024  # 10MB in bytes
MAX_TOTAL_UPLOADS_SIZE = 4 * 1024 * 1024 * 1024  # 4GB total storage

# Pi heartbeat tracking (in-memory)
from datetime import datetime, timedelta
pi_heartbeats = {
    "alice": None,  # Will store datetime of last check-in
    "bob": None
}

# Optional authentication for Pi client (allows both token and API key)
async def get_current_user_or_pi(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    """Verify auth token or Pi client API key"""
    # Check API key first (for Pi client)
    pi_api_key = os.getenv("PI_API_KEY")
    if api_key and pi_api_key and api_key == pi_api_key:
        return "PI_CLIENT"

    # Check bearer token
    if credentials:
        token = credentials.credentials
        username = auth.verify_token(token)
        if username:
            return username

    raise HTTPException(status_code=401, detail="Invalid credentials")

def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    # Check file size (this reads the file, so we need to seek back)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Seek back to start

    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE_MB}MB"
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")

def get_uploads_directory_size() -> int:
    """Calculate total size of uploads directory"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(UPLOAD_DIR):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            if os.path.exists(filepath):
                total_size += os.path.getsize(filepath)
    return total_size

@app.get("/")
async def root():
    return {"message": "Message Board API", "status": "ok"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        database.init_db()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}

# Auth endpoints
@app.post("/api/login")
@limiter.limit("10/minute")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    """Login and get auth token (rate limited to 10/minute)"""
    logger.info(f"Login attempt for user: {username}")

    # Validate username
    if username not in VALID_USERS:
        logger.warning(f"Login attempt with invalid username: {username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if auth.verify_user(username, password):
        token = auth.generate_token(username)

        # Store as active session (invalidates any previous session)
        active_sessions[username] = token
        logger.info(f"Successful login for user: {username} (previous session invalidated)")

        return {"token": token, "username": username}

    logger.warning(f"Failed login attempt for user: {username}")
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/logout")
@limiter.limit("60/minute")
async def logout(request: Request, current_user: str = Depends(get_current_user)):
    """Logout and invalidate current session"""
    # Clear the active session
    active_sessions[current_user] = None
    logger.info(f"User {current_user} logged out")
    return {"status": "success", "message": "Logged out successfully"}

@app.post("/api/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: str = Depends(get_current_user)
):
    """Change password for logged-in user (rate limited to 5/minute)"""
    logger.info(f"Password change request for user: {current_user}")

    # Validate new password strength
    is_valid, error_message = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)

    # Verify current password
    if not auth.verify_user(current_user, current_password):
        logger.warning(f"Failed password change attempt for user: {current_user}")
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    # Update password
    success = database.update_password(current_user, new_password)

    if success:
        logger.info(f"Password changed successfully for user: {current_user}")
        return {"status": "success", "message": "Password updated successfully"}

    logger.error(f"Failed to update password for user: {current_user}")
    raise HTTPException(status_code=500, detail="Failed to update password")

@app.post("/api/reset-password")
@limiter.limit("3/hour")
async def reset_password(
    request: Request,
    username: str = Form(...),
    master_key: str = Form(...),
    new_password: str = Form(...)
):
    """Reset password using master key (rate limited to 3/hour)"""
    logger.warning(f"Password reset attempt for user: {username}")

    # Validate username
    if username not in VALID_USERS:
        logger.warning(f"Password reset attempt with invalid username: {username}")
        raise HTTPException(status_code=404, detail="User not found")

    # Validate new password strength
    is_valid, error_message = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)

    # Verify master key
    expected_master_key = os.getenv("MASTER_KEY")

    if not expected_master_key:
        logger.error("Master key not configured in environment")
        raise HTTPException(status_code=500, detail="Master key not configured")

    if master_key != expected_master_key:
        logger.warning(f"Invalid master key provided for user: {username}")
        raise HTTPException(status_code=403, detail="Invalid master key")

    # Update password
    success = database.update_password(username, new_password)

    if success:
        logger.info(f"Password reset successfully for user: {username}")
        return {"status": "success", "message": "Password reset successfully"}

    logger.error(f"Failed to reset password for user: {username}")
    raise HTTPException(status_code=404, detail="User not found")

# Message endpoints
@app.post("/api/messages")
@limiter.limit("20/minute")
async def send_message(
    request: Request,
    text: str = Form(...),
    sender: str = Form(...),
    recipient: str = Form(...),
    current_user: str = Depends(get_current_user),
    image: UploadFile = File(None)
):
    """Send a new message with optional image (rate limited to 20/minute)"""
    logger.info(f"Message send request from {sender} to {recipient}")

    # Validate sender matches logged-in user
    if sender != current_user:
        logger.warning(f"User {current_user} attempted to send as {sender}")
        raise HTTPException(status_code=403, detail="Cannot send as another user")

    # Validate users exist in system
    if sender not in VALID_USERS or recipient not in VALID_USERS:
        raise HTTPException(status_code=400, detail="Invalid sender or recipient")

    # Validate message text
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message text cannot be empty")

    if len(text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Message text too long (max {MAX_MESSAGE_LENGTH} characters)")

    text = text.strip()

    # Handle image upload if provided
    image_filename = None
    if image and image.filename:  # Check if image exists and has a filename
        # Validate image file
        validate_image_file(image)

        # Check total uploads directory size
        total_size = get_uploads_directory_size()
        if total_size > MAX_TOTAL_UPLOADS_SIZE:
            logger.error(f"Uploads directory full: {total_size} bytes")
            raise HTTPException(
                status_code=507,
                detail="Storage limit reached. Please contact administrator."
            )
        # Get file extension
        ext = image.filename.split('.')[-1].lower() if '.' in image.filename else 'jpg'

        # Read image content
        content = await image.read()

        # Convert HEIC/HEIF to JPEG for compatibility
        if ext in ['heic', 'heif']:
            temp_path = None
            try:
                logger.info(f"Converting HEIC/HEIF image to JPEG")
                # Open HEIC image with Pillow
                temp_path = f"{UPLOAD_DIR}/temp_{uuid.uuid4()}.{ext}"
                with open(temp_path, "wb") as f:
                    f.write(content)

                # Convert to JPEG
                img = Image.open(temp_path)

                # Convert RGBA to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = rgb_img

                # Generate new filename with .jpg extension
                image_filename = f"{uuid.uuid4()}.jpg"
                file_path = f"{UPLOAD_DIR}/{image_filename}"

                # Save as JPEG with good quality
                img.save(file_path, "JPEG", quality=90, optimize=True)

                # Clean up temp file
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

                logger.info(f"HEIC/HEIF conversion successful")

            except Exception as e:
                logger.error(f"Error converting HEIC: {e}")
                # Clean up temp file if it exists
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
                raise HTTPException(
                    status_code=500,
                    detail="Failed to process image. Please try a different format."
                )
        else:
            # Verify it's actually an image by opening it
            try:
                img = Image.open(io.BytesIO(content))
                img.verify()

                # Save the file
                image_filename = f"{uuid.uuid4()}.{ext}"
                file_path = f"{UPLOAD_DIR}/{image_filename}"
                with open(file_path, "wb") as f:
                    f.write(content)

                logger.info(f"Image saved: {image_filename}")

            except Exception as e:
                logger.error(f"Invalid image file: {e}")
                raise HTTPException(status_code=400, detail="Invalid image file")

    # Save message to database
    try:
        message_id = database.add_message(text, sender, recipient, image_filename)
        logger.info(f"Message saved with ID: {message_id}")
        return {"status": "success", "message_id": message_id}
    except Exception as e:
        logger.error(f"Failed to save message: {e}")
        # Clean up uploaded image if database save failed
        if image_filename:
            file_path = f"{UPLOAD_DIR}/{image_filename}"
            if os.path.exists(file_path):
                os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to save message")

@app.delete("/api/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: str = Depends(get_current_user)
):
    """Delete a message (only if you're the sender)"""
    # Get the message to verify ownership
    message = database.get_message_by_id(message_id)
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user is the sender
    if message['sender'] != current_user:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    
    # Delete the message
    success = database.delete_message(message_id)
    
    # Delete associated image file if it exists
    if message.get('image'):
        image_path = f"{UPLOAD_DIR}/{message['image']}"
        if os.path.exists(image_path):
            os.remove(image_path)
    
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to delete message")

@app.get("/api/messages/{username}")
@limiter.limit("100/minute")
async def get_latest_message(
    request: Request,
    username: str,
    current_user: str = Depends(get_current_user_or_pi)
):
    """Get the latest message for a user (for Pi client or authenticated user)"""
    # Validate username
    if username not in VALID_USERS:
        raise HTTPException(status_code=404, detail="User not found")

    # If not Pi client, verify user can only get their own messages
    if current_user != "PI_CLIENT" and current_user != username:
        logger.warning(f"User {current_user} attempted to access messages for {username}")
        raise HTTPException(status_code=403, detail="Cannot access other user's messages")

    # Record Pi heartbeat (when Pi client checks for messages)
    if current_user == "PI_CLIENT" and username in pi_heartbeats:
        pi_heartbeats[username] = datetime.now()
        logger.debug(f"Pi heartbeat recorded for {username}")

    message = database.get_latest_message_for_recipient(username)
    return {"message": message}

@app.get("/api/messages/received/{username}")
@limiter.limit("60/minute")
async def get_received_messages(
    request: Request,
    username: str,
    current_user: str = Depends(get_current_user)
):
    """Get all messages received by a user (rate limited to 60/minute)"""
    # Verify user can only see their own messages
    if username != current_user:
        logger.warning(f"User {current_user} attempted to view messages for {username}")
        raise HTTPException(status_code=403, detail="Cannot view other user's messages")

    # Validate username
    if username not in VALID_USERS:
        raise HTTPException(status_code=404, detail="User not found")

    messages = database.get_messages_for_recipient(username)
    return messages

@app.get("/api/messages/sent/{username}")
@limiter.limit("60/minute")
async def get_sent_messages(
    request: Request,
    username: str,
    current_user: str = Depends(get_current_user)
):
    """Get all messages sent by a user (rate limited to 60/minute)"""
    # Verify user can only see their own messages
    if username != current_user:
        logger.warning(f"User {current_user} attempted to view messages for {username}")
        raise HTTPException(status_code=403, detail="Cannot view other user's messages")

    # Validate username
    if username not in VALID_USERS:
        raise HTTPException(status_code=404, detail="User not found")

    messages = database.get_messages_by_sender(username)
    return messages

@app.post("/api/messages/{message_id}/delivered")
@limiter.limit("100/minute")
async def mark_delivered(
    request: Request,
    message_id: int,
    current_user: str = Depends(get_current_user_or_pi)
):
    """Mark a message as delivered (called by Pi client)"""
    logger.info(f"Marking message {message_id} as delivered by {current_user}")

    success = database.mark_message_delivered(message_id)
    if success:
        return {"status": "success"}

    logger.error(f"Failed to mark message {message_id} as delivered")
    raise HTTPException(status_code=500, detail="Failed to mark as delivered")

@app.get("/api/images/{filename}")
@limiter.limit("200/minute")
async def get_image(
    request: Request,
    filename: str,
    current_user: str = Depends(get_current_user_or_pi)
):
    """Serve uploaded images (requires authentication)"""
    # Validate filename to prevent directory traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        logger.warning(f"Potential directory traversal attempt: {filename}")
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = f"{UPLOAD_DIR}/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(file_path)

# Admin endpoints
@app.get("/admin/pi-status")
@limiter.limit("30/minute")
async def get_pi_status(request: Request, master_key: str):
    """
    Get Pi heartbeat status (requires MASTER_KEY)
    Shows when each Pi last checked in and whether they're online

    Usage: GET /admin/pi-status?master_key=YOUR_MASTER_KEY
    """
    # Verify master key
    expected_master_key = os.getenv("MASTER_KEY")
    if not expected_master_key:
        raise HTTPException(status_code=500, detail="Master key not configured")

    if master_key != expected_master_key:
        logger.warning(f"Invalid master key attempt for pi-status from {request.client.host}")
        raise HTTPException(status_code=403, detail="Invalid master key")

    logger.info("Pi status check requested")

    # Build status for each Pi
    now = datetime.now()
    status = {}

    for username in ["alice", "bob"]:
        last_seen = pi_heartbeats.get(username)

        if last_seen is None:
            status[username] = {
                "status": "never_seen",
                "last_seen": None,
                "last_seen_ago": "Never checked in",
                "online": False
            }
        else:
            time_since = now - last_seen
            seconds_ago = int(time_since.total_seconds())

            # Consider online if checked in within last 2 minutes (2x poll interval)
            is_online = seconds_ago < 120

            # Format time ago
            if seconds_ago < 60:
                time_ago_str = f"{seconds_ago} seconds ago"
            elif seconds_ago < 3600:
                minutes = seconds_ago // 60
                time_ago_str = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
            else:
                hours = seconds_ago // 3600
                time_ago_str = f"{hours} hour{'s' if hours != 1 else ''} ago"

            status[username] = {
                "status": "online" if is_online else "offline",
                "last_seen": last_seen.isoformat(),
                "last_seen_ago": time_ago_str,
                "online": is_online
            }

    return {
        "timestamp": now.isoformat(),
        "pis": status,
        "summary": {
            "total": 2,
            "online": sum(1 for s in status.values() if s["online"]),
            "offline": sum(1 for s in status.values() if not s["online"])
        }
    }

@app.get("/admin/storage-status")
@limiter.limit("30/minute")
async def get_storage_status(request: Request, master_key: str):
    """
    Get storage usage statistics (requires MASTER_KEY)
    Shows current storage usage and available space

    Usage: GET /admin/storage-status?master_key=YOUR_MASTER_KEY
    """
    # Verify master key
    expected_master_key = os.getenv("MASTER_KEY")
    if not expected_master_key:
        raise HTTPException(status_code=500, detail="Master key not configured")

    if master_key != expected_master_key:
        logger.warning(f"Invalid master key attempt for storage-status from {request.client.host}")
        raise HTTPException(status_code=403, detail="Invalid master key")

    logger.info("Storage status check requested")

    # Calculate current storage usage
    total_size = get_uploads_directory_size()
    used_gb = total_size / (1024 ** 3)
    limit_gb = MAX_TOTAL_UPLOADS_SIZE / (1024 ** 3)
    percent_used = (total_size / MAX_TOTAL_UPLOADS_SIZE) * 100 if MAX_TOTAL_UPLOADS_SIZE > 0 else 0

    # Count number of images
    image_count = len([f for f in os.listdir(UPLOAD_DIR) if os.path.isfile(os.path.join(UPLOAD_DIR, f))])

    # Count messages with images
    messages_with_images = 0
    try:
        with database.get_db_connection() as conn:
            cursor = conn.execute('SELECT COUNT(*) FROM messages WHERE image_filename IS NOT NULL')
            row = cursor.fetchone()
            if row:
                messages_with_images = row[0]
    except Exception as e:
        logger.error(f"Error counting messages with images: {e}")

    return {
        "timestamp": datetime.now().isoformat(),
        "storage": {
            "used_bytes": total_size,
            "used_mb": round(total_size / (1024 ** 2), 2),
            "used_gb": round(used_gb, 2),
            "limit_gb": round(limit_gb, 2),
            "available_gb": round(limit_gb - used_gb, 2),
            "percent_used": round(percent_used, 1)
        },
        "images": {
            "total_files": image_count,
            "messages_with_images": messages_with_images,
            "average_size_mb": round((total_size / image_count) / (1024 ** 2), 2) if image_count > 0 else 0
        },
        "status": "healthy" if percent_used < 80 else "warning" if percent_used < 95 else "critical"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
