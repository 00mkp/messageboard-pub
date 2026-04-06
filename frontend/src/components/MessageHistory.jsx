import { useState, useEffect } from 'react'
import Toast from './Toast'
import { endpoints, API_URL } from '../config/api'
import { authFetch } from '../utils/authFetch'

function MessageHistory({ currentUser, token }) {
  const [view, setView] = useState('received') // 'received' or 'sent'
  const [sentMessages, setSentMessages] = useState([])
  const [receivedMessages, setReceivedMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [imageUrls, setImageUrls] = useState({})

  useEffect(() => {
    fetchMessages()
    // Clean up blob URLs when component unmounts
    return () => {
      Object.values(imageUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  // Fetch images with authentication when messages change
  useEffect(() => {
    const fetchImages = async () => {
      const messagesToShow = view === 'received' ? receivedMessages : sentMessages
      const newImageUrls = {}

      for (const msg of messagesToShow) {
        if (msg.image && !imageUrls[msg.image]) {
          try {
            const response = await authFetch(endpoints.images(msg.image), {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (response.ok) {
              const blob = await response.blob()
              const url = URL.createObjectURL(blob)
              newImageUrls[msg.image] = url
            }
          } catch (error) {
            console.error('Error fetching image:', error)
          }
        }
      }

      if (Object.keys(newImageUrls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...newImageUrls }))
      }
    }

    fetchImages()
  }, [sentMessages, receivedMessages, view])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      // Fetch received messages
      const receivedRes = await authFetch(
        endpoints.messagesReceived(currentUser),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      if (receivedRes.ok) {
        const received = await receivedRes.json()
        setReceivedMessages(received)
      }

      // Fetch sent messages
      const sentRes = await authFetch(
        endpoints.messagesSent(currentUser),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      if (sentRes.ok) {
        const sent = await sentRes.json()
        setSentMessages(sent)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      const response = await authFetch(
        `${API_URL}/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        // Show success toast
        setToastMessage('Message deleted successfully')
        setShowToast(true)
        // Refresh messages after successful deletion
        fetchMessages()
      } else {
        const error = await response.json()
        alert(`Failed to delete message: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
    }
  }

  const handleDownloadImage = async (imageFilename) => {
    try {
      const response = await authFetch(endpoints.images(imageFilename), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = imageFilename
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Show success toast
      setToastMessage('Image downloaded')
      setShowToast(true)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image')
    }
  }

  const handleShareImage = async (imageFilename) => {
    try {
      const response = await authFetch(endpoints.images(imageFilename), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const blob = await response.blob()

      // Create a File from the blob
      const file = new File([blob], imageFilename, { type: blob.type })

      // Check if Web Share API with files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Share using Web Share API
        await navigator.share({
          files: [file],
          title: 'Message Image',
          text: 'Image from message board'
        })

        // Show success toast
        setToastMessage('Image shared')
        setShowToast(true)
      } else {
        // Fallback: Open image in new tab so user can long-press and save
        const url = window.URL.createObjectURL(blob)
        const newWindow = window.open(url, '_blank')

        if (newWindow) {
          setToastMessage('Image opened - long press to save to photos')
          setShowToast(true)
          // Clean up after a delay
          setTimeout(() => window.URL.revokeObjectURL(url), 1000)
        } else {
          // If popup blocked, try download instead
          const a = document.createElement('a')
          a.href = url
          a.download = imageFilename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          setToastMessage('Image downloaded - check your downloads')
          setShowToast(true)
        }
      }
    } catch (error) {
      // User cancelled the share or an error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing image:', error)
        alert('Failed to share image')
      }
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const messagesToShow = view === 'received' ? receivedMessages : sentMessages

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="h-5 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Message History 📖
        </h2>

        {/* Received/Sent Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('received')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              view === 'received'
                ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Received ({receivedMessages.length})
          </button>
          <button
            onClick={() => setView('sent')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              view === 'sent'
                ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sent ({sentMessages.length})
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messagesToShow.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No messages yet</p>
            <p className="text-gray-400 text-sm mt-2">
              {view === 'received' 
                ? 'Messages you receive will appear here' 
                : 'Messages you send will appear here'}
            </p>
          </div>
        ) : (
          messagesToShow.map((msg) => (
            <div
              key={msg.id}
              className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors animate-fade-in"
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">
                    {view === 'received' ? `From: ${msg.sender_display || msg.sender}` : `To: ${msg.recipient_display || msg.recipient}`}
                  </span>
                  {view === 'sent' && (
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      msg.delivered
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {msg.delivered ? '✓ Delivered' : '⏳ Pending'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(msg.timestamp)}
                  </span>
                  {view === 'sent' && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-gray-700 text-lg leading-relaxed mb-2 break-words">
                {msg.text}
              </p>
              
              {msg.image && imageUrls[msg.image] && (
                <div className="mt-3 relative inline-block max-w-full">
                  <img
                    src={imageUrls[msg.image]}
                    alt="Message attachment"
                    className="rounded-lg w-full max-w-xs sm:max-w-sm shadow-md object-contain"
                    style={{ maxHeight: '300px' }}
                  />
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleShareImage(msg.image)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium rounded-lg transition-colors"
                      title="Share image (save to photos)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </button>
                    <button
                      onClick={() => handleDownloadImage(msg.image)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                      title="Download image"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              )}

              {msg.delivered && msg.delivered_at && view === 'sent' && (
                <p className="text-xs text-gray-400 mt-2 whitespace-nowrap">
                  Delivered {formatDate(msg.delivered_at)}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchMessages}
        className="mt-6 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
      >
        🔄 Refresh
      </button>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}

export default MessageHistory
