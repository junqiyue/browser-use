# Browser Module

This module provides browser automation functionality using Chrome DevTools Protocol (CDP) in a Chrome extension environment.

## Components

### Browser
Main class that manages browser contexts and provides high-level automation functions.

```javascript
const browser = new Browser({
  headless: false,
  disableSecurity: true
});

const context = await browser.newContext();
await browser.navigate('https://example.com', context);
```

### BrowserContext
Manages individual browser contexts with their own state, cookies, and configuration.

```javascript
const context = new BrowserContext({
  cookiesFile: 'cookies.json',
  waitBetweenActions: 1
});

await context.initialize(tabId);
await context.waitForNetworkIdle();
```

### CDPService
Low-level service that handles Chrome DevTools Protocol commands.

```javascript
const cdp = new CDPService();
await cdp.attach(tabId);
await cdp.sendCommand('Page.navigate', { url: 'https://example.com' });
```

## Features

- Tab management
- Cookie persistence
- Network idle detection
- Screenshot capture
- Mouse and keyboard input simulation
- DOM manipulation

## Error Handling

All CDP commands are wrapped with proper error handling and will throw detailed error objects when commands fail.

Example error object:
```javascript
{
  message: "Cannot find node with given id",
  code: "CDP_COMMAND_FAILED",
  data: {
    method: "DOM.querySelector",
    params: { nodeId: 123, selector: "#missing" }
  }
}
```
