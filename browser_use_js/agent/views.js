/**
 * Type definitions for agent module
 */

/**
 * @typedef {Object} AgentStepInfo
 * @property {number} stepNumber - Current step number
 * @property {number} maxSteps - Maximum number of steps
 */

/**
 * @typedef {Object} ActionResult
 * @property {string} [error] - Error message if action failed
 * @property {string} [extractedContent] - Extracted content from action
 * @property {boolean} [includeInMemory] - Whether to include in memory
 * @property {boolean} [isDone] - Whether this is the final action
 */

/**
 * @typedef {Object} AgentHistory
 * @property {Object} modelOutput - Model output for the step
 * @property {ActionResult[]} result - Action results
 * @property {Object} state - Browser state
 */

/**
 * @typedef {Object} AgentHistoryList
 * @property {AgentHistory[]} history - List of history items
 */

/**
 * @typedef {Object} AgentOutput
 * @property {Object} current_state - Current agent state
 * @property {string} current_state.evaluation_previous_goal - Evaluation of previous goal
 * @property {string} current_state.memory - Agent memory
 * @property {string} current_state.next_goal - Next goal
 * @property {Object[]} action - List of actions to take
 */

/**
 * @typedef {Object} AgentError
 * @property {string} message - Error message
 * @property {string} [stack] - Error stack trace
 */

export const AgentError = {
  /**
   * Formats error message
   * @param {Error} error - Error to format
   * @param {boolean} includeTrace - Whether to include stack trace
   * @returns {string} Formatted error message
   */
  formatError(error, includeTrace = false) {
    const message = error.message || String(error);
    return includeTrace ? `${message}\n${error.stack}` : message;
  }
};
