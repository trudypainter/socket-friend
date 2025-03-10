/**
 * Environment detection and compatibility script
 * This provides common APIs whether running as a Chrome extension or a web app
 */

// Detect if we're in a Chrome extension or web environment
const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

// Storage API compatibility layer
const storage = {
  // Get items from storage
  get: (keys, callback) => {
    if (isExtension) {
      // Use Chrome storage API in extension context
      chrome.storage.local.get(keys, callback);
    } else {
      // Use localStorage in web context
      const result = {};
      if (Array.isArray(keys)) {
        for (const key of keys) {
          result[key] = localStorage.getItem(key) 
            ? JSON.parse(localStorage.getItem(key)) 
            : null;
        }
      } else if (typeof keys === 'object') {
        for (const key of Object.keys(keys)) {
          result[key] = localStorage.getItem(key)
            ? JSON.parse(localStorage.getItem(key))
            : keys[key]; // Use default value from keys object
        }
      } else if (typeof keys === 'string') {
        result[keys] = localStorage.getItem(keys)
          ? JSON.parse(localStorage.getItem(keys))
          : null;
      }
      setTimeout(() => callback(result), 0); // Simulate async behavior
    }
  },

  // Set items in storage
  set: (items, callback) => {
    if (isExtension) {
      // Use Chrome storage API in extension context
      chrome.storage.local.set(items, callback);
    } else {
      // Use localStorage in web context
      for (const key of Object.keys(items)) {
        localStorage.setItem(key, JSON.stringify(items[key]));
      }
      if (callback) setTimeout(callback, 0); // Simulate async behavior
    }
  },

  // Remove items from storage
  remove: (keys, callback) => {
    if (isExtension) {
      // Use Chrome storage API in extension context
      chrome.storage.local.remove(keys, callback);
    } else {
      // Use localStorage in web context
      if (Array.isArray(keys)) {
        for (const key of keys) {
          localStorage.removeItem(key);
        }
      } else if (typeof keys === 'string') {
        localStorage.removeItem(keys);
      }
      if (callback) setTimeout(callback, 0); // Simulate async behavior
    }
  }
};

// Profile photo handling
const profile = {
  getPhoto: async () => {
    if (isExtension) {
      // Try to get profile photo from Chrome identity API
      try {
        return await getProfilePhotoFromChrome();
      } catch (error) {
        console.warn('Could not get Chrome profile photo:', error);
        return null;
      }
    } else {
      // In web context, use a default avatar or let the user upload one
      return localStorage.getItem('profilePhotoUrl') || null;
    }
  }
};

// Helper function for Chrome extension profile photo
async function getProfilePhotoFromChrome() {
  // If the newtab.js has already loaded and defined the OAuth function, use it
  if (window.getProfilePhotoViaOAuth) {
    return await window.getProfilePhotoViaOAuth();
  }
  
  // Otherwise, return null and let the main script handle it later
  return null;
}

// Export the environment APIs
window.env = {
  isExtension: isExtension,
  storage: storage,
  profile: profile
}; 