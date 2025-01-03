/**
 * DOM service for browser automation
 */

import buildDomTree from './buildDomTree.js';
import { DOMElementNode, DOMTextNode } from './views.js';

export class DomService {
  /**
   * @param {Object} page - Chrome extension page context
   */
  constructor(page) {
    this.page = page;
    this.xpathCache = {};
  }

  /**
   * Gets clickable elements from the page
   * @param {boolean} [highlightElements=true] - Whether to highlight elements
   * @returns {Promise<import('./views.js').DOMState>} DOM state
   */
  async getClickableElements(highlightElements = true) {
    const elementTree = await this._buildDomTree(highlightElements);
    const selectorMap = this._createSelectorMap(elementTree);
    return { elementTree, selectorMap };
  }

  /**
   * Builds DOM tree using injected script
   * @param {boolean} highlightElements - Whether to highlight elements
   * @returns {Promise<DOMElementNode>} Root element node
   * @private
   */
  async _buildDomTree(highlightElements) {
    // Execute buildDomTree in page context
    const evalPage = await chrome.scripting.executeScript({
      target: { tabId: this.page.id },
      func: buildDomTree,
      args: [highlightElements]
    });

    const result = evalPage[0]?.result;
    if (!result) {
      throw new Error('Failed to build DOM tree');
    }

    const htmlToDict = this._parseNode(result);
    if (!htmlToDict || !(htmlToDict instanceof DOMElementNode)) {
      throw new Error('Failed to parse HTML to dictionary');
    }

    return htmlToDict;
  }

  /**
   * Creates selector map from element tree
   * @param {DOMElementNode} elementTree - Root element node
   * @returns {import('./views.js').SelectorMap} Selector map
   * @private
   */
  _createSelectorMap(elementTree) {
    const selectorMap = {};

    function processNode(node) {
      if (node instanceof DOMElementNode) {
        if (node.highlightIndex !== null) {
          selectorMap[node.highlightIndex] = node;
        }
        for (const child of node.children) {
          processNode(child);
        }
      }
    }

    processNode(elementTree);
    return selectorMap;
  }

  /**
   * Parses node data into DOM node objects
   * @param {Object} nodeData - Raw node data
   * @param {DOMElementNode} [parent] - Parent element node
   * @returns {DOMElementNode|DOMTextNode|null} Parsed node
   * @private
   */
  _parseNode(nodeData, parent = null) {
    if (!nodeData) return null;

    if (nodeData.type === 'TEXT_NODE') {
      return new DOMTextNode({
        text: nodeData.text,
        isVisible: nodeData.isVisible,
        parent
      });
    }

    const elementNode = new DOMElementNode({
      tagName: nodeData.tagName,
      xpath: nodeData.xpath,
      attributes: nodeData.attributes || {},
      children: [],
      isVisible: nodeData.isVisible || false,
      isInteractive: nodeData.isInteractive || false,
      isTopElement: nodeData.isTopElement || false,
      highlightIndex: nodeData.highlightIndex,
      shadowRoot: nodeData.shadowRoot || false,
      parent
    });

    const children = [];
    for (const child of nodeData.children || []) {
      if (child) {
        const childNode = this._parseNode(child, elementNode);
        if (childNode) {
          children.push(childNode);
        }
      }
    }

    elementNode.children = children;
    return elementNode;
  }
}
