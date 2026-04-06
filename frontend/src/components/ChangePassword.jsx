import { useState } from 'react'
import { endpoints } from '../config/api'
import { authFetch } from '../utils/authFetch'
import { validatePassword } from '../utils/passwordValidation'

function ChangePassword({ currentUser, token, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const passwordErrors = validatePassword(newPassword)
  const isPasswordValid = passwordErrors.length === 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (!isPasswordValid) {
      setError('Password does not meet requirements')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('current_password', currentPassword)
      formData.append('new_password', newPassword)

      const response = await authFetch(endpoints.changePassword, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(data.detail || 'Failed to update password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setError('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
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
              disabled={loading}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword
