/**
 * Authenticated fetch wrapper that automatically logs out on session expiration
 */

let logoutCallback = null

// Set the logout callback (called from App.jsx)
export const setLogoutCallback = (callback) => {
  logoutCallback = callback
}

// Authenticated fetch that handles session expiration
export const authFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options)

    // Check for 401 Unauthorized - auto logout on ANY auth failure
    if (response.status === 401) {
      // Clone the response so we can read it
      const clonedResponse = response.clone()
      const data = await clonedResponse.json().catch(() => ({}))

      console.log('401 Unauthorized detected. Detail:', data.detail)
      console.log('Auto-logout triggered')

      if (logoutCallback) {
        logoutCallback()
      } else {
        console.error('Logout callback not set!')
      }

      // Return a fake successful response to prevent error messages
      // The logout will redirect to login screen anyway
      return new Response(JSON.stringify({ message: 'Session expired' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return response
  } catch (error) {
    throw error
  }
}
