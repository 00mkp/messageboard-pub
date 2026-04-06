import secrets
import sqlite3
from typing import Optional
from database import get_db_connection


def create_user(username: str, password: str) -> bool:
    """Create a new user. Returns False if user already exists."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            'INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)',
            (username, password)
        )
        return cursor.rowcount > 0


def verify_user(username: str, password: str) -> bool:
    """Verify user credentials"""
    with get_db_connection() as conn:
        cursor = conn.execute(
            'SELECT password FROM users WHERE username = ?',
            (username,)
        )
        row = cursor.fetchone()

    if row and row[0] == password:
        return True
    return False


def generate_token(username: str) -> str:
    """Generate auth token for user"""
    token = secrets.token_urlsafe(32)
    with get_db_connection() as conn:
        conn.execute(
            'UPDATE users SET token = ? WHERE username = ?',
            (token, username)
        )
    return token


def verify_token(token: str) -> Optional[str]:
    """Verify token and return username"""
    with get_db_connection() as conn:
        cursor = conn.execute(
            'SELECT username FROM users WHERE token = ?',
            (token,)
        )
        row = cursor.fetchone()
    return row[0] if row else None
