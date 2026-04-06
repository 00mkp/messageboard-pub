import { useState } from 'react'
import Toast from './Toast'
import { endpoints, validation, getDisplayName } from '../config/api'
import { authFetch } from '../utils/authFetch'

function MessageForm({ currentUser, token, onMessageSent }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Determine recipient (if alice, send to bob and vice versa)
  const recipient = currentUser === 'alice' ? 'bob' : 'alice'
  const recipientDisplayName = getDisplayName(recipient)

  const validateImage = (file) => {
    // Check file type
    if (!validation.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!validation.ALLOWED_IMAGE_EXTENSIONS.includes('.' + ext)) {
        return 'Invalid file type. Please upload a JPEG, PNG, or HEIC image.'
      }
    }

    // Check file size
    if (file.size > validation.MAX_IMAGE_SIZE_BYTES) {
      return `Image too large. Maximum size is ${validation.MAX_IMAGE_SIZE_MB}MB.`
    }

    return null
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validationError = validateImage(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setImage(file)
      setError('')
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const validationError = validateImage(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setImage(file)
      setError('')
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else if (file) {
      setError('Please drop an image file')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    setSuccess(false)

    // Client-side validation
    const trimmedText = text.trim()
    if (!trimmedText) {
      setError('Message cannot be empty')
      setSending(false)
      return
    }

    if (trimmedText.length > validation.MAX_MESSAGE_LENGTH) {
      setError(`Message too long. Maximum ${validation.MAX_MESSAGE_LENGTH} characters allowed.`)
      setSending(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('text', trimmedText)
      formData.append('sender', currentUser)
      formData.append('recipient', recipient)
      if (image) {
        formData.append('image', image)
      }

      const response = await authFetch(endpoints.messages, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to send message')
      }

      // Success!
      setSuccess(true)
      setText('')
      setImage(null)
      setImagePreview(null)

      // Call parent callback
      if (onMessageSent) onMessageSent()

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Send a Message 💌
        </h2>
        <p className="text-gray-600">
          To: <span className="font-semibold text-purple-600">{recipientDisplayName}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Your Message
            </label>
            <span className={`text-sm ${text.length >= validation.MAX_MESSAGE_LENGTH ? 'text-red-500 font-medium' : text.length > validation.MAX_MESSAGE_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}>
              {text.length}/{validation.MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            required
            maxLength={validation.MAX_MESSAGE_LENGTH}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none placeholder:text-gray-400"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a Photo (Optional)
          </label>
          
          {!imagePreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
                isDragging
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="text-center">
                  <svg className={`mx-auto h-12 w-12 transition-colors ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className={`mt-2 text-sm transition-colors ${isDragging ? 'text-purple-600 font-medium' : 'text-gray-600'}`}>
                    {isDragging ? 'Drop image here' : 'Click or drag to upload an image'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full max-w-md rounded-xl shadow-md"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={sending || !text}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {sending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </span>
          ) : (
            'Send Message'
          )}
        </button>
      </form>

      {/* Toast Notification */}
      {success && (
        <Toast
          message="Message sent successfully! 💕"
          type="success"
          onClose={() => setSuccess(false)}
        />
      )}
    </div>
  )
}

export default MessageForm
