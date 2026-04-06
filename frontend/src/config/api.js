/**
 * API Configuration
 * Centralized API URL management using environment variables
 */

// Get API URL from environment variable, fallback to localhost for development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Export API endpoint helpers
export const endpoints = {
  login: `${API_URL}/login`,
  logout: `${API_URL}/logout`,
  changePassword: `${API_URL}/change-password`,
  resetPassword: `${API_URL}/reset-password`,
  messages: `${API_URL}/messages`,
  messagesReceived: (username) => `${API_URL}/messages/received/${username}`,
  messagesSent: (username) => `${API_URL}/messages/sent/${username}`,
  markDelivered: (id) => `${API_URL}/messages/${id}/delivered`,
  images: (filename) => `${API_URL}/images/${filename}`,
  connect4Game: `${API_URL}/connect4/game`,
  connect4Challenge: `${API_URL}/connect4/challenge`,
  connect4Respond: `${API_URL}/connect4/respond`,
  connect4Move: `${API_URL}/connect4/move`,
  connect4Forfeit: `${API_URL}/connect4/forfeit`,
  connect4Cancel: `${API_URL}/connect4/cancel`,
  connect4Stats: `${API_URL}/connect4/stats`,
  connect4History: `${API_URL}/connect4/history`,
};

// Validation constants
export const validation = {
  MAX_MESSAGE_LENGTH: 300,  // Fits ~5 lines on 480x280 e-ink display
  MAX_IMAGE_SIZE_MB: 10,
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.heic', '.heif'],
};

// Display names mapping
export const displayNames = {
  'alice': 'Alice',
  'bob': 'Bob'
};

// Helper function to get display name
export const getDisplayName = (username) => {
  return displayNames[username] || username;
};

// Helper function to get possessive form (e.g., "Alice's" or "Bob's")
export const getPossessiveName = (username) => {
  const name = getDisplayName(username);
  // If name ends with 's', just add apostrophe. Otherwise add 's
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
};
