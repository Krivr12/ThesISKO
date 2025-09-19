/**
 * Generates a random password with mixed characters and numbers
 * @param {number} length - Length of password (default: 8)
 * @returns {string} Generated password
 */
export const generatePassword = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  // Ensure at least one character and one number
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  // Add at least one letter
  password += letters.charAt(Math.floor(Math.random() * letters.length));
  
  // Add at least one number
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill the rest with random characters
  for (let i = 2; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Shuffle the password to randomize positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

