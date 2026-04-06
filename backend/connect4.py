from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from deps import get_current_user
import database
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ChallengeResponse(BaseModel):
    game_id: int
    accept: bool


class MoveRequest(BaseModel):
    game_id: int
    column: int


class ForfeitRequest(BaseModel):
    game_id: int


@router.get("/game")
async def get_game(current_user: str = Depends(get_current_user)):
    """Get current game state. Runs expiry check on every poll."""
    database.expire_stale_games()
    game = database.get_active_connect4_game()
    return {"game": game}


@router.post("/challenge")
async def create_challenge(current_user: str = Depends(get_current_user)):
    """Send a challenge to the other player"""
    existing = database.get_active_connect4_game()
    if existing:
        raise HTTPException(status_code=400, detail="A game is already pending or active")

    game_id = database.create_connect4_challenge(current_user)
    logger.info(f"{current_user} created challenge (game {game_id})")
    game = database.get_active_connect4_game()
    return {"game": game}


@router.post("/respond")
async def respond_to_challenge(body: ChallengeResponse, current_user: str = Depends(get_current_user)):
    """Accept or decline a pending challenge"""
    try:
        if body.accept:
            game = database.accept_connect4_challenge(body.game_id, current_user)
            logger.info(f"{current_user} accepted challenge (game {body.game_id})")
            return {"game": game}
        else:
            database.decline_connect4_challenge(body.game_id, current_user)
            logger.info(f"{current_user} declined challenge (game {body.game_id})")
            return {"game": None}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/move")
async def make_move(body: MoveRequest, current_user: str = Depends(get_current_user)):
    """Drop a piece in a column"""
    try:
        game = database.make_connect4_move(body.game_id, body.column, current_user)
        return {"game": game}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/forfeit")
async def forfeit_game(body: ForfeitRequest, current_user: str = Depends(get_current_user)):
    """Forfeit the active game"""
    try:
        game = database.forfeit_connect4_game(body.game_id, current_user)
        logger.info(f"{current_user} forfeited game {body.game_id}")
        return {"game": game}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel")
async def cancel_challenge(body: ForfeitRequest, current_user: str = Depends(get_current_user)):
    """Cancel your own pending challenge"""
    try:
        database.cancel_connect4_challenge(body.game_id, current_user)
        logger.info(f"{current_user} cancelled challenge {body.game_id}")
        return {"game": None}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats")
async def get_stats(current_user: str = Depends(get_current_user)):
    """Get lifetime stats for both players"""
    stats = database.get_connect4_stats()
    return {"stats": stats}


@router.get("/history")
async def get_history(current_user: str = Depends(get_current_user)):
    """Get list of finished games"""
    history = database.get_connect4_history()
    return {"history": history}
