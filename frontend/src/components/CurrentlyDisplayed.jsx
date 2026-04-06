import { useState, useEffect } from 'react'
import { endpoints, getPossessiveName } from '../config/api'
import { authFetch } from '../utils/authFetch'

function CurrentlyDisplayed({ currentUser, token }) {
  const [displayedMessage, setDisplayedMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState(null)

  // Determine whose box we're checking (the recipient of our messages)
  const recipient = currentUser === 'alice' ? 'bob' : 'alice'
  const recipientPossessiveName = getPossessiveName(recipient)

  useEffect(() => {
    fetchDisplayedMessage()
    // Poll every 30 seconds to keep it updated
    const interval = setInterval(fetchDisplayedMessage, 30000)
    return () => {
      clearInterval(interval)
      // Clean up blob URL when component unmounts
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [])

  // Fetch image with authentication when message changes
  useEffect(() => {
    const fetchImage = async () => {
      // Clean up old blob URL
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
        setImageUrl(null)
      }

      if (displayedMessage?.image) {
        try {
          const response = await authFetch(endpoints.images(displayedMessage.image), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            setImageUrl(url)
          }
        } catch (error) {
          console.error('Error fetching image:', error)
        }
      }
    }

    fetchImage()
  }, [displayedMessage?.image])

  const fetchDisplayedMessage = async () => {
    try {
      // Fetch sent messages to see what we last sent to recipient
      const response = await authFetch(
        endpoints.messagesSent(currentUser),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      if (response.ok) {
        const messages = await response.json()
        // Get the most recent message sent to this recipient (regardless of delivery status)
        const latestToRecipient = messages
          .filter(msg => msg.recipient === recipient)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        setDisplayedMessage(latestToRecipient || null)
      }
    } catch (error) {
      console.error('Error fetching displayed message:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!displayedMessage) {
    return (
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📦</span>
          <div>
            <p className="font-semibold text-gray-700">On {recipientPossessiveName} Box</p>
            <p className="text-sm text-gray-500">No messages sent yet</p>
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl">📦</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-purple-900">On {recipientPossessiveName} Box</p>
            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
              displayedMessage.delivered
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {displayedMessage.delivered ? '✓ Delivered' : '⏳ Pending'}
            </span>
          </div>
          <p className="text-gray-700 text-sm mb-1 break-words">"{displayedMessage.text}"</p>
          {displayedMessage.image && imageUrl && (
            <img
              src={imageUrl}
              alt="Message attachment"
              className="mt-2 rounded-lg max-w-xs shadow-md"
              style={{ maxHeight: '200px', width: 'auto' }}
            />
          )}
          <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">
            Sent {formatTime(displayedMessage.timestamp)}
          </p>
          {displayedMessage.delivered && displayedMessage.delivered_at && (
            <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">
              Delivered {formatTime(displayedMessage.delivered_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default CurrentlyDisplayed
