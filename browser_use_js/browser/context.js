/**
 * Browser context management with CDP
 */

import { CDPService } from './cdpService.js';

/**
 * @typedef {Object} BrowserContextConfig
 * @property {string|null} cookiesFile - Path to cookies file for persistence
 * @property {number} minimumWaitPageLoadTime - Minimum time to wait before getting page state
 * @property {number} waitForNetworkIdlePageLoadTime - Time to wait for network requests to finish
 * @property {number} maximumWaitPageLoadTime - Maximum time to wait for page load
 * @property {number} waitBetweenActions - Time to wait between multiple per step actions
 * @property {boolean} disableSecurity - Disable browser security features
 * @property {{width: number, height: number}} browserWindowSize - Default browser window size
 */

export class BrowserContext {
  constructor(config = {}) {
    this.config = {
      cookiesFile: null,
      minimumWaitPageLoadTime: 0.5,
      waitForNetworkIdlePageLoadTime: 1,
      maximumWaitPageLoadTime: 5,
      waitBetweenActions: 1,
      disableSecurity: false,
      browserWindowSize: { width: 1280, height: 1100 },
      ...config,
    };
    this.contextId = crypto.randomUUID();
    this.cdp = null;
    this.currentTabId = null;
    this.tabs = new Map();
  }

  /**
   * Initializes CDP connection for a tab
   * @param {number} tabId - Chrome tab ID
   */
  async initialize(tabId) {
    if (!this.cdp) {
      this.cdp = new CDPService();
    }
    await this.cdp.attach(tabId);
    this.currentTabId = tabId;
    this.tabs.set(tabId, { url: '', title: '' });
    
    // Enable necessary domains
    await this.cdp.sendCommand('Page.enable');
    await this.cdp.sendCommand('Network.enable');
    await this.cdp.sendCommand('DOM.enable');
    
    // Set window size
    await this.cdp.sendCommand('Emulation.setDeviceMetricsOverride', {
      width: this.config.browserWindowSize.width,
      height: this.config.browserWindowSize.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  /**
   * Waits for network idle
   */
  async waitForNetworkIdle() {
    const startTime = Date.now();
    let resolvePromise;
    const idlePromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    const pendingRequests = new Set();
    let timeoutId;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (pendingRequests.size === 0) {
          resolvePromise();
        }
      }, this.config.waitForNetworkIdlePageLoadTime * 1000);
    };

    const requestListener = (params) => {
      pendingRequests.add(params.requestId);
      resetTimeout();
    };

    const responseListener = (params) => {
      pendingRequests.delete(params.requestId);
      if (pendingRequests.size === 0) {
        resetTimeout();
      }
    };

    await this.cdp.sendCommand('Network.enable');
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (method === 'Network.requestWillBeSent') {
        requestListener(params);
      } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
        responseListener(params);
      }
    });

    // Wait for network idle or maximum time
    const timeoutPromise = new Promise(resolve => {
      setTimeout(resolve, this.config.maximumWaitPageLoadTime * 1000);
    });

    await Promise.race([idlePromise, timeoutPromise]);
  }

  /**
   * Gets all tabs information
   * @returns {Array<Object>} - Array of tab information
   */
  async getTabsInfo() {
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({}, resolve);
    });
    
    return tabs.map(tab => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      active: tab.active,
    }));
  }

  /**
   * Switches to a different tab
   * @param {number} tabId - Tab ID to switch to
   */
  async switchToTab(tabId) {
    if (this.currentTabId === tabId) return;
    
    await this.cdp.detach();
    await this.initialize(tabId);
    await chrome.tabs.update(tabId, { active: true });
  }

  /**
   * Creates a new tab
   * @param {string} url - URL to open in new tab
   * @returns {number} - New tab ID
   */
  async createNewTab(url) {
    const tab = await new Promise(resolve => {
      chrome.tabs.create({ url }, resolve);
    });
    
    await this.cdp.detach();
    await this.initialize(tab.id);
    return tab.id;
  }

  /**
   * Saves cookies to file if configured
   */
  async saveCookies() {
    if (!this.config.cookiesFile) return;

    const { cookies } = await this.cdp.sendCommand('Network.getAllCookies');
    await chrome.storage.local.set({
      [this.config.cookiesFile]: cookies,
    });
  }

  /**
   * Loads cookies from storage if available
   */
  async loadCookies() {
    if (!this.config.cookiesFile) return;

    const result = await chrome.storage.local.get(this.config.cookiesFile);
    const cookies = result[this.config.cookiesFile];
    
    if (cookies && cookies.length > 0) {
      for (const cookie of cookies) {
        await this.cdp.sendCommand('Network.setCookie', cookie);
      }
    }
  }

  /**
   * Closes the context and cleans up
   */
  async close() {
    if (this.cdp) {
      await this.saveCookies();
      await this.cdp.detach();
      this.cdp = null;
    }
    this.currentTabId = null;
    this.tabs.clear();
  }
}
