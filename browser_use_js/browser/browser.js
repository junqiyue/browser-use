/**
 * Browser automation implementation using Chrome DevTools Protocol
 */

import { CDPService } from './cdpService.js';
import { BrowserContext } from './context.js';

export class Browser {
  constructor(config = {}) {
    this.config = {
      headless: false,
      disableSecurity: true,
      extraChromiumArgs: [],
      chromeInstancePath: null,
      wssUrl: null,
      proxy: null,
      ...config,
    };
  }

  /**
   * Creates a new browser context
   * @param {Object} config - Context configuration
   * @returns {BrowserContext} - New browser context
   */
  async newContext(config = {}) {
    const context = new BrowserContext(config);
    return context;
  }

  /**
   * Gets the current active tab ID
   * @returns {Promise<number>} - Active tab ID
   */
  async getActiveTabId() {
    const [tab] = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    return tab?.id;
  }

  /**
   * Navigates to a URL in the current tab
   * @param {string} url - URL to navigate to
   * @param {BrowserContext} context - Browser context
   */
  async navigate(url, context) {
    await context.cdp.sendCommand('Page.enable');
    await context.cdp.sendCommand('Page.navigate', { url });
    await this.waitForNavigation(context);
    await context.waitForNetworkIdle();
  }

  /**
   * Waits for page navigation to complete
   * @param {BrowserContext} context - Browser context
   */
  async waitForNavigation(context) {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, context.config.maximumWaitPageLoadTime * 1000);
      chrome.debugger.onEvent.addListener(function listener(source, method) {
        if (method === 'Page.loadEventFired') {
          clearTimeout(timeout);
          chrome.debugger.onEvent.removeListener(listener);
          resolve();
        }
      });
    });
  }

  /**
   * Takes a screenshot of the current page
   * @param {BrowserContext} context - Browser context
   * @returns {Promise<string>} - Base64 encoded screenshot
   */
  async screenshot(context) {
    const { data } = await context.cdp.sendCommand('Page.captureScreenshot');
    return data;
  }

  /**
   * Clicks an element at the specified coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {BrowserContext} context - Browser context
   */
  async click(x, y, context) {
    await context.cdp.sendCommand('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });

    await context.cdp.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });

    // Wait between actions as configured
    await new Promise(resolve => 
      setTimeout(resolve, context.config.waitBetweenActions * 1000)
    );
  }

  /**
   * Types text into the focused element
   * @param {string} text - Text to type
   * @param {BrowserContext} context - Browser context
   */
  async type(text, context) {
    for (const char of text) {
      await context.cdp.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char,
      });
      await context.cdp.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: char,
      });
    }

    // Wait between actions as configured
    await new Promise(resolve => 
      setTimeout(resolve, context.config.waitBetweenActions * 1000)
    );
  }

  /**
   * Gets the current page title
   * @param {BrowserContext} context - Browser context
   * @returns {Promise<string>} - Page title
   */
  async getTitle(context) {
    const { root } = await context.cdp.sendCommand('DOM.getDocument');
    const { nodeId } = await context.cdp.sendCommand('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: 'title',
    });
    const { node } = await context.cdp.sendCommand('DOM.describeNode', { nodeId });
    return node.nodeValue;
  }

  /**
   * Gets the current page URL
   * @param {BrowserContext} context - Browser context
   * @returns {Promise<string>} - Current URL
   */
  async getCurrentUrl(context) {
    const tab = await new Promise(resolve => {
      chrome.tabs.get(context.currentTabId, resolve);
    });
    return tab.url;
  }

  /**
   * Closes all contexts and cleanup
   */
  async close() {
    // Chrome extension contexts are managed by the browser
    // We just need to ensure all debugger connections are detached
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({}, resolve);
    });
    
    for (const tab of tabs) {
      try {
        await new Promise(resolve => {
          chrome.debugger.detach({ tabId: tab.id }, resolve);
        });
      } catch (e) {
        // Ignore if debugger wasn't attached
      }
    }
  }
}
