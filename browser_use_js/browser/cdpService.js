/**
 * Chrome DevTools Protocol (CDP) service for browser automation
 * Handles low-level CDP commands and debugger attachment/detachment
 */

/**
 * @typedef {Object} Debuggee
 * @property {number} tabId - Chrome tab ID
 */

/**
 * @typedef {Object} CDPError
 * @property {string} message - Error message
 * @property {string} code - Error code
 * @property {Object} [data] - Additional error data
 */

export class CDPService {
  constructor() {
    this.debuggee = null;
    this.tabId = null;
  }

  /**
   * Attaches debugger to a tab
   * @param {number} tabId - Chrome tab ID
   */
  async attach(tabId) {
    if (this.debuggee) {
      await this.detach();
    }

    this.tabId = tabId;
    this.debuggee = { tabId };

    await new Promise((resolve, reject) => {
      chrome.debugger.attach(this.debuggee, '1.3', () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Detaches debugger from the current tab
   */
  async detach() {
    if (!this.debuggee) return;

    await new Promise((resolve) => {
      chrome.debugger.detach(this.debuggee, () => {
        this.debuggee = null;
        this.tabId = null;
        resolve();
      });
    });
  }

  /**
   * Sends CDP command
   * @param {string} method - CDP method name
   * @param {Object} params - CDP command parameters
   * @returns {Promise<any>} - Command result
   */
  /**
   * Sends CDP command
   * @param {string} method - CDP method name
   * @param {Object} params - CDP command parameters
   * @returns {Promise<any>} - Command result
   * @throws {Error} If debugger is not attached or command fails
   */
  async sendCommand(method, params = {}) {
    if (!this.debuggee) {
      throw new Error('Debugger not attached');
    }

    try {
      return await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(this.debuggee, method, params, (result) => {
          const error = chrome.runtime.lastError;
          if (error) {
            const cdpError = {
              message: error.message,
              code: 'CDP_COMMAND_FAILED',
              data: { method, params }
            };
            reject(new Error(JSON.stringify(cdpError)));
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      console.error(`CDP command failed: ${method}`, error);
      throw error;
    }
  }
}
