/**
 * Password validation utility
 * Shared validation logic for password strength requirements
 */

/**
 * Validate password meets security requirements
 * @param {string} password - The password to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
export const validatePassword = (password) => {
  const errors = []

  if (password.length < 8) {
    errors.push('At least 8 characters')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('One number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\\/`~]/.test(password)) {
    errors.push('One special character')
  }

  return errors
}

/**
 * Check if password is valid (meets all requirements)
 * @param {string} password - The password to check
 * @returns {boolean} True if password is valid
 */
export const isPasswordValid = (password) => {
  return validatePassword(password).length === 0
}
