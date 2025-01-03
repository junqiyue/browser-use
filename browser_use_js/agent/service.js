/**
 * Browser automation agent implementation
 */

import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { SystemPrompt } from './prompts.js';
import { MessageManager } from './message_manager/service.js';
import { Browser } from '../browser/browser.js';
import { BrowserContext } from '../browser/context.js';
import { Controller } from '../controller/service.js';

/**
 * @typedef {Object} AgentConfig
 * @property {boolean} [useVision=true] - Whether to use vision capabilities
 * @property {string} [saveConversationPath] - Path to save conversation history
 * @property {number} [maxFailures=5] - Maximum number of consecutive failures
 * @property {number} [retryDelay=10] - Delay between retries in seconds
 * @property {typeof SystemPrompt} [systemPromptClass=SystemPrompt] - System prompt class
 * @property {number} [maxInputTokens=128000] - Maximum input tokens
 * @property {boolean} [validateOutput=false] - Whether to validate LLM output
 * @property {boolean} [generateGif=true] - Whether to generate step GIFs
 * @property {string[]} [includeAttributes] - Attributes to include in element descriptions
 * @property {number} [maxErrorLength=400] - Maximum length for error messages
 * @property {number} [maxActionsPerStep=10] - Maximum actions per step
 */

/**
 * @typedef {Object} ActionResult
 * @property {string} [error] - Error message if action failed
 * @property {string} [extractedContent] - Extracted content from action
 * @property {boolean} [includeInMemory] - Whether to include in memory
 * @property {boolean} [isDone] - Whether this is the final action
 */

export class Agent {
  /**
   * @param {string} task - Task description
   * @param {OpenAI|Anthropic} llm - Language model client
   * @param {Browser} [browser] - Browser instance
   * @param {BrowserContext} [browserContext] - Browser context
   * @param {Controller} [controller] - Controller instance
   * @param {AgentConfig} [config] - Agent configuration
   */
  constructor(
    task,
    llm,
    browser = null,
    browserContext = null,
    controller = new Controller(),
    config = {}
  ) {
    const {
      useVision = true,
      saveConversationPath = null,
      maxFailures = 5,
      retryDelay = 10,
      systemPromptClass = SystemPrompt,
      maxInputTokens = 128000,
      validateOutput = false,
      generateGif = true,
      includeAttributes = [
        'title',
        'type',
        'name',
        'role',
        'tabindex',
        'aria-label',
        'placeholder',
        'value',
        'alt',
        'aria-expanded'
      ],
      maxErrorLength = 400,
      maxActionsPerStep = 10
    } = config;

    this.agentId = uuidv4();
    this.task = task;
    this.useVision = useVision;
    this.llm = llm;
    this.saveConversationPath = saveConversationPath;
    this.lastResult = null;
    this.includeAttributes = includeAttributes;
    this.maxErrorLength = maxErrorLength;
    this.generateGif = generateGif;
    this.controller = controller;
    this.maxActionsPerStep = maxActionsPerStep;

    // Browser setup
    this.injectedBrowser = browser !== null;
    this.injectedBrowserContext = browserContext !== null;
    
    // Initialize browser if needed
    this.browser = browser || (browserContext ? null : new Browser());
    
    // Initialize browser context
    if (browserContext) {
      this.browserContext = browserContext;
    } else if (this.browser) {
      this.browserContext = new BrowserContext(this.browser.config);
    } else {
      this.browser = new Browser();
      this.browserContext = new BrowserContext(this.browser.config);
    }

    this.systemPromptClass = systemPromptClass;

    // Action and output models setup
    this._setupActionModels();

    this.maxInputTokens = maxInputTokens;

    this.messageManager = new MessageManager(
      this.llm,
      this.task,
      this.controller.registry.getPromptDescription(),
      this.systemPromptClass,
      {
        maxInputTokens,
        includeAttributes,
        maxErrorLength,
        maxActionsPerStep
      }
    );

    // Tracking variables
    this.history = { history: [] };
    this.nSteps = 1;
    this.consecutiveFailures = 0;
    this.maxFailures = maxFailures;
    this.retryDelay = retryDelay;
    this.validateOutput = validateOutput;

    if (saveConversationPath) {
      console.log(`Saving conversation to ${saveConversationPath}`);
    }
  }

  /**
   * Sets up action models from controller's registry
   * @private
   */
  _setupActionModels() {
    this.ActionModel = this.controller.registry.createActionModel();
    this.AgentOutput = this.controller.registry.createOutputModel(this.ActionModel);
  }

  /**
   * Executes one step of the task
   * @param {Object} [stepInfo] - Step information
   */
  async step(stepInfo = null) {
    console.log(`\n📍 Step ${this.nSteps}`);
    let state = null;
    let modelOutput = null;
    let result = [];

    try {
      state = await this.browserContext.getState(this.useVision);
      this.messageManager.addStateMessage(state, this.lastResult, stepInfo);
      const inputMessages = this.messageManager.getMessages();
      modelOutput = await this.getNextAction(inputMessages);
      this._saveConversation(inputMessages, modelOutput);
      this.messageManager._removeLastStateMessage();
      this.messageManager.addModelOutput(modelOutput);

      result = await this.controller.multiAct(
        modelOutput.action,
        this.browserContext
      );
      this.lastResult = result;

      if (result.length > 0 && result[result.length - 1].isDone) {
        console.log(`📄 Result: ${result[result.length - 1].extractedContent}`);
      }

      this.consecutiveFailures = 0;
    } catch (error) {
      result = this._handleStepError(error);
      this.lastResult = result;
    } finally {
      if (!result.length) return;
      
      for (const r of result) {
        if (r.error) {
          await this._captureTelemetry('agent_step_error', {
            agentId: this.agentId,
            error: r.error
          });
        }
      }
      
      if (state) {
        this._makeHistoryItem(modelOutput, state, result);
      }
    }
  }

  /**
   * Handles step errors
   * @param {Error} error - Error to handle
   * @returns {ActionResult[]} Error result
   * @private
   */
  _handleStepError(error) {
    const includeTrace = console.debugEnabled;
    const errorMsg = this._formatError(error, includeTrace);
    const prefix = `❌ Result failed ${this.consecutiveFailures + 1}/${this.maxFailures} times:\n `;

    if (error instanceof Error && error.message.includes('validation failed')) {
      console.error(`${prefix}${errorMsg}`);
      if (error.message.includes('Max token limit reached')) {
        this.messageManager.maxInputTokens = this.maxInputTokens - 500;
        console.log(
          `Cutting tokens from history - new max input tokens: ${this.messageManager.maxInputTokens}`
        );
        this.messageManager.cutMessages();
      }
      this.consecutiveFailures++;
    } else if (error.name === 'RateLimitError') {
      console.warn(`${prefix}${errorMsg}`);
      setTimeout(() => {}, this.retryDelay * 1000);
      this.consecutiveFailures++;
    } else {
      console.error(`${prefix}${errorMsg}`);
      this.consecutiveFailures++;
    }

    return [{ error: errorMsg, includeInMemory: true }];
  }

  /**
   * Creates and stores history item
   * @param {Object} modelOutput - Model output
   * @param {Object} state - Browser state
   * @param {ActionResult[]} result - Action results
   * @private
   */
  _makeHistoryItem(modelOutput, state, result) {
    const interactedElements = modelOutput
      ? this._getInteractedElements(modelOutput, state.selectorMap)
      : [null];

    const stateHistory = {
      url: state.url,
      title: state.title,
      tabs: state.tabs,
      interactedElements,
      screenshot: state.screenshot
    };

    const historyItem = {
      modelOutput,
      result,
      state: stateHistory
    };

    this.history.history.push(historyItem);
  }

  /**
   * Gets next action from LLM
   * @param {Array<Object>} inputMessages - Input messages
   * @returns {Promise<Object>} Model output
   * @private
   */
  async getNextAction(inputMessages) {
    let response;
    if (this.llm instanceof OpenAI) {
      response = await this.llm.chat.completions.create({
        messages: inputMessages,
        model: 'gpt-4-vision-preview',
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      response = JSON.parse(response.choices[0].message.content);
    } else if (this.llm instanceof Anthropic) {
      response = await this.llm.messages.create({
        messages: inputMessages,
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      response = JSON.parse(response.content[0].text);
    }

    // Validate and parse response
    response.action = response.action.slice(0, this.maxActionsPerStep);
    this._logResponse(response);
    return response;
  }

  /**
   * Logs model response
   * @param {Object} response - Model response
   * @private
   */
  _logResponse(response) {
    console.log('\n🤖 Agent response:');
    console.log('Current state:');
    console.log(` Evaluation: ${response.current_state.evaluation_previous_goal}`);
    console.log(` Memory: ${response.current_state.memory}`);
    console.log(` Next goal: ${response.current_state.next_goal}`);
    console.log('Actions:');
    response.action.forEach((action, i) => {
      console.log(` ${i + 1}. ${JSON.stringify(action)}`);
    });
  }

  /**
   * Saves conversation history
   * @param {Array<Object>} messages - Input messages
   * @param {Object} response - Model response
   * @private
   */
  _saveConversation(messages, response) {
    if (!this.saveConversationPath) return;

    const conversation = {
      messages,
      response
    };

    // Use chrome.storage for persistence
    chrome.storage.local.set({
      [`conversation_${this.agentId}`]: conversation
    });
  }

  /**
   * Formats error message
   * @param {Error} error - Error to format
   * @param {boolean} includeTrace - Whether to include stack trace
   * @returns {string} Formatted error message
   * @private
   */
  _formatError(error, includeTrace = false) {
    const message = error.message || String(error);
    return includeTrace ? `${message}\n${error.stack}` : message;
  }

  /**
   * Gets interacted elements from model output
   * @param {Object} modelOutput - Model output
   * @param {Object} selectorMap - Selector map
   * @returns {Array<Object>} Interacted elements
   * @private
   */
  _getInteractedElements(modelOutput, selectorMap) {
    const elements = [];
    for (const action of modelOutput.action) {
      const actionName = Object.keys(action)[0];
      const params = action[actionName];
      if (params && params.index && selectorMap[params.index]) {
        elements.push(selectorMap[params.index]);
      }
    }
    return elements;
  }

  /**
   * Captures telemetry event
   * @param {string} eventName - Event name
   * @param {Object} properties - Event properties
   * @private
   */
  async _captureTelemetry(eventName, properties) {
    // Use chrome.storage for anonymous user ID
    const { anonymousId } = await chrome.storage.local.get('anonymousId');
    const userId = anonymousId || uuidv4();
    if (!anonymousId) {
      await chrome.storage.local.set({ anonymousId: userId });
    }

    // Send telemetry event
    const event = {
      event: eventName,
      properties: {
        ...properties,
        userId,
        timestamp: new Date().toISOString()
      }
    };

    try {
      await fetch('https://telemetry.example.com/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.warn('Failed to send telemetry:', error);
    }
  }
}
