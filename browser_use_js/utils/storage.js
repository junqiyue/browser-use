/**
 * Chrome storage utilities
 */

/**
 * Chrome storage wrapper for easier async access
 */
export class StorageManager {
  /**
   * Gets value from storage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key not found
   * @returns {Promise<any>} Stored value
   */
  static async get(key, defaultValue = null) {
    const result = await chrome.storage.sync.get([key]);
    return result[key] ?? defaultValue;
  }

  /**
   * Sets value in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  }

  /**
   * Removes value from storage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  static async remove(key) {
    await chrome.storage.sync.remove(key);
  }

  /**
   * Clears all storage
   * @returns {Promise<void>}
   */
  static async clear() {
    await chrome.storage.sync.clear();
  }
}

/**
 * Example usage:
 * 
 * // Store value
 * await StorageManager.set('myKey', 'myValue');
 * 
 * // Get value
 * const value = await StorageManager.get('myKey', 'defaultValue');
 * 
 * // Remove value
 * await StorageManager.remove('myKey');
 */
