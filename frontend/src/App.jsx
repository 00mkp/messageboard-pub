import { useState, useEffect } from 'react'
import Login from './components/Login'
import MessageForm from './components/MessageForm'
import MessageHistory from './components/MessageHistory'
import CurrentlyDisplayed from './components/CurrentlyDisplayed'
import ChangePassword from './components/ChangePassword'
import AdminPanel from './components/AdminPanel'
import ConnectFour from './components/ConnectFour'
import { getDisplayName, endpoints } from './config/api'
import { setLogoutCallback } from './utils/authFetch'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState(null)
  const [activeTab, setActiveTab] = useState('send')
  const [refreshHistory, setRefreshHistory] = useState(0)
  const [refreshDisplayed, setRefreshDisplayed] = useState(0)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [adminMode, setAdminMode] = useState(false)
  const [adminKey, setAdminKey] = useState(null)

  // Check for existing session on load
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUsername = localStorage.getItem('username')

    if (savedToken && savedUsername) {
      setToken(savedToken)
      setCurrentUser(savedUsername)
    }
  }, [])

  // Set up logout callback for auto-logout on session expiration
  useEffect(() => {
    setLogoutCallback(handleLogout)
  }, [])

  const handleLogin = (username, authToken) => {
    setCurrentUser(username)
    setToken(authToken)
  }

  const handleAdminLogin = (key) => {
    setAdminKey(key)
    setAdminMode(true)
  }

  const handleAdminClose = () => {
    setAdminMode(false)
    setAdminKey(null)
  }

  const handleLogout = async () => {
    // Call backend logout endpoint to invalidate session
    // Read token from localStorage to avoid stale closure issues
    const currentToken = localStorage.getItem('token')

    if (currentToken) {
      try {
        await fetch(endpoints.logout, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        })
      } catch (error) {
        console.error('Error logging out:', error)
        // Continue with logout even if backend call fails
      }
    }

    // Clear local storage and state
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setCurrentUser(null)
    setToken(null)
  }

  const handleMessageSent = () => {
    // Refresh history and displayed indicator when a message is sent
    setRefreshHistory(prev => prev + 1)
    setRefreshDisplayed(prev => prev + 1)
  }

  // If in admin mode, show admin panel
  if (adminMode && adminKey) {
    return <AdminPanel masterKey={adminKey} onClose={handleAdminClose} />
  }

  // If not logged in, show login page
  if (!currentUser || !token) {
    return <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />
  }

  // Logged in - show main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Message Board
              </h1>
              <p className="text-sm text-gray-600">Hi, {getDisplayName(currentUser)} 💕</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 pt-8">
        <div className={`${activeTab === 'game' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto`}>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'send'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow'
              }`}
            >
              📝 Send Message
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow'
              }`}
            >
              📖 History
            </button>
            <button
              onClick={() => setActiveTab('game')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'game'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow'
              }`}
            >
              🎮 Connect 4
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        <div className={`${activeTab === 'game' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto`}>
          {activeTab === 'send' && (
            <>
              <CurrentlyDisplayed
                currentUser={currentUser}
                token={token}
                key={refreshDisplayed}
              />
              <MessageForm
                currentUser={currentUser}
                token={token}
                onMessageSent={handleMessageSent}
              />
            </>
          )}
          {activeTab === 'history' && (
            <MessageHistory
              currentUser={currentUser}
              token={token}
              key={refreshHistory}
            />
          )}
          {activeTab === 'game' && (
            <ConnectFour
              currentUser={currentUser}
              token={token}
            />
          )}
        </div>
      </main>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword
          currentUser={currentUser}
          token={token}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  )
}

export default App
