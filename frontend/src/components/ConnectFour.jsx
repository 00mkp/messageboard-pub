import { useState, useEffect, useCallback, useRef } from 'react'
import { endpoints, getDisplayName } from '../config/api'
import { authFetch } from '../utils/authFetch'

const POLL_INTERVAL = 2000

function boardToGrid(boardStr) {
  const grid = []
  for (let row = 5; row >= 0; row--) {
    const rowArr = []
    for (let col = 0; col < 7; col++) {
      rowArr.push(boardStr[col * 6 + row])
    }
    grid.push(rowArr)
  }
  return grid
}

function findWinningCells(boardStr) {
  const cells = new Set()
  function cell(col, row) {
    if (col >= 0 && col < 7 && row >= 0 && row < 6) return boardStr[col * 6 + row]
    return '0'
  }
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 6; row++) {
      const v = cell(col, row)
      if (v === '0') continue
      for (const [dc, dr] of directions) {
        const line = []
        for (let i = 0; i < 4; i++) {
          if (cell(col + dc * i, row + dr * i) === v) {
            line.push([col + dc * i, row + dr * i])
          }
        }
        if (line.length === 4) {
          line.forEach(([c, r]) => cells.add(`${c},${r}`))
        }
      }
    }
  }
  return cells
}

export default function ConnectFour({ currentUser, token }) {
  const [game, setGame] = useState(null)
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [moveInFlight, setMoveInFlight] = useState(false)
  const [lastBoard, setLastBoard] = useState(null)
  const [droppedCell, setDroppedCell] = useState(null)
  const [hoverCol, setHoverCol] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const fetchGame = useCallback(async () => {
    try {
      const res = await authFetch(endpoints.connect4Game, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setGame(prev => {
        const newGame = data.game
        if (newGame && prev && newGame.board !== prev.board) {
          // Find the newly placed piece
          const oldBoard = prev.board
          const newBoard = newGame.board
          for (let col = 0; col < 7; col++) {
            for (let row = 0; row < 6; row++) {
              const idx = col * 6 + row
              if (oldBoard[idx] === '0' && newBoard[idx] !== '0') {
                setDroppedCell(`${col},${row}`)
                setTimeout(() => setDroppedCell(null), 350)
              }
            }
          }
          setLastBoard(newBoard)
        }
        return newGame
      })
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [token])

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch(endpoints.connect4Stats, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setStats(data.stats)
    } catch { /* ignore */ }
  }, [token])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch(endpoints.connect4History, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setHistory(data.history || [])
    } catch { /* ignore */ }
  }, [token])

  // Initial load
  useEffect(() => {
    fetchGame()
    fetchStats()
    fetchHistory()
  }, [fetchGame, fetchStats, fetchHistory])

  // Polling
  useEffect(() => {
    pollRef.current = setInterval(fetchGame, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [fetchGame])

  // Refresh stats and history when game ends
  const prevStatus = useRef(null)
  useEffect(() => {
    if (prevStatus.current === 'active' && game && game.status !== 'active') {
      fetchStats()
      fetchHistory()
    }
    prevStatus.current = game?.status || null
  }, [game?.status, fetchStats, fetchHistory])

  const sendChallenge = async () => {
    setError(null)
    try {
      const res = await authFetch(endpoints.connect4Challenge, { method: 'POST', headers })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Failed to send challenge')
        return
      }
      const data = await res.json()
      setGame(data.game)
    } catch { setError('Network error') }
  }

  const respondToChallenge = async (accept) => {
    if (!game) return
    setError(null)
    try {
      const res = await authFetch(endpoints.connect4Respond, {
        method: 'POST',
        headers,
        body: JSON.stringify({ game_id: game.id, accept }),
      })
      const data = await res.json()
      setGame(data.game)
      if (accept) fetchStats()
    } catch { setError('Network error') }
  }

  const cancelChallenge = async () => {
    if (!game) return
    setError(null)
    try {
      const res = await authFetch(endpoints.connect4Cancel, {
        method: 'POST',
        headers,
        body: JSON.stringify({ game_id: game.id }),
      })
      const data = await res.json()
      setGame(data.game)
    } catch { setError('Network error') }
  }

  const makeMove = async (column) => {
    if (!game || moveInFlight) return
    setError(null)
    setMoveInFlight(true)
    try {
      const res = await authFetch(endpoints.connect4Move, {
        method: 'POST',
        headers,
        body: JSON.stringify({ game_id: game.id, column }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Invalid move')
        setMoveInFlight(false)
        return
      }
      const data = await res.json()
      // Animate the drop
      const oldBoard = game.board
      const newBoard = data.game.board
      for (let col = 0; col < 7; col++) {
        for (let row = 0; row < 6; row++) {
          const idx = col * 6 + row
          if (oldBoard[idx] === '0' && newBoard[idx] !== '0') {
            setDroppedCell(`${col},${row}`)
            setTimeout(() => setDroppedCell(null), 350)
          }
        }
      }
      setGame(data.game)
      setLastBoard(data.game.board)
    } catch { setError('Network error') }
    setMoveInFlight(false)
  }

  const forfeitGame = async () => {
    if (!game) return
    setError(null)
    try {
      const res = await authFetch(endpoints.connect4Forfeit, {
        method: 'POST',
        headers,
        body: JSON.stringify({ game_id: game.id }),
      })
      const data = await res.json()
      setGame(data.game)
      fetchStats()
      fetchHistory()
    } catch { setError('Network error') }
  }

  const opponent = currentUser === 'alice' ? 'bob' : 'alice'
  const isMyTurn = game?.status === 'active' && game.current_turn === currentUser
  const myColor = game?.player_red === currentUser ? 'red' : 'yellow'
  const gameOver = game && ['won', 'draw', 'forfeit', 'expired'].includes(game.status)
  const winningCells = gameOver && game.status === 'won' ? findWinningCells(game.board) : new Set()

  const grid = game ? boardToGrid(game.board) : null

  const getResultText = () => {
    if (!game) return ''
    if (game.status === 'won') return game.winner === currentUser ? 'You won!' : 'You lost'
    if (game.status === 'draw') return 'Draw!'
    if (game.status === 'forfeit') return game.winner === currentUser ? 'Opponent forfeited' : 'You forfeited'
    if (game.status === 'expired') return 'Timed out'
    return ''
  }

  const getHistoryResult = (g) => {
    if (g.status === 'won') return `${getDisplayName(g.winner)} won`
    if (g.status === 'draw') return 'Draw'
    if (g.status === 'forfeit') return `${getDisplayName(g.winner)} won (forfeit)`
    if (g.status === 'expired') return 'Timed out'
    return g.status
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main game area */}
      <div className="flex-1 min-w-0">
        {/* Stats bar */}
        {stats && (
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className={currentUser === 'alice' ? 'text-purple-700 font-bold' : 'text-gray-700'}>
                {getDisplayName('alice')}: {stats['alice']?.wins || 0}W-{stats['alice']?.losses || 0}L-{stats['alice']?.draws || 0}D
              </span>
              <span className="text-gray-400">vs</span>
              <span className={currentUser === 'bob' ? 'text-purple-700 font-bold' : 'text-gray-700'}>
                {getDisplayName('bob')}: {stats['bob']?.wins || 0}W-{stats['bob']?.losses || 0}L-{stats['bob']?.draws || 0}D
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* No game state */}
        {!game && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-600 mb-4 text-lg">No active game</p>
            <button
              onClick={sendChallenge}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Challenge {getDisplayName(opponent)}!
            </button>
          </div>
        )}

        {/* Pending challenge - I sent it */}
        {game?.status === 'pending' && game.challenged_by === currentUser && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-600 mb-2 text-lg">Waiting for {getDisplayName(opponent)} to accept...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <button
              onClick={cancelChallenge}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Pending challenge - I received it */}
        {game?.status === 'pending' && game.challenged_by !== currentUser && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-800 mb-4 text-lg font-semibold">
              {getDisplayName(game.challenged_by)} wants to play Connect 4!
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => respondToChallenge(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Accept
              </button>
              <button
                onClick={() => respondToChallenge(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Active game or game over */}
        {game && game.status !== 'pending' && (
          <div className="bg-white rounded-xl shadow p-4">
            {/* Turn indicator / result */}
            <div className="mb-3 text-center">
              {game.status === 'active' && (
                <div className="flex items-center justify-center gap-2">
                  <span className={`inline-block w-4 h-4 rounded-full ${myColor === 'red' ? 'bg-red-500' : 'bg-yellow-400'}`}></span>
                  <span className="font-semibold text-gray-800">
                    {isMyTurn ? "Your turn!" : `${getDisplayName(game.current_turn)}'s turn`}
                  </span>
                  <span className="text-sm text-gray-500">
                    (You: {myColor === 'red' ? '🔴' : '🟡'})
                  </span>
                </div>
              )}
              {gameOver && (
                <p className={`text-lg font-bold ${
                  game.winner === currentUser ? 'text-green-600' :
                  game.status === 'draw' || game.status === 'expired' ? 'text-gray-600' : 'text-red-600'
                }`}>
                  {getResultText()}
                </p>
              )}
            </div>

            {/* Board */}
            <div className="flex justify-center">
              <div
                className="inline-grid gap-1 p-2 rounded-lg bg-blue-600"
                style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
              >
                {grid.map((row, rowIdx) =>
                  row.map((cell, colIdx) => {
                    const gridRow = 5 - rowIdx // convert display row back to board row
                    const isWinCell = winningCells.has(`${colIdx},${gridRow}`)
                    const isDrop = droppedCell === `${colIdx},${gridRow}`
                    const canClick = game.status === 'active' && isMyTurn && !moveInFlight && !gameOver
                    const isHovered = hoverCol === colIdx && canClick

                    return (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all
                          ${canClick ? 'cursor-pointer' : ''}
                          ${isHovered ? 'ring-2 ring-white/60' : ''}
                          ${isDrop ? 'animate-drop' : ''}
                          ${isWinCell ? 'animate-win-pulse' : ''}
                          ${cell === '0' ? 'bg-blue-800' : cell === '1' ? 'bg-red-500' : 'bg-yellow-400'}
                        `}
                        onClick={() => canClick && makeMove(colIdx)}
                        onMouseEnter={() => setHoverCol(colIdx)}
                        onMouseLeave={() => setHoverCol(null)}
                      />
                    )
                  })
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex justify-center gap-3">
              {game.status === 'active' && (
                <button
                  onClick={forfeitGame}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  Forfeit
                </button>
              )}
              {gameOver && (
                <button
                  onClick={sendChallenge}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Play Again?
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History sidebar */}
      <div className="lg:w-64 w-full">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Game History</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No games played yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((g) => (
                <div
                  key={g.id}
                  className={`text-sm p-2 rounded-lg ${
                    g.winner === currentUser ? 'bg-green-50 text-green-800' :
                    g.status === 'draw' || g.status === 'expired' ? 'bg-gray-50 text-gray-600' :
                    'bg-red-50 text-red-800'
                  }`}
                >
                  <span className="font-medium">#{g.id}</span>{' '}
                  {getHistoryResult(g)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
