/**
 * Controller for browser automation actions
 */

import { Registry } from './registry/service.js';
import { BrowserContext } from '../browser/context.js';
import { BackgroundMessageHandler } from './messages.js';
import {
  SearchGoogleAction,
  GoToUrlAction,
  ClickElementAction,
  InputTextAction,
  SwitchTabAction,
  OpenTabAction,
  ExtractPageContentAction,
  DoneAction,
  ScrollAction,
  SendKeysAction
} from './views.js';

export class Controller {
  constructor() {
    this.registry = new Registry();
    this._registerDefaultActions();
    this.messageHandler = new BackgroundMessageHandler(this);
  }

  /**
   * Registers all default browser actions
   * @private
   */
  _registerDefaultActions() {
    // Basic Navigation Actions
    this.registry.action(
      'Search Google in the current tab',
      SearchGoogleAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const page = await browser.getCurrentPage();
        await page.goto(`https://www.google.com/search?q=${params.query}`);
        await page.waitForLoadState();
        const msg = `🔍 Searched for "${params.query}" in Google`;
        console.info(msg);
        return { extractedContent: msg, includeInMemory: true };
      });
    });

    this.registry.action(
      'Navigate to URL in the current tab',
      GoToUrlAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const page = await browser.getCurrentPage();
        await page.goto(params.url);
        await page.waitForLoadState();
        const msg = `🔗 Navigated to ${params.url}`;
        console.info(msg);
        return { extractedContent: msg, includeInMemory: true };
      });
    });

    // Element Interaction Actions
    this.registry.action(
      'Click element',
      ClickElementAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const session = await browser.getSession();
        const state = session.cachedState;

        if (!(params.index in state.selectorMap)) {
          throw new Error(
            `Element with index ${params.index} does not exist - retry or use alternative actions`
          );
        }

        const elementNode = state.selectorMap[params.index];
        const initialPages = (await browser.context.pages()).length;

        if (await browser.isFileUploader(elementNode)) {
          const msg = `Index ${params.index} - has an element which opens file upload dialog. To upload files please use a specific function to upload files`;
          console.info(msg);
          return { extractedContent: msg, includeInMemory: true };
        }

        try {
          await browser.clickElementNode(elementNode);
          let msg = `🖱️ Clicked index ${params.index}`;
          console.info(msg);
          console.debug(`Element xpath: ${elementNode.xpath}`);

          const currentPages = await browser.context.pages();
          if (currentPages.length > initialPages) {
            const newTabMsg = 'New tab opened - switching to it';
            msg += ` - ${newTabMsg}`;
            console.info(newTabMsg);
            await browser.switchToTab(-1);
          }

          return { extractedContent: msg, includeInMemory: true };
        } catch (error) {
          console.warn(
            `Element no longer available with index ${params.index} - most likely the page changed`
          );
          return { error: error.message };
        }
      });
    });

    this.registry.action(
      'Input text into a input interactive element',
      InputTextAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const session = await browser.getSession();
        const state = session.cachedState;

        if (!(params.index in state.selectorMap)) {
          throw new Error(
            `Element index ${params.index} does not exist - retry or use alternative actions`
          );
        }

        const elementNode = state.selectorMap[params.index];
        await browser.inputTextElementNode(elementNode, params.text);
        const msg = `⌨️ Input "${params.text}" into index ${params.index}`;
        console.info(msg);
        console.debug(`Element xpath: ${elementNode.xpath}`);
        return { extractedContent: msg, includeInMemory: true };
      });
    });

    // Tab Management Actions
    this.registry.action(
      'Switch tab',
      SwitchTabAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        await browser.switchToTab(params.pageId);
        const page = await browser.getCurrentPage();
        await page.waitForLoadState();
        const msg = `🔄 Switched to tab ${params.pageId}`;
        console.info(msg);
        return { extractedContent: msg, includeInMemory: true };
      });
    });

    this.registry.action(
      'Open url in new tab',
      OpenTabAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        await browser.createNewTab(params.url);
        const msg = `🔗 Opened new tab with ${params.url}`;
        console.info(msg);
        return { extractedContent: msg, includeInMemory: true };
      });
    });

    // Content Actions
    this.registry.action(
      'Extract page content to get the text or markdown',
      ExtractPageContentAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const page = await browser.getCurrentPage();
        const content = await page.evaluate(() => {
          // Simple content extraction
          const article = document.querySelector('article');
          if (article) return article.innerText;
          
          // Fallback to main content
          const main = document.querySelector('main');
          if (main) return main.innerText;
          
          // Last resort - body content
          return document.body.innerText;
        });
        
        const msg = `📄 Extracted page content\n: ${content}\n`;
        console.info(msg);
        return { extractedContent: msg };
      });
    });

    this.registry.action('Complete task', DoneAction)(params => {
      return { isDone: true, extractedContent: params.text };
    });

    this.registry.action(
      'Scroll down the page by pixel amount - if no amount is specified, scroll down one page',
      ScrollAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const page = await browser.getCurrentPage();
        if (params.amount !== null) {
          await page.evaluate(`window.scrollBy(0, ${params.amount});`);
        } else {
          await page.keyboard.press('PageDown');
        }

        const amount = params.amount !== null ? `${params.amount} pixels` : 'one page';
        const msg = `🔍 Scrolled down the page by ${amount}`;
        console.info(msg);
        return { extractedContent: msg, includeInMemory: true };
      });
    });

    this.registry.action(
      'Scroll up the page by pixel amount - if no amount is specified, scroll up one page',
      ScrollAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const page = await browser.getCurrentPage();
        if (params.amount !== null) {
          await page.evaluate(`window.scrollBy(0, -${params.amount});`);
        } else {
          await page.keyboard.press('PageUp');
        }

        const amount = params.amount !== null ? `${params.amount} pixels` : 'one page';
        const msg = `🔍 Scrolled up the page by ${amount}`;
        console.info(msg);
        return { extractedContent: msg, includeInMemory: true };
      });
    });

    this.registry.action(
      'Send strings of special keys like Backspace, Insert, PageDown, Delete, Enter, Shortcuts such as `Control+o`, `Control+Shift+T` are supported as well.',
      SendKeysAction,
      true
    )((params, browser) => {
      return this._executeWithResult(async () => {
        const page = await browser.getCurrentPage();
        await page.keyboard.press(params.keys);
        const msg = `⌨️ Sent keys: ${params.keys}`;
        console.info(msg);
        return { extractedContent: msg, includeInMemory: true };
      });
    });
  }

  /**
   * Executes action with result handling
   * @param {Function} action - Action to execute
   * @returns {Promise<import('./views.js').ActionResult>} Action result
   * @private
   */
  async _executeWithResult(action) {
    try {
      return await action();
    } catch (error) {
      console.error('Action failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Executes multiple actions in sequence
   * @param {Object[]} actions - Actions to execute
   * @param {BrowserContext} [browser] - Browser context
   * @returns {Promise<import('./views.js').ActionResult[]>} Action results
   */
  async multiAct(actions, browser = null) {
    const results = [];
    for (const action of actions) {
      const result = await this.act(action, browser);
      results.push(result);
      if (result.error || result.isDone) break;
    }
    return results;
  }

  /**
   * Executes single action
   * @param {Object} action - Action to execute
   * @param {BrowserContext} [browser] - Browser context
   * @returns {Promise<import('./views.js').ActionResult>} Action result
   */
  async act(action, browser = null) {
    const actionName = Object.keys(action)[0];
    const params = action[actionName];
    return await this.registry.executeAction(actionName, params, browser);
  }
}
