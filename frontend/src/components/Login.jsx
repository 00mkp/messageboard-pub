import { useState } from 'react'
import { endpoints } from '../config/api'
import { validatePassword } from '../utils/passwordValidation'

function Login({ onLogin, onAdminLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetUsername, setResetUsername] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [adminError, setAdminError] = useState('')

  const passwordErrors = validatePassword(newPassword)
  const isPasswordValid = passwordErrors.length === 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)

      const response = await fetch(endpoints.login, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Invalid username or password')
      }

      const data = await response.json()

      // Save token and username to localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', data.username)

      // Call parent callback
      onLogin(data.username, data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    setAdminError('')

    if (!adminKey) {
      setAdminError('Master key is required')
      return
    }

    // Call parent callback with admin key
    if (onAdminLogin) {
      onAdminLogin(adminKey)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetMessage('')

    // Validate all fields are filled
    if (!resetUsername || !masterKey || !newPassword || !confirmNewPassword) {
      setResetError('All fields are required')
      setResetLoading(false)
      return
    }

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match')
      setResetLoading(false)
      return
    }

    // Validate password requirements
    if (!isPasswordValid) {
      setResetError('Password does not meet requirements')
      setResetLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('username', resetUsername)
      formData.append('master_key', masterKey)
      formData.append('new_password', newPassword)

      const response = await fetch(endpoints.resetPassword, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResetMessage('Password reset successfully! You can now log in.')
        setResetUsername('')
        setMasterKey('')
        setNewPassword('')
        setConfirmNewPassword('')

        // Close modal after 3 seconds
        setTimeout(() => {
          setShowReset(false)
          setResetMessage('')
        }, 3000)
      } else {
        setResetError(data.detail || 'Failed to reset password')
      }
    } catch (err) {
      setResetError('Failed to reset password')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Message Board ❤️
          </h1>
          <p className="text-gray-600">
            Long distance, close hearts
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button
            onClick={() => setShowReset(true)}
            className="block w-full text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
          >
            Forgot Password?
          </button>
          <button
            onClick={() => setShowAdminLogin(true)}
            className="block w-full text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
          >
            Admin Panel
          </button>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showReset && (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
              <button
                onClick={() => {
                  setShowReset(false)
                  setResetError('')
                  setResetMessage('')
                  setResetUsername('')
                  setMasterKey('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={resetLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Master Key
                </label>
                <input
                  type="password"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-500"
                  placeholder="Enter master key"
                  disabled={resetLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={resetLoading}
                />
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-gray-600">Password must contain:</p>
                    <ul className="text-xs space-y-1">
                      <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                        {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                      </li>
                      <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
                      </li>
                      <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                        {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
                      </li>
                      <li className={/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                        {/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(newPassword) ? '✓' : '○'} One special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={resetLoading}
                />
              </div>

              {resetError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {resetError}
                </div>
              )}

              {resetMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {resetMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
              <button
                onClick={() => {
                  setShowAdminLogin(false)
                  setAdminKey('')
                  setAdminError('')
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Master Key
                </label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-500"
                  placeholder="Enter master key"
                  autoFocus
                />
              </div>

              {adminError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {adminError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Access Admin Panel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
