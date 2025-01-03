import React, { useState, useEffect } from 'react';
import { Layout, Button, Input, Space, message } from 'antd';
import './App.less';

const { Header, Content } = Layout;

const App = () => {
  const [isAttached, setIsAttached] = useState(false);
  const [selector, setSelector] = useState('');
  const [inputText, setInputText] = useState('');
  const [currentTabId, setCurrentTabId] = useState(null);

  useEffect(() => {
    // Get current tab when popup opens
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setCurrentTabId(tabs[0].id);
      }
    });
  }, []);

  const handleAttach = async () => {
    if (!currentTabId) {
      message.error('No active tab found');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'attach',
      tabId: currentTabId
    });

    if (response.success) {
      setIsAttached(true);
      message.success('Debugger attached successfully');
    } else {
      message.error('Failed to attach debugger');
    }
  };

  const handleDetach = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'detach' });
    if (response.success) {
      setIsAttached(false);
      message.success('Debugger detached successfully');
    } else {
      message.error('Failed to detach debugger');
    }
  };

  const handleClick = async () => {
    if (!selector) {
      message.warning('Please enter a selector');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'click',
      selector
    });

    if (response.success) {
      message.success('Click operation successful');
    } else {
      message.error('Click operation failed');
    }
  };

  const handleType = async () => {
    if (!selector || !inputText) {
      message.warning('Please enter both selector and text');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'type',
      selector,
      text: inputText
    });

    if (response.success) {
      message.success('Type operation successful');
    } else {
      message.error('Type operation failed');
    }
  };

  const handleScreenshot = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'screenshot' });
    if (response.success && response.data) {
      // Create a download link for the screenshot
      const link = document.createElement('a');
      link.download = `screenshot-${Date.now()}.png`;
      link.href = `data:image/png;base64,${response.data}`;
      link.click();
      message.success('Screenshot saved');
    } else {
      message.error('Screenshot failed');
    }
  };

  return (
    <Layout className="popup-container">
      <Header className="header">
        <h1>Browser Automation</h1>
      </Header>
      <Content className="content">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button
            type={isAttached ? "danger" : "primary"}
            onClick={isAttached ? handleDetach : handleAttach}
            block
          >
            {isAttached ? 'Detach Debugger' : 'Attach Debugger'}
          </Button>

          <Input
            placeholder="Enter CSS selector"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            disabled={!isAttached}
          />

          <Input
            placeholder="Enter text to type"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!isAttached}
          />

          <Space.Compact block>
            <Button onClick={handleClick} disabled={!isAttached}>
              Click Element
            </Button>
            <Button onClick={handleType} disabled={!isAttached}>
              Type Text
            </Button>
            <Button onClick={handleScreenshot} disabled={!isAttached}>
              Screenshot
            </Button>
          </Space.Compact>
        </Space>
      </Content>
    </Layout>
  );
};

export default App;
