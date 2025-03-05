// Socket Friends - Options Page JavaScript

// DOM Elements
const optionsForm = document.getElementById('options-form');
const usernameInput = document.getElementById('username');
const cursorColorInput = document.getElementById('cursor-color');
const serverUrlInput = document.getElementById('server-url');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');

// Default settings
const DEFAULT_SETTINGS = {
  username: `user_${Math.floor(Math.random() * 10000)}`,
  cursorColor: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
  serverUrl: 'http://localhost:3000'
};

// Initialize options page
async function init() {
  // Load current settings
  const settings = await loadSettings();
  
  // Populate form with current settings
  usernameInput.value = settings.username || DEFAULT_SETTINGS.username;
  cursorColorInput.value = settings.cursorColor || DEFAULT_SETTINGS.cursorColor;
  serverUrlInput.value = settings.serverUrl || DEFAULT_SETTINGS.serverUrl;
  
  // Set up event listeners
  optionsForm.addEventListener('submit', saveSettings);
  resetButton.addEventListener('click', resetSettings);
}

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['username', 'cursorColor', 'serverUrl'], (result) => {
      resolve(result);
    });
  });
}

// Save settings to storage
async function saveSettings(e) {
  e.preventDefault();
  
  const settings = {
    username: usernameInput.value.trim() || DEFAULT_SETTINGS.username,
    cursorColor: cursorColorInput.value || DEFAULT_SETTINGS.cursorColor,
    serverUrl: serverUrlInput.value.trim() || DEFAULT_SETTINGS.serverUrl
  };
  
  // Save to storage
  await chrome.storage.local.set(settings);
  
  // Show success message
  showSuccessMessage();
}

// Reset settings to defaults
async function resetSettings() {
  // Set form values to defaults
  usernameInput.value = DEFAULT_SETTINGS.username;
  cursorColorInput.value = DEFAULT_SETTINGS.cursorColor;
  serverUrlInput.value = DEFAULT_SETTINGS.serverUrl;
  
  // Save defaults to storage
  await chrome.storage.local.set(DEFAULT_SETTINGS);
  
  // Show success message
  showSuccessMessage();
}

// Show success message
function showSuccessMessage() {
  // Check if message element already exists
  let messageElement = document.querySelector('.success-message');
  
  if (!messageElement) {
    // Create message element
    messageElement = document.createElement('div');
    messageElement.className = 'success-message';
    messageElement.textContent = 'Settings saved successfully!';
    
    // Insert before form
    optionsForm.parentNode.insertBefore(messageElement, optionsForm);
  }
  
  // Show message
  messageElement.classList.add('show');
  
  // Hide message after delay
  setTimeout(() => {
    messageElement.classList.remove('show');
  }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 