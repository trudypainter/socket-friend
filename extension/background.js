// Socket Friends - Background Script
// This script runs in the background and manages the extension's lifecycle

// Configuration
const CONFIG = {
  serverUrl: 'http://localhost:3000',
  defaultUsername: `user_${Math.floor(Math.random() * 10000)}`,
  defaultColor: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
};

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Socket Friends extension installed');
  
  // Set default settings if not already set
  const settings = await chrome.storage.local.get(['username', 'cursorColor', 'serverUrl']);
  
  if (!settings.username) {
    await chrome.storage.local.set({ username: CONFIG.defaultUsername });
  }
  
  if (!settings.cursorColor) {
    await chrome.storage.local.set({ cursorColor: CONFIG.defaultColor });
  }
  
  if (!settings.serverUrl) {
    await chrome.storage.local.set({ serverUrl: CONFIG.serverUrl });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get(['username', 'cursorColor', 'serverUrl'], (settings) => {
      sendResponse({
        username: settings.username || CONFIG.defaultUsername,
        cursorColor: settings.cursorColor || CONFIG.defaultColor,
        serverUrl: settings.serverUrl || CONFIG.serverUrl
      });
    });
    return true; // Required for async sendResponse
  }
});

// Log when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
  console.log('Socket Friends extension unloaded');
}); 