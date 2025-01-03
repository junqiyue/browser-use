/**
 * Message handling for controller actions
 */

/**
 * @typedef {Object} ActionMessage
 * @property {'ACTION'} type - Message type
 * @property {string} action - Action name
 * @property {Object} params - Action parameters
 */

/**
 * @typedef {Object} ActionResponse
 * @property {'ACTION_RESULT'} type - Message type
 * @property {Object} result - Action result
 * @property {string} [error] - Error message
 */

/**
 * Handles messages in background script
 */
export class BackgroundMessageHandler {
  /**
   * @param {import('./service.js').Controller} controller - Controller instance
   */
  constructor(controller) {
    this.controller = controller;
    this.setupMessageListener();
  }

  /**
   * Sets up message listener
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ACTION') {
        this.handleActionMessage(message, sender)
          .then(sendResponse)
          .catch(error => sendResponse({ type: 'ACTION_RESULT', error: error.message }));
        return true; // Will respond asynchronously
      }
    });
  }

  /**
   * Handles action message
   * @param {ActionMessage} message - Action message
   * @param {chrome.runtime.MessageSender} sender - Message sender
   * @returns {Promise<ActionResponse>} Action response
   */
  async handleActionMessage(message, sender) {
    try {
      const result = await this.controller.act(
        { [message.action]: message.params },
        sender.tab
      );
      return { type: 'ACTION_RESULT', result };
    } catch (error) {
      console.error('Action failed:', error);
      return { type: 'ACTION_RESULT', error: error.message };
    }
  }
}

/**
 * Handles messages in content script
 */
export class ContentMessageHandler {
  constructor() {
    this.setupMessageListener();
  }

  /**
   * Sets up message listener
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'CDP_COMMAND') {
        this.handleCdpCommand(message.command, message.params)
          .then(sendResponse)
          .catch(error => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
      }
    });
  }

  /**
   * Handles CDP command
   * @param {string} command - CDP command
   * @param {Object} params - Command parameters
   * @returns {Promise<Object>} Command result
   */
  async handleCdpCommand(command, params) {
    try {
      switch (command) {
        case 'click':
          return await this.simulateClick(params.x, params.y);
        case 'type':
          return await this.simulateTyping(params.text);
        case 'scroll':
          return await this.simulateScroll(params.deltaX, params.deltaY);
        case 'evaluate':
          return await this.evaluateScript(params.script);
        default:
          throw new Error(`Unknown CDP command: ${command}`);
      }
    } catch (error) {
      console.error('CDP command failed:', error);
      throw error;
    }
  }

  /**
   * Simulates mouse click
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<Object>} Click result
   */
  async simulateClick(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element) {
      throw new Error('No element at coordinates');
    }

    element.click();
    return { success: true };
  }

  /**
   * Simulates keyboard typing
   * @param {string} text - Text to type
   * @returns {Promise<Object>} Typing result
   */
  async simulateTyping(text) {
    const activeElement = document.activeElement;
    if (!activeElement || !('value' in activeElement)) {
      throw new Error('No active input element');
    }

    activeElement.value = text;
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true };
  }

  /**
   * Simulates scrolling
   * @param {number} deltaX - Horizontal scroll amount
   * @param {number} deltaY - Vertical scroll amount
   * @returns {Promise<Object>} Scroll result
   */
  async simulateScroll(deltaX, deltaY) {
    window.scrollBy(deltaX, deltaY);
    return { success: true };
  }

  /**
   * Evaluates JavaScript in page context
   * @param {string} script - Script to evaluate
   * @returns {Promise<any>} Evaluation result
   */
  async evaluateScript(script) {
    return await eval(script);
  }
}
