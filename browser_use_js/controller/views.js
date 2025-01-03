/**
 * Type definitions for controller actions
 */

/**
 * @typedef {Object} ActionResult
 * @property {string} [error] - Error message if action failed
 * @property {string} [extractedContent] - Extracted content from action
 * @property {boolean} [includeInMemory] - Whether to include in memory
 * @property {boolean} [isDone] - Whether this is the final action
 */

/**
 * Base action model
 */
export class ActionModel {
  /**
   * Validates action parameters
   * @returns {boolean} Whether parameters are valid
   */
  validate() {
    return true;
  }
}

/**
 * Search Google action parameters
 */
export class SearchGoogleAction extends ActionModel {
  /**
   * @param {string} query - Search query
   */
  constructor(query) {
    super();
    this.query = query;
  }

  validate() {
    return typeof this.query === 'string' && this.query.length > 0;
  }
}

/**
 * Navigate to URL action parameters
 */
export class GoToUrlAction extends ActionModel {
  /**
   * @param {string} url - URL to navigate to
   */
  constructor(url) {
    super();
    this.url = url;
  }

  validate() {
    try {
      new URL(this.url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Click element action parameters
 */
export class ClickElementAction extends ActionModel {
  /**
   * @param {number} index - Element index
   */
  constructor(index) {
    super();
    this.index = index;
  }

  validate() {
    return Number.isInteger(this.index) && this.index >= 0;
  }
}

/**
 * Input text action parameters
 */
export class InputTextAction extends ActionModel {
  /**
   * @param {number} index - Element index
   * @param {string} text - Text to input
   */
  constructor(index, text) {
    super();
    this.index = index;
    this.text = text;
  }

  validate() {
    return (
      Number.isInteger(this.index) &&
      this.index >= 0 &&
      typeof this.text === 'string'
    );
  }
}

/**
 * Switch tab action parameters
 */
export class SwitchTabAction extends ActionModel {
  /**
   * @param {number} pageId - Tab ID to switch to
   */
  constructor(pageId) {
    super();
    this.pageId = pageId;
  }

  validate() {
    return Number.isInteger(this.pageId);
  }
}

/**
 * Open tab action parameters
 */
export class OpenTabAction extends ActionModel {
  /**
   * @param {string} url - URL to open in new tab
   */
  constructor(url) {
    super();
    this.url = url;
  }

  validate() {
    try {
      new URL(this.url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Extract page content action parameters
 */
export class ExtractPageContentAction extends ActionModel {
  /**
   * @param {'text'|'markdown'} value - Output format
   */
  constructor(value = 'text') {
    super();
    this.value = value;
  }

  validate() {
    return ['text', 'markdown'].includes(this.value);
  }
}

/**
 * Done action parameters
 */
export class DoneAction extends ActionModel {
  /**
   * @param {string} text - Completion message
   */
  constructor(text) {
    super();
    this.text = text;
  }

  validate() {
    return typeof this.text === 'string';
  }
}

/**
 * Scroll action parameters
 */
export class ScrollAction extends ActionModel {
  /**
   * @param {number} [amount] - Scroll amount in pixels
   */
  constructor(amount = null) {
    super();
    this.amount = amount;
  }

  validate() {
    return this.amount === null || (Number.isInteger(this.amount) && this.amount > 0);
  }
}

/**
 * Send keys action parameters
 */
export class SendKeysAction extends ActionModel {
  /**
   * @param {string} keys - Keys to send
   */
  constructor(keys) {
    super();
    this.keys = keys;
  }

  validate() {
    return typeof this.keys === 'string' && this.keys.length > 0;
  }
}
