from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import auth
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Active session tracking (single session per user)
active_sessions = {
    "alice": None,
    "bob": None
}


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify auth token and return username"""
    token = credentials.credentials
    username = auth.verify_token(token)

    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    if active_sessions.get(username) != token:
        logger.warning(f"User {username} attempted to use an invalidated token (logged in elsewhere)")
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    return username
