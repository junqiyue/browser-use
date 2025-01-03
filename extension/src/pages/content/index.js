// Content script for DOM manipulation and messaging
console.log('Content script loaded');

// Helper function to find elements by various selectors
function findElement(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error('Invalid selector:', selector);
    return null;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'findElement':
      const element = findElement(request.selector);
      sendResponse({ 
        exists: !!element,
        rect: element ? element.getBoundingClientRect().toJSON() : null 
      });
      break;
    case 'getPageInfo':
      sendResponse({
        url: window.location.href,
        title: document.title,
        readyState: document.readyState
      });
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
  return true;
});
