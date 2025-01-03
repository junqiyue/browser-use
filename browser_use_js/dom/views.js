/**
 * Type definitions for DOM module
 */

/**
 * @typedef {Object} DOMBaseNode
 * @property {DOMElementNode} [parent] - Parent element node
 */

/**
 * @typedef {Object} DOMTextNode
 * @property {'TEXT_NODE'} type - Node type identifier
 * @property {string} text - Text content
 * @property {boolean} isVisible - Whether the text is visible
 * @property {DOMElementNode} [parent] - Parent element node
 */

/**
 * @typedef {Object} DOMElementNode
 * @property {string} tagName - Element tag name
 * @property {string} xpath - XPath to element
 * @property {Object<string, string>} attributes - Element attributes
 * @property {Array<DOMBaseNode>} children - Child nodes
 * @property {boolean} isVisible - Whether element is visible
 * @property {boolean} isInteractive - Whether element is interactive
 * @property {boolean} isTopElement - Whether element is topmost at its position
 * @property {number} [highlightIndex] - Index for highlighting
 * @property {boolean} [shadowRoot] - Whether element has shadow root
 * @property {DOMElementNode} [parent] - Parent element node
 */

/**
 * @typedef {Object} DOMState
 * @property {DOMElementNode} elementTree - Root of DOM tree
 * @property {Object<number, DOMElementNode>} selectorMap - Map of highlight indices to elements
 */

/**
 * @typedef {Object} SelectorMap
 * @property {Object<number, DOMElementNode>} [key: number] - Map of highlight indices to elements
 */

export class DOMElementNode {
  /**
   * @param {Object} params - Node parameters
   * @param {string} params.tagName - Element tag name
   * @param {string} params.xpath - XPath to element
   * @param {Object<string, string>} params.attributes - Element attributes
   * @param {Array<DOMBaseNode>} params.children - Child nodes
   * @param {boolean} params.isVisible - Whether element is visible
   * @param {boolean} params.isInteractive - Whether element is interactive
   * @param {boolean} params.isTopElement - Whether element is topmost at its position
   * @param {number} [params.highlightIndex] - Index for highlighting
   * @param {boolean} [params.shadowRoot] - Whether element has shadow root
   * @param {DOMElementNode} [params.parent] - Parent element node
   */
  constructor({
    tagName,
    xpath,
    attributes = {},
    children = [],
    isVisible = false,
    isInteractive = false,
    isTopElement = false,
    highlightIndex = null,
    shadowRoot = false,
    parent = null
  }) {
    this.tagName = tagName;
    this.xpath = xpath;
    this.attributes = attributes;
    this.children = children;
    this.isVisible = isVisible;
    this.isInteractive = isInteractive;
    this.isTopElement = isTopElement;
    this.highlightIndex = highlightIndex;
    this.shadowRoot = shadowRoot;
    this.parent = parent;
  }

  /**
   * Gets all text content until next clickable element
   * @returns {string} Combined text content
   */
  getAllTextTillNextClickableElement() {
    const texts = [];
    
    function traverse(node) {
      if (!node) return false;
      
      if ('text' in node) {
        texts.push(node.text);
      } else if (node.isInteractive && node.highlightIndex !== null) {
        return true;
      }
      
      if ('children' in node) {
        for (const child of node.children) {
          if (traverse(child)) return true;
        }
      }
      return false;
    }

    traverse(this);
    return texts.join(' ').trim();
  }

  /**
   * Converts clickable elements to string representation
   * @param {string[]} includeAttributes - Attributes to include in output
   * @returns {string} String representation of clickable elements
   */
  clickableElementsToString(includeAttributes = []) {
    const elements = [];
    
    function traverse(node) {
      if (!node) return;
      
      if (node.highlightIndex !== null) {
        let str = `${node.highlightIndex}[:]<${node.tagName}>`;
        
        // Add selected attributes
        if (includeAttributes.length > 0) {
          const attrs = includeAttributes
            .map(attr => node.attributes[attr])
            .filter(Boolean)
            .join(' ');
          if (attrs) str += attrs + ' ';
        }
        
        // Add text content
        const text = node.getAllTextTillNextClickableElement();
        if (text) str += text;
        
        str += `</${node.tagName}>`;
        elements.push(str);
      }
      
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }

    traverse(this);
    return elements.join('\n');
  }
}

export class DOMTextNode {
  /**
   * @param {Object} params - Node parameters
   * @param {string} params.text - Text content
   * @param {boolean} params.isVisible - Whether text is visible
   * @param {DOMElementNode} [params.parent] - Parent element node
   */
  constructor({
    text,
    isVisible = false,
    parent = null
  }) {
    this.type = 'TEXT_NODE';
    this.text = text;
    this.isVisible = isVisible;
    this.parent = parent;
  }
}
