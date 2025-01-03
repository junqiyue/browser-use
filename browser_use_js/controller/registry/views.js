/**
 * Type definitions for action registry
 */

import { ActionModel } from '../views.js';

/**
 * @typedef {Object} RegisteredAction
 * @property {string} name - Action name
 * @property {string} description - Action description
 * @property {Function} function - Action implementation
 * @property {typeof ActionModel} paramModel - Parameter model
 * @property {boolean} requiresBrowser - Whether action requires browser
 */

/**
 * Registry for browser automation actions
 */
export class ActionRegistry {
  constructor() {
    /** @type {Object.<string, RegisteredAction>} */
    this.actions = {};
  }

  /**
   * Gets description of all actions for prompt
   * @returns {string} Action descriptions
   */
  getPromptDescription() {
    const descriptions = [];
    for (const [name, action] of Object.entries(this.actions)) {
      const params = action.paramModel ? Object.keys(action.paramModel) : [];
      const paramStr = params.length ? ` Parameters: ${params.join(', ')}` : '';
      descriptions.push(`${name}: ${action.description}.${paramStr}`);
    }
    return descriptions.join('\n');
  }
}
