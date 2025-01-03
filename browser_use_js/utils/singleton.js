/**
 * Singleton pattern implementation
 */

/**
 * Creates a singleton wrapper for a class
 * @param {Function} Class - Class to make singleton
 * @returns {Function} Singleton factory function
 */
export function singleton(Class) {
  let instance = null;
  
  return function(...args) {
    if (!instance) {
      instance = new Class(...args);
    }
    return instance;
  };
}

/**
 * Example usage:
 * 
 * @singleton
 * class MyService {
 *   constructor() {
 *     // ...
 *   }
 * }
 * 
 * // Alternative usage without decorator:
 * class MyService {
 *   constructor() {
 *     // ...
 *   }
 * }
 * const SingletonService = singleton(MyService);
 */
