from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re

# Valid users for the system
VALID_USERS = {"alice", "bob"}

# Display names mapping (username -> display name)
DISPLAY_NAMES = {
    "alice": "Alice",
    "bob": "Bob"
}

# Helper function to get display name
def get_display_name(username: str) -> str:
    """Get the display name for a username, fallback to username if not found"""
    return DISPLAY_NAMES.get(username, username)

# Password validation helper
def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]', password):
        return False, "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>_-+=[]\\\/`~)"

    return True, ""

# Constants
MAX_MESSAGE_LENGTH = 300  # Fits ~5 lines on 480x280 e-ink display
MAX_IMAGE_SIZE_MB = 10
ALLOWED_IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".heic", ".heif"}

class Message(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    sender: str
    recipient: str

    @field_validator('text')
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v or v.strip() == '':
            raise ValueError('Message text cannot be empty')
        return v.strip()

    @field_validator('sender', 'recipient')
    @classmethod
    def validate_users(cls, v: str) -> str:
        if v not in VALID_USERS:
            raise ValueError(f'Invalid user. Must be one of {VALID_USERS}')
        return v

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        is_valid, error_message = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_message)
        return v

class PasswordResetRequest(BaseModel):
    username: str
    master_key: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        is_valid, error_message = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_message)
        return v
