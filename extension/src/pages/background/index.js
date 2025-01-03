// Background script for handling CDP (Chrome DevTools Protocol)
class BrowserAutomation {
  constructor() {
    this.debuggee = null;
    this.targetTabId = null;
  }

  async attach(tabId) {
    if (this.debuggee) {
      await this.detach();
    }

    this.targetTabId = tabId;
    this.debuggee = { tabId };

    try {
      await chrome.debugger.attach(this.debuggee, "1.3");
      await chrome.debugger.sendCommand(this.debuggee, "DOM.enable");
      await chrome.debugger.sendCommand(this.debuggee, "Page.enable");
      console.log('CDP attached successfully');
      return true;
    } catch (error) {
      console.error('Failed to attach debugger:', error);
      this.debuggee = null;
      this.targetTabId = null;
      return false;
    }
  }

  async detach() {
    if (this.debuggee) {
      try {
        await chrome.debugger.detach(this.debuggee);
      } catch (error) {
        console.error('Failed to detach debugger:', error);
      }
      this.debuggee = null;
      this.targetTabId = null;
    }
  }

  async click(selector) {
    if (!this.debuggee) return false;

    try {
      // Find the element
      const { root: { nodeId: documentNodeId } } = await chrome.debugger.sendCommand(
        this.debuggee,
        "DOM.getDocument"
      );

      const { nodeId } = await chrome.debugger.sendCommand(
        this.debuggee,
        "DOM.querySelector",
        {
          nodeId: documentNodeId,
          selector
        }
      );

      if (!nodeId) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Get element location
      const { model: { content } } = await chrome.debugger.sendCommand(
        this.debuggee,
        "DOM.getBoxModel",
        { nodeId }
      );

      const [x, y] = content;

      // Simulate click
      await chrome.debugger.sendCommand(this.debuggee, "Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: Math.floor(x),
        y: Math.floor(y),
        button: "left",
        clickCount: 1
      });

      await chrome.debugger.sendCommand(this.debuggee, "Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: Math.floor(x),
        y: Math.floor(y),
        button: "left",
        clickCount: 1
      });

      return true;
    } catch (error) {
      console.error('Click operation failed:', error);
      return false;
    }
  }

  async type(selector, text) {
    if (!this.debuggee) return false;

    try {
      // Focus the element first
      const { root: { nodeId: documentNodeId } } = await chrome.debugger.sendCommand(
        this.debuggee,
        "DOM.getDocument"
      );

      const { nodeId } = await chrome.debugger.sendCommand(
        this.debuggee,
        "DOM.querySelector",
        {
          nodeId: documentNodeId,
          selector
        }
      );

      if (!nodeId) {
        throw new Error(`Element not found: ${selector}`);
      }

      await chrome.debugger.sendCommand(this.debuggee, "DOM.focus", { nodeId });

      // Type the text
      for (const char of text) {
        await chrome.debugger.sendCommand(this.debuggee, "Input.dispatchKeyEvent", {
          type: "keyDown",
          text: char
        });
        await chrome.debugger.sendCommand(this.debuggee, "Input.dispatchKeyEvent", {
          type: "keyUp",
          text: char
        });
      }

      return true;
    } catch (error) {
      console.error('Type operation failed:', error);
      return false;
    }
  }

  async screenshot() {
    if (!this.debuggee) return null;

    try {
      const { data } = await chrome.debugger.sendCommand(
        this.debuggee,
        "Page.captureScreenshot",
        { format: "png", quality: 100 }
      );
      return data;
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  }
}

// Create automation instance
const automation = new BrowserAutomation();

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    switch (request.action) {
      case 'attach':
        const success = await automation.attach(request.tabId);
        sendResponse({ success });
        break;
      case 'detach':
        await automation.detach();
        sendResponse({ success: true });
        break;
      case 'click':
        const clickResult = await automation.click(request.selector);
        sendResponse({ success: clickResult });
        break;
      case 'type':
        const typeResult = await automation.type(request.selector, request.text);
        sendResponse({ success: typeResult });
        break;
      case 'screenshot':
        const screenshotData = await automation.screenshot();
        sendResponse({ success: !!screenshotData, data: screenshotData });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  })();
  return true; // Keep the message channel open for async response
});
