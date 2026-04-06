import sqlite3
import logging
import os
from datetime import datetime, timezone
from typing import Optional, List, Dict
from contextlib import contextmanager

DB_PATH = os.environ.get("DB_PATH", "messages.db")
BUSY_TIMEOUT = 5000  # 5 seconds in milliseconds

logger = logging.getLogger(__name__)

@contextmanager
def get_db_connection():
    """Context manager for database connections with proper configuration"""
    conn = sqlite3.connect(DB_PATH, timeout=BUSY_TIMEOUT/1000)
    try:
        # Enable WAL mode for better concurrency
        conn.execute('PRAGMA journal_mode=WAL')
        # Enable foreign keys
        conn.execute('PRAGMA foreign_keys=ON')
        # Set busy timeout
        conn.execute(f'PRAGMA busy_timeout={BUSY_TIMEOUT}')
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        conn.close()

def init_db():
    """Initialize database with required tables"""
    with get_db_connection() as conn:
        # Messages table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                sender TEXT NOT NULL,
                recipient TEXT NOT NULL,
                image_filename TEXT,
                timestamp TEXT NOT NULL,
                delivered BOOLEAN DEFAULT 0,
                delivered_at TEXT
            )
        ''')

        # Users table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                token TEXT
            )
        ''')

        # Connect 4 games table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS connect4_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                board TEXT NOT NULL DEFAULT '000000000000000000000000000000000000000000',
                current_turn TEXT,
                player_red TEXT NOT NULL,
                player_yellow TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                winner TEXT,
                challenged_by TEXT NOT NULL,
                last_move_at TEXT,
                created_at TEXT NOT NULL,
                finished_at TEXT
            )
        ''')

        # Connect 4 lifetime stats table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS connect4_stats (
                username TEXT PRIMARY KEY,
                wins INTEGER NOT NULL DEFAULT 0,
                losses INTEGER NOT NULL DEFAULT 0,
                draws INTEGER NOT NULL DEFAULT 0
            )
        ''')

    logger.info("Database initialized successfully")

def add_message(text: str, sender: str, recipient: str, image_filename: Optional[str] = None) -> int:
    """Add a new message to the database"""
    timestamp = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.execute(
            'INSERT INTO messages (text, sender, recipient, image_filename, timestamp) VALUES (?, ?, ?, ?, ?)',
            (text, sender, recipient, image_filename, timestamp)
        )
        message_id = cursor.lastrowid
    return message_id

def get_message_by_id(message_id: int) -> Optional[Dict]:
    """Get a specific message by ID"""
    with get_db_connection() as conn:
        cursor = conn.execute(
            'SELECT id, text, sender, recipient, image_filename, timestamp, delivered, delivered_at FROM messages WHERE id = ?',
            (message_id,)
        )
        row = cursor.fetchone()

    if row:
        return {
            'id': row[0],
            'text': row[1],
            'sender': row[2],
            'recipient': row[3],
            'image': row[4],
            'timestamp': row[5],
            'delivered': bool(row[6]),
            'delivered_at': row[7]
        }
    return None

def delete_message(message_id: int) -> bool:
    """Delete a message from the database"""
    try:
        with get_db_connection() as conn:
            conn.execute('DELETE FROM messages WHERE id = ?', (message_id,))
        return True
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        return False

def get_messages_for_recipient(recipient: str) -> List[Dict]:
    """Get all messages sent TO a specific user"""
    from models import get_display_name

    with get_db_connection() as conn:
        cursor = conn.execute(
            'SELECT id, text, sender, recipient, image_filename, timestamp, delivered, delivered_at FROM messages WHERE recipient = ? ORDER BY timestamp DESC',
            (recipient,)
        )
        messages = [
            {
                'id': row[0],
                'text': row[1],
                'sender': row[2],
                'sender_display': get_display_name(row[2]),
                'recipient': row[3],
                'recipient_display': get_display_name(row[3]),
                'image': row[4],
                'timestamp': row[5],
                'delivered': bool(row[6]),
                'delivered_at': row[7]
            }
            for row in cursor.fetchall()
        ]
    return messages

def get_messages_by_sender(sender: str) -> List[Dict]:
    """Get all messages sent BY a specific user"""
    from models import get_display_name

    with get_db_connection() as conn:
        cursor = conn.execute(
            'SELECT id, text, sender, recipient, image_filename, timestamp, delivered, delivered_at FROM messages WHERE sender = ? ORDER BY timestamp DESC',
            (sender,)
        )
        messages = [
            {
                'id': row[0],
                'text': row[1],
                'sender': row[2],
                'sender_display': get_display_name(row[2]),
                'recipient': row[3],
                'recipient_display': get_display_name(row[3]),
                'image': row[4],
                'timestamp': row[5],
                'delivered': bool(row[6]),
                'delivered_at': row[7]
            }
            for row in cursor.fetchall()
        ]
    return messages

def get_latest_message_for_recipient(recipient: str) -> Optional[Dict]:
    """Get the most recent message for a specific user (for Pi display)"""
    from models import get_display_name

    with get_db_connection() as conn:
        cursor = conn.execute(
            'SELECT id, text, sender, recipient, image_filename, timestamp, delivered, delivered_at FROM messages WHERE recipient = ? ORDER BY timestamp DESC LIMIT 1',
            (recipient,)
        )
        row = cursor.fetchone()

    if row:
        return {
            'id': row[0],
            'text': row[1],
            'sender': row[2],
            'sender_display': get_display_name(row[2]),
            'recipient': row[3],
            'recipient_display': get_display_name(row[3]),
            'image': row[4],
            'timestamp': row[5],
            'delivered': bool(row[6]),
            'delivered_at': row[7]
        }
    return None

def mark_message_delivered(message_id: int) -> bool:
    """Mark a message as delivered (when Pi displays it)"""
    try:
        with get_db_connection() as conn:
            conn.execute(
                'UPDATE messages SET delivered = 1, delivered_at = ? WHERE id = ?',
                (datetime.now(timezone.utc).isoformat(), message_id)
            )
        return True
    except Exception as e:
        logger.error(f"Error marking message delivered: {e}")
        return False

def update_password(username: str, new_password: str) -> bool:
    """Update a user's password"""
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                'UPDATE users SET password = ? WHERE username = ?',
                (new_password, username)
            )
            rows_affected = cursor.rowcount
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error updating password: {e}")
        return False

## Connect 4 functions ##

def init_connect4_stats():
    """Ensure stat rows exist for both users"""
    from models import VALID_USERS
    with get_db_connection() as conn:
        for username in VALID_USERS:
            conn.execute(
                'INSERT OR IGNORE INTO connect4_stats (username) VALUES (?)',
                (username,)
            )


def _game_row_to_dict(row) -> Dict:
    """Convert a connect4_games row to a dict"""
    return {
        'id': row[0],
        'board': row[1],
        'current_turn': row[2],
        'player_red': row[3],
        'player_yellow': row[4],
        'status': row[5],
        'winner': row[6],
        'challenged_by': row[7],
        'last_move_at': row[8],
        'created_at': row[9],
        'finished_at': row[10],
    }


def get_active_connect4_game() -> Optional[Dict]:
    """Returns game with status 'pending' or 'active'"""
    with get_db_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM connect4_games WHERE status IN ('pending', 'active') ORDER BY id DESC LIMIT 1"
        )
        row = cursor.fetchone()
    if row:
        return _game_row_to_dict(row)
    return None


def create_connect4_challenge(challenger: str) -> int:
    """Create a new pending challenge. Alternates color assignment from last game."""
    from models import VALID_USERS
    opponent = [u for u in VALID_USERS if u != challenger][0]

    # Determine color assignment by looking at the last finished game
    with get_db_connection() as conn:
        cursor = conn.execute(
            "SELECT player_red FROM connect4_games ORDER BY id DESC LIMIT 1"
        )
        last_game = cursor.fetchone()

    # Alternate: if challenger was red last time, make them yellow now
    if last_game and last_game[0] == challenger:
        player_red, player_yellow = opponent, challenger
    else:
        player_red, player_yellow = challenger, opponent

    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.execute(
            '''INSERT INTO connect4_games (player_red, player_yellow, challenged_by, created_at, status)
               VALUES (?, ?, ?, ?, 'pending')''',
            (player_red, player_yellow, challenger, now)
        )
        return cursor.lastrowid


def accept_connect4_challenge(game_id: int, accepting_user: str) -> Dict:
    """Accept a pending challenge — game becomes active, red goes first"""
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM connect4_games WHERE id = ?", (game_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Game not found")
        game = _game_row_to_dict(row)
        if game['status'] != 'pending':
            raise ValueError("Game is not pending")
        if game['challenged_by'] == accepting_user:
            raise ValueError("Cannot accept your own challenge")

        conn.execute(
            "UPDATE connect4_games SET status = 'active', current_turn = ?, last_move_at = ? WHERE id = ?",
            (game['player_red'], now, game_id)
        )
        game['status'] = 'active'
        game['current_turn'] = game['player_red']
        game['last_move_at'] = now
        return game


def decline_connect4_challenge(game_id: int, declining_user: str):
    """Decline (delete) a pending challenge"""
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM connect4_games WHERE id = ?", (game_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Game not found")
        game = _game_row_to_dict(row)
        if game['status'] != 'pending':
            raise ValueError("Game is not pending")
        if game['challenged_by'] == declining_user:
            raise ValueError("Cannot decline your own challenge — cancel instead")
        conn.execute("DELETE FROM connect4_games WHERE id = ?", (game_id,))


def cancel_connect4_challenge(game_id: int, cancelling_user: str):
    """Cancel your own pending challenge"""
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM connect4_games WHERE id = ?", (game_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Game not found")
        game = _game_row_to_dict(row)
        if game['status'] != 'pending':
            raise ValueError("Game is not pending")
        if game['challenged_by'] != cancelling_user:
            raise ValueError("Can only cancel your own challenge")
        conn.execute("DELETE FROM connect4_games WHERE id = ?", (game_id,))


def check_connect4_winner(board: str) -> Optional[str]:
    """Check for 4 in a row. Returns '1' (red) or '2' (yellow) or None."""
    def cell(col, row):
        if 0 <= col < 7 and 0 <= row < 6:
            return board[col * 6 + row]
        return '0'

    for col in range(7):
        for row in range(6):
            v = cell(col, row)
            if v == '0':
                continue
            # Check 4 directions: right, up, up-right, up-left
            directions = [(1, 0), (0, 1), (1, 1), (1, -1)]
            for dc, dr in directions:
                if all(cell(col + dc * i, row + dr * i) == v for i in range(4)):
                    return v
    return None


def make_connect4_move(game_id: int, column: int, player: str) -> Dict:
    """Place a piece in the given column. Returns updated game dict."""
    if column < 0 or column > 6:
        raise ValueError("Column must be 0-6")

    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM connect4_games WHERE id = ?", (game_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Game not found")
        game = _game_row_to_dict(row)

        if game['status'] != 'active':
            raise ValueError("Game is not active")
        if game['current_turn'] != player:
            raise ValueError("Not your turn")

        board = list(game['board'])
        piece = '1' if player == game['player_red'] else '2'

        # Find the lowest empty row in this column
        placed = False
        for r in range(6):
            idx = column * 6 + r
            if board[idx] == '0':
                board[idx] = piece
                placed = True
                break

        if not placed:
            raise ValueError("Column is full")

        board_str = ''.join(board)
        now = datetime.now(timezone.utc).isoformat()

        # Check for winner
        winner_piece = check_connect4_winner(board_str)
        if winner_piece:
            winner = game['player_red'] if winner_piece == '1' else game['player_yellow']
            loser = game['player_yellow'] if winner_piece == '1' else game['player_red']
            conn.execute(
                "UPDATE connect4_games SET board = ?, status = 'won', winner = ?, current_turn = NULL, last_move_at = ?, finished_at = ? WHERE id = ?",
                (board_str, winner, now, now, game_id)
            )
            _update_connect4_stats(conn, winner, loser, is_draw=False)
            game.update(board=board_str, status='won', winner=winner, current_turn=None, last_move_at=now, finished_at=now)
            return game

        # Check for draw (board full)
        if '0' not in board_str:
            conn.execute(
                "UPDATE connect4_games SET board = ?, status = 'draw', current_turn = NULL, last_move_at = ?, finished_at = ? WHERE id = ?",
                (board_str, now, now, game_id)
            )
            _update_connect4_stats(conn, game['player_red'], game['player_yellow'], is_draw=True)
            game.update(board=board_str, status='draw', current_turn=None, last_move_at=now, finished_at=now)
            return game

        # Switch turn
        next_turn = game['player_yellow'] if player == game['player_red'] else game['player_red']
        conn.execute(
            "UPDATE connect4_games SET board = ?, current_turn = ?, last_move_at = ? WHERE id = ?",
            (board_str, next_turn, now, game_id)
        )
        game.update(board=board_str, current_turn=next_turn, last_move_at=now)
        return game


def forfeit_connect4_game(game_id: int, forfeiting_player: str) -> Dict:
    """Forfeit an active game"""
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM connect4_games WHERE id = ?", (game_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Game not found")
        game = _game_row_to_dict(row)

        if game['status'] != 'active':
            raise ValueError("Game is not active")
        if forfeiting_player not in (game['player_red'], game['player_yellow']):
            raise ValueError("You are not in this game")

        winner = game['player_yellow'] if forfeiting_player == game['player_red'] else game['player_red']
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE connect4_games SET status = 'forfeit', winner = ?, current_turn = NULL, finished_at = ? WHERE id = ?",
            (winner, now, game_id)
        )
        _update_connect4_stats(conn, winner, forfeiting_player, is_draw=False)
        game.update(status='forfeit', winner=winner, current_turn=None, finished_at=now)
        return game


def _update_connect4_stats(conn, player1: str, player2: str, is_draw: bool):
    """Update stats within an existing connection/transaction"""
    if is_draw:
        conn.execute("UPDATE connect4_stats SET draws = draws + 1 WHERE username = ?", (player1,))
        conn.execute("UPDATE connect4_stats SET draws = draws + 1 WHERE username = ?", (player2,))
    else:
        conn.execute("UPDATE connect4_stats SET wins = wins + 1 WHERE username = ?", (player1,))
        conn.execute("UPDATE connect4_stats SET losses = losses + 1 WHERE username = ?", (player2,))


def expire_stale_games():
    """Expire pending challenges > 5 min and active games with no move in 30 min"""
    now = datetime.now(timezone.utc)
    with get_db_connection() as conn:
        # Delete stale pending challenges (> 5 min)
        cursor = conn.execute(
            "SELECT id, created_at FROM connect4_games WHERE status = 'pending'"
        )
        for row in cursor.fetchall():
            created = datetime.fromisoformat(row[1])
            if (now - created).total_seconds() > 300:
                conn.execute("DELETE FROM connect4_games WHERE id = ?", (row[0],))
                logger.info(f"Expired pending challenge {row[0]}")

        # Expire stale active games (no move in 30 min)
        cursor = conn.execute(
            "SELECT id, last_move_at FROM connect4_games WHERE status = 'active'"
        )
        for row in cursor.fetchall():
            last_move = datetime.fromisoformat(row[1])
            if (now - last_move).total_seconds() > 1800:
                conn.execute(
                    "UPDATE connect4_games SET status = 'expired', current_turn = NULL, finished_at = ? WHERE id = ?",
                    (now.isoformat(), row[0])
                )
                logger.info(f"Expired active game {row[0]} due to inactivity")


def get_connect4_stats() -> Dict:
    """Get lifetime stats for all players"""
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT username, wins, losses, draws FROM connect4_stats")
        stats = {}
        for row in cursor.fetchall():
            stats[row[0]] = {'wins': row[1], 'losses': row[2], 'draws': row[3]}
    return stats


def get_connect4_history() -> List[Dict]:
    """Get finished games ordered by most recent"""
    with get_db_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM connect4_games WHERE status NOT IN ('pending', 'active') ORDER BY id DESC"
        )
        return [_game_row_to_dict(row) for row in cursor.fetchall()]


if __name__ == "__main__":
    init_db()
