/**
 * Type definitions for telemetry events
 */

/**
 * @typedef {Object} ControllerRegisteredFunctionsTelemetryEvent
 * @property {'CONTROLLER_REGISTERED_FUNCTIONS'} name - Event name
 * @property {RegisteredFunction[]} registeredFunctions - Registered functions
 */

/**
 * @typedef {Object} RegisteredFunction
 * @property {string} name - Function name
 * @property {Object} params - Function parameters schema
 */

/**
 * @typedef {Object} BrowserActionTelemetryEvent
 * @property {'BROWSER_ACTION'} name - Event name
 * @property {string} action - Action name
 * @property {Object} params - Action parameters
 * @property {boolean} success - Whether action succeeded
 * @property {string} [error] - Error message if failed
 * @property {number} duration - Action duration in milliseconds
 */

export const TelemetryEventTypes = {
  CONTROLLER_REGISTERED_FUNCTIONS: 'CONTROLLER_REGISTERED_FUNCTIONS',
  BROWSER_ACTION: 'BROWSER_ACTION'
};
