/**
 * History tree processor for tracking DOM changes
 */

import { createHash } from 'crypto';

/**
 * @typedef {Object} DOMHistoryElement
 * @property {string} tagName - Element tag name
 * @property {string} xpath - XPath to element
 * @property {number} [highlightIndex] - Index for highlighting
 * @property {string[]} entireParentBranchPath - Full path of parent elements
 * @property {Object<string, string>} attributes - Element attributes
 * @property {boolean} [shadowRoot] - Whether element has shadow root
 */

/**
 * @typedef {Object} HashedDomElement
 * @property {string} branchPathHash - Hash of parent branch path
 * @property {string} attributesHash - Hash of element attributes
 */

export class HistoryTreeProcessor {
  /**
   * Converts DOM element to history element
   * @param {import('../views.js').DOMElementNode} domElement - DOM element
   * @returns {DOMHistoryElement} History element
   */
  static convertDomElementToHistoryElement(domElement) {
    const parentBranchPath = HistoryTreeProcessor._getParentBranchPath(domElement);
    return {
      tagName: domElement.tagName,
      xpath: domElement.xpath,
      highlightIndex: domElement.highlightIndex,
      entireParentBranchPath: parentBranchPath,
      attributes: domElement.attributes,
      shadowRoot: domElement.shadowRoot
    };
  }

  /**
   * Finds history element in DOM tree
   * @param {DOMHistoryElement} domHistoryElement - History element to find
   * @param {import('../views.js').DOMElementNode} tree - DOM tree to search
   * @returns {import('../views.js').DOMElementNode|null} Found element
   */
  static findHistoryElementInTree(domHistoryElement, tree) {
    const hashedDomHistoryElement = HistoryTreeProcessor._hashDomHistoryElement(
      domHistoryElement
    );

    function processNode(node) {
      if (node.highlightIndex !== null) {
        const hashedNode = HistoryTreeProcessor._hashDomElement(node);
        if (
          hashedNode.branchPathHash === hashedDomHistoryElement.branchPathHash &&
          hashedNode.attributesHash === hashedDomHistoryElement.attributesHash
        ) {
          return node;
        }
      }
      
      for (const child of node.children) {
        if (child instanceof DOMElementNode) {
          const result = processNode(child);
          if (result) return result;
        }
      }
      
      return null;
    }

    return processNode(tree);
  }

  /**
   * Compares history element with DOM element
   * @param {DOMHistoryElement} domHistoryElement - History element
   * @param {import('../views.js').DOMElementNode} domElement - DOM element
   * @returns {boolean} Whether elements match
   */
  static compareHistoryElementAndDomElement(domHistoryElement, domElement) {
    const hashedDomHistoryElement = HistoryTreeProcessor._hashDomHistoryElement(
      domHistoryElement
    );
    const hashedDomElement = HistoryTreeProcessor._hashDomElement(domElement);

    return (
      hashedDomHistoryElement.branchPathHash === hashedDomElement.branchPathHash &&
      hashedDomHistoryElement.attributesHash === hashedDomElement.attributesHash
    );
  }

  /**
   * Gets parent branch path for element
   * @param {import('../views.js').DOMElementNode} domElement - DOM element
   * @returns {string[]} Parent branch path
   * @private
   */
  static _getParentBranchPath(domElement) {
    const parents = [];
    let currentElement = domElement;
    
    while (currentElement.parent) {
      parents.push(currentElement);
      currentElement = currentElement.parent;
    }

    parents.reverse();
    return parents.map(parent => parent.tagName);
  }

  /**
   * Hashes DOM history element
   * @param {DOMHistoryElement} domHistoryElement - History element
   * @returns {HashedDomElement} Hashed element
   * @private
   */
  static _hashDomHistoryElement(domHistoryElement) {
    const branchPathHash = HistoryTreeProcessor._parentBranchPathHash(
      domHistoryElement.entireParentBranchPath
    );
    const attributesHash = HistoryTreeProcessor._attributesHash(
      domHistoryElement.attributes
    );

    return { branchPathHash, attributesHash };
  }

  /**
   * Hashes DOM element
   * @param {import('../views.js').DOMElementNode} domElement - DOM element
   * @returns {HashedDomElement} Hashed element
   * @private
   */
  static _hashDomElement(domElement) {
    const parentBranchPath = HistoryTreeProcessor._getParentBranchPath(domElement);
    const branchPathHash = HistoryTreeProcessor._parentBranchPathHash(parentBranchPath);
    const attributesHash = HistoryTreeProcessor._attributesHash(domElement.attributes);

    return { branchPathHash, attributesHash };
  }

  /**
   * Hashes parent branch path
   * @param {string[]} parentBranchPath - Parent branch path
   * @returns {string} Hash
   * @private
   */
  static _parentBranchPathHash(parentBranchPath) {
    const parentBranchPathString = parentBranchPath.join('/');
    return createHash('sha256').update(parentBranchPathString).digest('hex');
  }

  /**
   * Hashes element attributes
   * @param {Object<string, string>} attributes - Element attributes
   * @returns {string} Hash
   * @private
   */
  static _attributesHash(attributes) {
    const attributesString = Object.entries(attributes)
      .map(([key, value]) => `${key}=${value}`)
      .join('');
    return createHash('sha256').update(attributesString).digest('hex');
  }
}
