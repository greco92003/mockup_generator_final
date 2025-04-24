/**
 * Utility for parallel processing of tasks
 */
class ParallelProcessor {
  /**
   * Run multiple promises in parallel and wait for all to complete
   * @param {Array<Function>} tasks - Array of functions that return promises
   * @returns {Promise<Array>} - Array of results
   */
  static async runAll(tasks) {
    return Promise.all(tasks.map(task => task()));
  }

  /**
   * Run multiple promises in parallel with a maximum concurrency
   * @param {Array<Function>} tasks - Array of functions that return promises
   * @param {number} concurrency - Maximum number of concurrent tasks
   * @returns {Promise<Array>} - Array of results in the same order as tasks
   */
  static async runWithConcurrency(tasks, concurrency = 3) {
    const results = new Array(tasks.length);
    let currentIndex = 0;
    
    // Helper function to process a task
    const processTask = async (taskIndex) => {
      try {
        const result = await tasks[taskIndex]();
        results[taskIndex] = { success: true, result };
      } catch (error) {
        results[taskIndex] = { success: false, error };
      }
      
      // Process next task if available
      const nextIndex = currentIndex++;
      if (nextIndex < tasks.length) {
        return processTask(nextIndex);
      }
    };
    
    // Start initial batch of tasks
    const initialBatch = Math.min(concurrency, tasks.length);
    const initialPromises = [];
    
    for (let i = 0; i < initialBatch; i++) {
      initialPromises.push(processTask(currentIndex++));
    }
    
    // Wait for all tasks to complete
    await Promise.all(initialPromises);
    
    // Process results
    return results.map(result => {
      if (result.success) {
        return result.result;
      } else {
        throw result.error;
      }
    });
  }

  /**
   * Run tasks in sequence
   * @param {Array<Function>} tasks - Array of functions that return promises
   * @returns {Promise<Array>} - Array of results
   */
  static async runSequential(tasks) {
    const results = [];
    
    for (const task of tasks) {
      results.push(await task());
    }
    
    return results;
  }

  /**
   * Run a task with a timeout
   * @param {Function} task - Function that returns a promise
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} - Promise that resolves with the task result or rejects with a timeout error
   */
  static async runWithTimeout(task, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      task().then(
        result => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        error => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }
}

module.exports = ParallelProcessor;
