/**
 * Timing utilities for performance measurement
 */

/**
 * Creates a logger instance
 * @returns {Console} Logger instance
 */
const createLogger = () => {
  return {
    debug: (...args) => console.debug('[Timing]', ...args),
    info: (...args) => console.info('[Timing]', ...args),
    warn: (...args) => console.warn('[Timing]', ...args),
    error: (...args) => console.error('[Timing]', ...args)
  };
};

const logger = createLogger();

/**
 * Times execution of synchronous function
 * @param {string} additionalText - Additional text to log
 * @returns {Function} Decorated function
 */
export function timeExecutionSync(additionalText = '') {
  return function(target) {
    const originalMethod = target;
    
    return function(...args) {
      const startTime = performance.now();
      const result = originalMethod.apply(this, args);
      const executionTime = (performance.now() - startTime) / 1000;
      
      logger.debug(`${additionalText} Execution time: ${executionTime.toFixed(2)} seconds`);
      return result;
    };
  };
}

/**
 * Times execution of async function
 * @param {string} additionalText - Additional text to log
 * @returns {Function} Decorated function
 */
export function timeExecutionAsync(additionalText = '') {
  return function(target) {
    const originalMethod = target;
    
    return async function(...args) {
      const startTime = performance.now();
      const result = await originalMethod.apply(this, args);
      const executionTime = (performance.now() - startTime) / 1000;
      
      logger.debug(`${additionalText} Execution time: ${executionTime.toFixed(2)} seconds`);
      return result;
    };
  };
}

/**
 * Example usage:
 * 
 * // Sync function
 * class Example {
 *   @timeExecutionSync('Custom operation')
 *   doSomething() {
 *     // ...
 *   }
 * }
 * 
 * // Async function
 * class Example {
 *   @timeExecutionAsync('Async operation')
 *   async doSomethingAsync() {
 *     // ...
 *   }
 * }
 * 
 * // Alternative usage without decorators:
 * const syncFn = timeExecutionSync('Operation')(function() {
 *   // ...
 * });
 * 
 * const asyncFn = timeExecutionAsync('Async op')(async function() {
 *   // ...
 * });
 */
