/**
 * Telemetry service for browser automation
 */

/**
 * @typedef {Object} TelemetryEvent
 * @property {string} name - Event name
 * @property {Object} [properties] - Event properties
 */

export class ProductTelemetry {
  constructor() {
    this.enabled = false;
    this.userId = null;
    this.debugMode = false;
    this.initialize();
  }

  /**
   * Initializes telemetry service
   */
  async initialize() {
    const config = await chrome.storage.sync.get([
      'telemetryEnabled',
      'telemetryUserId',
      'telemetryDebug'
    ]);

    this.enabled = config.telemetryEnabled ?? false;
    this.userId = config.telemetryUserId ?? this._generateUserId();
    this.debugMode = config.telemetryDebug ?? false;

    // Save user ID if not already saved
    if (!config.telemetryUserId) {
      await chrome.storage.sync.set({ telemetryUserId: this.userId });
    }

    if (this.debugMode) {
      console.debug('Telemetry initialized:', {
        enabled: this.enabled,
        userId: this.userId,
        debugMode: this.debugMode
      });
    }
  }

  /**
   * Captures telemetry event
   * @param {TelemetryEvent} event - Event to capture
   */
  async capture(event) {
    if (!this.enabled) return;

    const eventData = {
      name: event.name,
      properties: {
        ...event.properties,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: 'browser-extension'
      }
    };

    if (this.debugMode) {
      console.debug('Capturing telemetry event:', eventData);
    }

    try {
      // Send event to analytics endpoint
      // Note: Replace URL with actual analytics endpoint
      const response = await fetch('https://your-analytics-endpoint/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.statusText}`);
      }

      if (this.debugMode) {
        console.debug('Telemetry event captured successfully');
      }
    } catch (error) {
      console.error('Failed to capture telemetry event:', error);
      // Don't throw - telemetry failures shouldn't break functionality
    }
  }

  /**
   * Enables telemetry collection
   */
  async enable() {
    await chrome.storage.sync.set({ telemetryEnabled: true });
    this.enabled = true;
  }

  /**
   * Disables telemetry collection
   */
  async disable() {
    await chrome.storage.sync.set({ telemetryEnabled: false });
    this.enabled = false;
  }

  /**
   * Enables debug mode
   */
  async enableDebug() {
    await chrome.storage.sync.set({ telemetryDebug: true });
    this.debugMode = true;
  }

  /**
   * Disables debug mode
   */
  async disableDebug() {
    await chrome.storage.sync.set({ telemetryDebug: false });
    this.debugMode = false;
  }

  /**
   * Generates anonymous user ID
   * @returns {string} User ID
   * @private
   */
  _generateUserId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
