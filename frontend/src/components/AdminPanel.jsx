import { useState, useEffect } from 'react'
import { API_URL } from '../config/api'

function AdminPanel({ masterKey, onClose }) {
  const [storageData, setStorageData] = useState(null)
  const [piData, setPiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get base URL without /api suffix
  const BASE_URL = API_URL.replace('/api', '')

  useEffect(() => {
    fetchAdminData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAdminData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAdminData = async () => {
    try {
      // Fetch storage status
      const storageRes = await fetch(`${BASE_URL}/admin/storage-status?master_key=${encodeURIComponent(masterKey)}`)
      if (storageRes.ok) {
        const storageJson = await storageRes.json()
        setStorageData(storageJson)
      } else {
        throw new Error('Failed to fetch storage data')
      }

      // Fetch Pi status
      const piRes = await fetch(`${BASE_URL}/admin/pi-status?master_key=${encodeURIComponent(masterKey)}`)
      if (piRes.ok) {
        const piJson = await piRes.json()
        setPiData(piJson)
      } else {
        throw new Error('Failed to fetch Pi data')
      }

      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-100 text-green-700'
      case 'warning':
      case 'offline':
        return 'bg-yellow-100 text-yellow-700'
      case 'critical':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading && !storageData && !piData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
          <p className="text-gray-600 text-center">Loading admin data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Admin Panel 🔧
              </h1>
              <p className="text-gray-600 text-sm mt-1">System monitoring and statistics</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Storage Status */}
        {storageData && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Storage Status 💾</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(storageData.status)}`}>
                {storageData.status.toUpperCase()}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{storageData.storage.used_gb} GB used</span>
                <span>{storageData.storage.available_gb} GB available</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    storageData.storage.percent_used > 95
                      ? 'bg-red-500'
                      : storageData.storage.percent_used > 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageData.storage.percent_used, 100)}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {storageData.storage.percent_used}% of {storageData.storage.limit_gb} GB limit
              </p>
            </div>

            {/* Storage Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Total Images</p>
                <p className="text-2xl font-bold text-purple-600">{storageData.images.total_files}</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Messages with Images</p>
                <p className="text-2xl font-bold text-pink-600">{storageData.images.messages_with_images}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Avg Image Size</p>
                <p className="text-2xl font-bold text-blue-600">{storageData.images.average_size_mb} MB</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Last updated: {new Date(storageData.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Pi Status */}
        {piData && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Raspberry Pi Status 📡</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {Object.entries(piData.pis).map(([username, status]) => (
                <div key={username} className="border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {username === 'alice' ? "Alice's Pi" : "Bob's Pi"}
                      </h3>
                      <p className="text-sm text-gray-500">{username}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                      {status.online ? '● ONLINE' : '○ OFFLINE'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Seen:</span>
                      <span className="font-medium text-gray-900">
                        {status.last_seen_ago}
                      </span>
                    </div>
                    {status.last_seen && (
                      <div className="text-xs text-gray-400">
                        {new Date(status.last_seen).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-gray-900">{piData.summary.total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Online</p>
                  <p className="text-xl font-bold text-green-600">{piData.summary.online}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Offline</p>
                  <p className="text-xl font-bold text-red-600">{piData.summary.offline}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Last updated: {new Date(piData.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Auto-refresh notice */}
        <div className="text-center mt-6">
          <button
            onClick={fetchAdminData}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-lg transition-colors"
          >
            🔄 Refresh Now
          </button>
          <p className="text-xs text-gray-500 mt-2">Auto-refreshes every 30 seconds</p>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
