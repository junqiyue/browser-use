/**
 * Service for registering and managing actions
 */

/**
 * @typedef {import('./views.js').RegisteredAction} RegisteredAction
 */

import { ActionRegistry } from './views.js';
import { ActionModel } from '../views.js';

export class Registry {
  constructor() {
    this.registry = new ActionRegistry();
  }

  /**
   * Creates parameter model from function
   * @param {Function} func - Function to create model for
   * @returns {typeof ActionModel} Parameter model
   * @private
   */
  _createParamModel(func) {
    // Get parameter names from function
    const params = new Proxy({}, {
      get: () => undefined
    });

    // Create dynamic model class
    return class extends ActionModel {
      constructor(params) {
        super();
        Object.assign(this, params);
      }
    };
  }

  /**
   * Decorator for registering actions
   * @param {string} description - Action description
   * @param {typeof ActionModel} [paramModel] - Parameter model
   * @param {boolean} [requiresBrowser=false] - Whether action requires browser
   * @returns {Function} Decorator function
   */
  action(description, paramModel = null, requiresBrowser = false) {
    return (func) => {
      // Create param model from function if not provided
      const actualParamModel = paramModel || this._createParamModel(func);

      const action = {
        name: func.name,
        description,
        function: func,
        paramModel: actualParamModel,
        requiresBrowser
      };

      this.registry.actions[func.name] = action;
      return func;
    };
  }

  /**
   * Executes registered action
   * @param {string} actionName - Action name
   * @param {Object} params - Action parameters
   * @param {import('../../../browser/context.js').BrowserContext} [browser] - Browser context
   * @returns {Promise<any>} Action result
   */
  async executeAction(actionName, params, browser = null) {
    if (!(actionName in this.registry.actions)) {
      throw new Error(`Action ${actionName} not found`);
    }

    const action = this.registry.actions[actionName];
    try {
      // Validate parameters using model
      const validatedParams = new action.paramModel(params);
      if (!validatedParams.validate()) {
        throw new Error(`Invalid parameters for action ${actionName}`);
      }

      // Execute action with browser if required
      if (action.requiresBrowser) {
        if (!browser) {
          throw new Error(
            `Action ${actionName} requires browser but none provided`
          );
        }
        return await action.function(validatedParams, browser);
      }

      return await action.function(validatedParams);
    } catch (error) {
      throw new Error(`Error executing action ${actionName}: ${error.message}`);
    }
  }

  /**
   * Creates action model from registry
   * @returns {typeof ActionModel} Action model
   */
  createActionModel() {
    return class extends ActionModel {
      constructor(params) {
        super();
        Object.assign(this, params);
      }
    };
  }

  /**
   * Gets description of all actions for prompt
   * @returns {string} Action descriptions
   */
  getPromptDescription() {
    return this.registry.getPromptDescription();
  }
}
