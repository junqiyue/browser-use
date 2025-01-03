/**
 * Message manager for handling chat history and token tracking
 */

import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

/**
 * @typedef {Object} MessageMetadata
 * @property {number} inputTokens - Number of tokens in the message
 */

/**
 * @typedef {Object} MessageHistory
 * @property {Array<{message: Object, metadata: MessageMetadata}>} messages - List of messages with metadata
 * @property {number} totalTokens - Total tokens in history
 */

export class MessageManager {
  /**
   * @param {OpenAI|Anthropic} llm - Language model client
   * @param {string} task - Task description
   * @param {string} actionDescriptions - Available actions description
   * @param {typeof import('../prompts.js').SystemPrompt} systemPromptClass - System prompt class
   * @param {Object} options - Additional options
   */
  constructor(
    llm,
    task,
    actionDescriptions,
    systemPromptClass,
    options = {}
  ) {
    const {
      maxInputTokens = 128000,
      estimatedTokensPerCharacter = 3,
      imageTokens = 800,
      includeAttributes = [],
      maxErrorLength = 400,
      maxActionsPerStep = 10
    } = options;

    this.llm = llm;
    this.systemPromptClass = systemPromptClass;
    this.maxInputTokens = maxInputTokens;
    this.history = { messages: [], totalTokens: 0 };
    this.task = task;
    this.actionDescriptions = actionDescriptions;
    this.ESTIMATED_TOKENS_PER_CHARACTER = estimatedTokensPerCharacter;
    this.IMG_TOKENS = imageTokens;
    this.includeAttributes = includeAttributes;
    this.maxErrorLength = maxErrorLength;

    // Initialize with system message
    const systemPrompt = new systemPromptClass(
      this.actionDescriptions,
      maxActionsPerStep
    );
    const systemMessage = systemPrompt.getSystemMessage();
    this._addMessageWithTokens(systemMessage);
    this.systemPrompt = systemMessage;

    // Add task message
    const taskMessage = {
      role: 'user',
      content: `Your task is: ${task}`
    };
    this._addMessageWithTokens(taskMessage);
  }

  /**
   * Adds browser state as user message
   * @param {import('../prompts.js').BrowserState} state - Browser state
   * @param {Array<Object>} [result] - Previous action results
   * @param {import('../prompts.js').AgentStepInfo} [stepInfo] - Step information
   */
  addStateMessage(state, result = null, stepInfo = null) {
    // Handle memory-included results
    if (result) {
      for (const r of result) {
        if (r.includeInMemory) {
          if (r.extractedContent) {
            const msg = {
              role: 'user',
              content: String(r.extractedContent)
            };
            this._addMessageWithTokens(msg);
          }
          if (r.error) {
            const msg = {
              role: 'user',
              content: String(r.error).slice(-this.maxErrorLength)
            };
            this._addMessageWithTokens(msg);
          }
          result = null; // If result in history, don't add it again
        }
      }
    }

    // Add state message
    const stateMessage = new AgentMessagePrompt(
      state,
      result,
      this.includeAttributes,
      this.maxErrorLength,
      stepInfo
    ).getUserMessage();
    this._addMessageWithTokens(stateMessage);
  }

  /**
   * Removes the last state message from history
   */
  _removeLastStateMessage() {
    if (
      this.history.messages.length > 2 &&
      this.history.messages[this.history.messages.length - 1].message.role === 'user'
    ) {
      this._removeMessage();
    }
  }

  /**
   * Adds model output as assistant message
   * @param {Object} modelOutput - Model response
   */
  addModelOutput(modelOutput) {
    const content = JSON.stringify(modelOutput);
    const msg = {
      role: 'assistant',
      content
    };
    this._addMessageWithTokens(msg);
  }

  /**
   * Gets current message list
   * @returns {Array<Object>} List of messages
   */
  getMessages() {
    this.cutMessages();
    return this.history.messages.map(m => m.message);
  }

  /**
   * Trims messages to fit within token limit
   */
  cutMessages() {
    const diff = this.history.totalTokens - this.maxInputTokens;
    if (diff <= 0) return;

    const lastMsg = this.history.messages[this.history.messages.length - 1];

    // Remove image if present
    if (Array.isArray(lastMsg.message.content)) {
      let text = '';
      for (const item of lastMsg.message.content) {
        if ('image_url' in item) {
          lastMsg.message.content = lastMsg.message.content.filter(i => i !== item);
          lastMsg.metadata.inputTokens -= this.IMG_TOKENS;
          this.history.totalTokens -= this.IMG_TOKENS;
          console.debug(
            `Removed image with ${this.IMG_TOKENS} tokens - total tokens now: ${this.history.totalTokens}/${this.maxInputTokens}`
          );
        } else if ('text' in item) {
          text += item.text;
        }
      }
      lastMsg.message.content = text;
      this.history.messages[this.history.messages.length - 1] = lastMsg;
    }

    if (this.history.totalTokens - this.maxInputTokens <= 0) return;

    // Remove text proportionally if still over limit
    const proportionToRemove = diff / lastMsg.metadata.inputTokens;
    if (proportionToRemove > 0.99) {
      throw new Error(
        'Max token limit reached - history is too long - reduce the system prompt or task less tasks or remove old messages. ' +
        `proportion_to_remove: ${proportionToRemove}`
      );
    }

    console.debug(
      `Removing ${proportionToRemove * 100}% of the last message (${
        proportionToRemove * lastMsg.metadata.inputTokens
      } / ${lastMsg.metadata.inputTokens} tokens)`
    );

    const content = lastMsg.message.content;
    const charactersToRemove = Math.floor(content.length * proportionToRemove);
    const newContent = content.slice(0, -charactersToRemove);

    // Remove old message and add trimmed version
    this._removeMessage();
    const msg = {
      role: 'user',
      content: newContent
    };
    this._addMessageWithTokens(msg);

    console.debug(
      `Added message with ${
        this.history.messages[this.history.messages.length - 1].metadata.inputTokens
      } tokens - total tokens now: ${this.history.totalTokens}/${
        this.maxInputTokens
      } - total messages: ${this.history.messages.length}`
    );
  }

  /**
   * Adds message with token count metadata
   * @param {Object} message - Message to add
   */
  _addMessageWithTokens(message) {
    const tokenCount = this._countTokens(message);
    const metadata = { inputTokens: tokenCount };
    this.history.messages.push({ message, metadata });
    this.history.totalTokens += tokenCount;
  }

  /**
   * Removes message from history
   * @param {number} [index] - Index to remove, defaults to last message
   */
  _removeMessage(index = -1) {
    const msg = this.history.messages[index];
    this.history.totalTokens -= msg.metadata.inputTokens;
    this.history.messages.splice(index, 1);
  }

  /**
   * Counts tokens in a message
   * @param {Object} message - Message to count tokens for
   * @returns {number} Token count
   */
  _countTokens(message) {
    let tokens = 0;
    if (Array.isArray(message.content)) {
      for (const item of message.content) {
        if ('image_url' in item) {
          tokens += this.IMG_TOKENS;
        } else if ('text' in item) {
          tokens += this._countTextTokens(item.text);
        }
      }
    } else {
      tokens += this._countTextTokens(message.content);
    }
    return tokens;
  }

  /**
   * Counts tokens in text
   * @param {string} text - Text to count tokens for
   * @returns {number} Token count
   */
  _countTextTokens(text) {
    try {
      if (this.llm instanceof OpenAI) {
        return this.llm.tokenCount(text);
      } else if (this.llm instanceof Anthropic) {
        return this.llm.countTokens(text);
      }
    } catch (e) {
      console.warn('Error counting tokens:', e);
    }
    // Fallback to character-based estimation
    return Math.floor(text.length / this.ESTIMATED_TOKENS_PER_CHARACTER);
  }
}
