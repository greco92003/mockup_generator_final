/**
 * Unified Retry Helper Module
 * 
 * This module provides functions for implementing retry logic with exponential backoff.
 */

/**
 * Executes a function with retry logic and exponential backoff
 * @param {Function} fn - The function to execute (must return a Promise)
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 100)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 3000)
 * @param {Function} options.shouldRetry - Function to determine if retry should be attempted (default: retry on any error)
 * @returns {Promise<any>} - Result of the function execution
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 3000,
    shouldRetry = () => true,
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Check if we should retry
      if (attempt > maxRetries || !shouldRetry(error)) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        maxDelay,
        initialDelay * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2)
      );

      console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  throw lastError;
}

/**
 * Creates a function that will retry the given function with the specified options
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options (see withRetry)
 * @returns {Function} - A function that will retry the given function
 */
function createRetryFunction(fn, options = {}) {
  return async (...args) => {
    return withRetry(() => fn(...args), options);
  };
}

module.exports = {
  withRetry,
  createRetryFunction
};
