// Socket Friends - New Tab Page JavaScript

// DOM Elements
const marqueeContent = document.getElementById('marquee-content');
const playArea = document.getElementById('play-area');
const usersList = document.getElementById('users-list');
const userSettings = document.getElementById('user-settings');

// State
let socket = null;
let userId = null;
let username = '';
let cursorColor = '';
let profilePhotoUrl = ''; // Add profile photo URL
// Production URL
const serverUrl = 'https://socket-friend-b0t7.onrender.com';
// For local development: let serverUrl = 'http://localhost:3000';
const activeUsers = new Map();
let throttleTimer = null;
let localCursor = null; // Reference to local cursor element
const THROTTLE_DELAY = 50; // ms

// Initialize
async function init() {
  console.log('🚀 INIT: Starting application initialization');
  
  // Load or create user settings
  console.log('🔄 INIT: Loading user settings');
  await loadUserSettings();
  
  // Get user profile photo
  console.log('📸 INIT: Attempting to get profile photo');
  await getProfilePhoto();
  
  // Initialize user settings UI
  console.log('🖌️ INIT: Creating user settings UI');
  createUserSettingsUI();
  
  // Initialize mode system
  console.log('🎮 INIT: Initializing mode system');
  await initializeModeSystem();
  
  // Connect to WebSocket server
  console.log('🔌 INIT: Connecting to WebSocket server');
  connectToServer();
  
  // Set up event listeners
  console.log('👂 INIT: Setting up event listeners');
  setupEventListeners();
  
  console.log('✅ INIT: Application initialization complete');
}

// Initialize mode system
async function initializeModeSystem() {
  try {
    // Import mode manager and modes
    const modeManagerModule = await import('./utils/modeManager.js');
    const drawingModeModule = await import('./modes/drawingMode.js');
    const musicModeModule = await import('./modes/musicMode.js');
    const combatModeModule = await import('./modes/combatMode.js');
    const emojiDrawingModeModule = await import('./modes/emojiDrawingMode.js');
    const swordCombatModeModule = await import('./modes/swordCombatMode.js');
    const chatModeModule = await import('./modes/chatMode.js');
    
    const modeManager = modeManagerModule.default;
    const drawingMode = drawingModeModule.default;
    const musicMode = musicModeModule.default;
    const combatMode = combatModeModule.default;
    const emojiDrawingMode = emojiDrawingModeModule.default;
    const swordCombatMode = swordCombatModeModule.default;
    const chatMode = chatModeModule.default;
    
    // Store references globally
    window.modeManager = modeManager;
    window.drawingMode = drawingMode;
    window.musicMode = musicMode;
    window.combatMode = combatMode;
    window.emojiDrawingMode = emojiDrawingMode;
    window.swordCombatMode = swordCombatMode;
    window.chatMode = chatMode;
    
    // Register modes
    modeManager.registerMode(modeManagerModule.AVAILABLE_MODES.DEFAULT, {
      activate: () => console.log('Default mode activated'),
      deactivate: () => console.log('Default mode deactivated')
    });
    
    modeManager.registerMode(modeManagerModule.AVAILABLE_MODES.DRAWING, drawingMode);
    modeManager.registerMode(modeManagerModule.AVAILABLE_MODES.MUSIC, musicMode);
    modeManager.registerMode(modeManagerModule.AVAILABLE_MODES.COMBAT, combatMode);
    modeManager.registerMode(modeManagerModule.AVAILABLE_MODES.EMOJI_DRAWING, emojiDrawingMode);
    modeManager.registerMode(modeManagerModule.AVAILABLE_MODES.SWORD_COMBAT, swordCombatMode);
    modeManager.registerMode(modeManagerModule.AVAILABLE_MODES.CHAT, chatMode);
    
    console.log('✅ MODE: Mode system initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ MODE: Failed to initialize mode system:', error);
    return false;
  }
}

// Get user profile photo from identity API or placeholder
async function getProfilePhoto() {
  try {
    // Use our environment-compatible profile API
    const photoUrl = await window.env.profile.getPhoto();
    
    if (photoUrl) {
      profilePhotoUrl = photoUrl;
      // Save to storage
      window.env.storage.set({ profilePhotoUrl: photoUrl });
    }
    
    return photoUrl;
  } catch (error) {
    console.error('Error getting profile photo:', error);
    return null;
  }
}

// Add a simple test function to trigger auth manually
// Can be called from the console for testing
window.testAuth = () => {
  console.log('🧪 TEST: Manual auth test triggered');
  const authStatus = document.getElementById('auth-status');
  if (authStatus) {
    authStatus.textContent = 'Auth status: Testing...';
  }
  
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    console.log('🧪 TEST: Auth result:', token ? '✅ Success' : '❌ Failed');
    if (chrome.runtime.lastError) {
      console.error('🧪 TEST: Auth error:', chrome.runtime.lastError);
      if (authStatus) {
        authStatus.textContent = `Auth status: ❌ Failed - ${chrome.runtime.lastError.message}`;
      }
    } else {
      console.log('🧪 TEST: Token received (first few chars):', token ? `${token.substring(0, 10)}...` : 'none');
      if (authStatus) {
        authStatus.textContent = 'Auth status: ✅ Success';
      }
      
      // Try to get profile photo with this token
      fetch('https://people.googleapis.com/v1/people/me?personFields=photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        console.log('🧪 TEST: People API response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('🧪 TEST: People API data:', data);
        if (data.photos && data.photos.length > 0) {
          profilePhotoUrl = data.photos[0].url;
          console.log('🧪 TEST: Got profile photo URL:', profilePhotoUrl);
          if (authStatus) {
            authStatus.textContent = 'Auth status: ✅ Success, Photo found!';
          }
          
          // Save to storage
          chrome.storage.local.set({ profilePhotoUrl });
          
          // Update UI immediately
          if (localCursor) {
            const photoElement = localCursor.querySelector('.cursor-photo');
            if (photoElement) {
              photoElement.style.backgroundImage = `url(${profilePhotoUrl})`;
            } else {
              const newPhotoElement = document.createElement('div');
              newPhotoElement.className = 'cursor-photo';
              newPhotoElement.style.backgroundImage = `url(${profilePhotoUrl})`;
              newPhotoElement.style.backgroundSize = 'cover';
              newPhotoElement.style.backgroundPosition = 'center';
              newPhotoElement.style.width = '100%';
              newPhotoElement.style.height = '100%';
              newPhotoElement.style.borderRadius = '50%';
              localCursor.appendChild(newPhotoElement);
            }
          }
        } else {
          console.log('🧪 TEST: No photos found in profile data');
          if (authStatus) {
            authStatus.textContent = 'Auth status: ✅ Success, but no photo found';
          }
        }
      })
      .catch(error => {
        console.error('🧪 TEST: Error fetching profile photo:', error);
        if (authStatus) {
          authStatus.textContent = 'Auth status: ✅ Auth success, but API error';
        }
      });
    }
  });
};

/**
 * Generate a random username for new users
 */
function generateRandomUsername() {
  return `user_${Math.floor(Math.random() * 10000)}`;
}

// Load user settings from storage or create default
async function loadUserSettings() {
  console.log('Loading user settings from storage');
  return new Promise((resolve) => {
    // Use our environment-compatible storage API
    window.env.storage.get(['username', 'cursorColor', 'profilePhotoUrl'], async (result) => {
      console.log('Loaded settings from storage:', result);
      
      // Always generate a random color for cursor
      cursorColor = getRandomColor();
      
      // Use existing values or set defaults
      username = result.username || generateRandomUsername();
      profilePhotoUrl = result.profilePhotoUrl || null;
      
      // If no profile photo URL is found, try to get one via OAuth
      if (!profilePhotoUrl && window.env.isExtension) {
        console.log('No profile photo found, attempting to get one via OAuth...');
        try {
          // Try to get a profile photo using OAuth
          await getProfilePhotoViaOAuth();
        } catch (error) {
          console.error('Failed to get profile photo via OAuth:', error);
        }
      }
      
      // Save preferences
      window.env.storage.set({
        username: username,
        cursorColor: cursorColor,
        profilePhotoUrl: profilePhotoUrl
      });
      
      resolve({ username, cursorColor, profilePhotoUrl });
    });
  });
}

/**
 * Get profile photo via OAuth login
 * @returns {Promise<string|null>} The profile photo URL or null if failed
 */
async function getProfilePhotoViaOAuth() {
  return new Promise((resolve, reject) => {
    if (!window.env.isExtension) {
      console.log('OAuth login only available in extension mode');
      return resolve(null);
    }
    
    console.log('Getting profile photo via OAuth...');
    
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error('OAuth error:', chrome.runtime.lastError);
        return reject(chrome.runtime.lastError);
      }
      
      if (!token) {
        console.error('No token received from OAuth');
        return reject(new Error('No token received'));
      }
      
      console.log('OAuth token received, fetching profile photo...');
      
      // Try to get profile photo with this token
      fetch('https://people.googleapis.com/v1/people/me?personFields=photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`People API response error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('People API data received');
        if (data.photos && data.photos.length > 0) {
          profilePhotoUrl = data.photos[0].url;
          console.log('Got profile photo URL:', profilePhotoUrl);
          
          // Save to storage
          window.env.storage.set({ profilePhotoUrl });
          
          // Update UI immediately if local cursor exists
          if (localCursor) {
            const photoElement = localCursor.querySelector('.cursor-photo');
            if (photoElement) {
              photoElement.style.backgroundImage = `url(${profilePhotoUrl})`;
            }
          }
          
          resolve(profilePhotoUrl);
        } else {
          console.warn('No photos found in People API response');
          resolve(null);
        }
      })
      .catch(error => {
        console.error('Error fetching profile photo:', error);
        reject(error);
      });
    });
  });
}

// Expose the function globally for use by environment.js
window.getProfilePhotoViaOAuth = getProfilePhotoViaOAuth;

// Create user settings UI
function createUserSettingsUI() {
  // Create user info container
  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  
  // Username display (no edit link)
  const usernameField = document.createElement('div');
  usernameField.className = 'user-field';
  
  const usernameLabel = document.createElement('span');
  usernameLabel.textContent = 'Username: ';
  
  const usernameValue = document.createElement('span');
  usernameValue.id = 'username-display';
  usernameValue.textContent = username;
  
  usernameField.appendChild(usernameLabel);
  usernameField.appendChild(usernameValue);
  
  // Color display (no edit link)
  const colorField = document.createElement('div');
  colorField.className = 'user-field';
  
  const colorLabel = document.createElement('span');
  colorLabel.textContent = 'Cursor color: ';
  
  const colorValue = document.createElement('span');
  colorValue.id = 'color-display';
  colorValue.style.display = 'inline-block';
  colorValue.style.width = '16px';
  colorValue.style.height = '16px';
  colorValue.style.backgroundColor = cursorColor;
  colorValue.style.borderRadius = '50%';
  colorValue.style.marginLeft = '5px';
  
  colorField.appendChild(colorLabel);
  colorField.appendChild(colorValue);
  
  // Add fields to user info container
  userInfo.appendChild(usernameField);
  userInfo.appendChild(colorField);
  
  // Add to DOM
  userSettings.innerHTML = '';
  userSettings.appendChild(userInfo);
  
  // Create local cursor element
  createLocalCursor();
}

// Connect to WebSocket server
function connectToServer() {
  try {
    // Initialize Socket.io connection
    socket = io(serverUrl);
    
    // Connection event handlers
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectionError);
    
    // User event handlers
    socket.on('user:connected', handleUserConnected);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('user:updated', handleUserUpdated);
    
    // Cursor event handlers
    socket.on('cursor:update', handleCursorUpdate);
    socket.on('cursor:click', handleRemoteClick);
    
    // Emoji drawing event handler
    socket.on('emoji:draw', handleRemoteEmojiDraw);
    
    // Get all users
    socket.on('users:all', handleAllUsers);
  } catch (error) {
    console.error('Failed to connect to server:', error);
  }
}

// Handle successful connection
function handleConnect() {
  console.log('Connected to server');
  console.log('Sending user join with profilePhotoUrl:', profilePhotoUrl);
  console.log('Sending user color:', cursorColor);
  
  // Send user info upon connection
  socket?.emit('user:join', {
    username: username,
    cursorColor: cursorColor,
    profilePhotoUrl: profilePhotoUrl
  });
  
  // Initialize mode manager with socket and userId
  if (window.modeManager && userId) {
    window.modeManager.init(socket, userId);
    
    // Initialize modes
    if (window.drawingMode) window.drawingMode.init(socket, userId);
    if (window.musicMode) window.musicMode.init(socket, userId);
    if (window.combatMode) window.combatMode.init(socket, userId);
    
    console.log('✅ MODE: Modes initialized with socket connection');
  }
}

// Handle disconnection
function handleDisconnect() {
  console.log('Disconnected from server');
  
  // Remove all remote cursors
  const cursors = document.querySelectorAll('.remote-cursor');
  for (const cursor of cursors) {
    cursor.remove();
  }
  
  // Clear users list
  activeUsers.clear();
  updateUsersUI();
  
  // Try to reconnect after a delay
  setTimeout(connectToServer, 3000);
}

// Handle connection error
function handleConnectionError(error) {
  console.error('Connection error:', error);
}

// Handle user connected event (for this user)
function handleUserConnected(data) {
  console.log('User connected with ID:', data.userId);
  userId = data.userId;
  
  // Add self to active users
  activeUsers.set(userId, {
    id: userId,
    username: username,
    color: cursorColor,
    profilePhotoUrl: profilePhotoUrl
  });
  
  // Update UI
  updateUsersUI();
}

// Handle user joined event (for other users)
function handleUserJoined(data) {
  console.log('User joined:', data.userId);
  
  // Add to active users
    activeUsers.set(data.userId, {
      id: data.userId,
      username: data.username || `User ${data.userId.substring(0, 5)}`,
    color: data.cursorColor || getRandomColor(),
    profilePhotoUrl: data.profilePhotoUrl || ''
    });
    
    // Update UI
    updateUsersUI();
}

// Handle user left event
function handleUserLeft(data) {
  console.log('User left:', data.userId);
  
  // Remove from active users
  activeUsers.delete(data.userId);
  
  // Remove cursor element
  window.CursorComponent.removeCursor(data.userId);
  
  // Update UI
  updateUsersUI();
}

// Handle user updated event
function handleUserUpdated(data) {
  // Skip if it's our own update
  if (data.userId === userId) return;
  
  // Get existing user data
  const user = activeUsers.get(data.userId);
  
  if (user) {
  // Update user data
    if (data.username) user.username = data.username;
    if (data.cursorColor) user.color = data.cursorColor;
    if (data.profilePhotoUrl) user.profilePhotoUrl = data.profilePhotoUrl;
    
    // Update cursor element if it exists
      const cursorElement = document.getElementById(`cursor-${data.userId}`);
      if (cursorElement) {
      // Use CursorComponent to update cursor
      window.CursorComponent.updateCursor(cursorElement, {
        username: user.username,
        color: user.color,
        photoUrl: user.profilePhotoUrl
      });
    }
    
    // Update UI
    updateUsersUI();
  }
}

// Handle all users data
function handleAllUsers(data) {
  console.log('Received all users:', data);
  
  // Update active users map
  for (const user of data) {
    if (!activeUsers.has(user.id)) {
      activeUsers.set(user.id, {
        id: user.id,
        username: user.username || `User ${user.id.substring(0, 5)}`,
        color: user.cursorColor || getRandomColor(),
        profilePhotoUrl: user.profilePhotoUrl || ''
      });
    }
  }
  
  // Update UI
  updateUsersUI();
}

// Handle cursor update from other users
function handleCursorUpdate(data) {
  // Skip if it's our own cursor
  if (data.userId === userId) return;
  
  // Get or create cursor element
  let cursorElement = document.getElementById(`cursor-${data.userId}`);
  
  if (!cursorElement) {
    const user = activeUsers.get(data.userId) || { 
      color: getRandomColor(),
      username: `User ${data.userId.substring(0, 5)}`,
      profilePhotoUrl: ''
    };
    
    console.log(`Creating cursor for user ${data.userId} with photo:`, user.profilePhotoUrl);
    
    // Use the CursorComponent to create the cursor
    cursorElement = window.CursorComponent.createCursor(
      data.userId,
      user.username,
      user.color,
      user.profilePhotoUrl,
      false
    );
    
    playArea.appendChild(cursorElement);
  }
  
  // Update cursor position
  window.CursorComponent.updateCursorPosition(cursorElement, data.position.x, data.position.y);
}

// Handle remote click events
function handleRemoteClick(data) {
  // Skip if it's our own click
  if (data.userId === userId) return;
  
  // Get user data
  const user = activeUsers.get(data.userId) || { 
    color: getRandomColor(),
    username: `User ${data.userId.substring(0, 5)}`
  };
  
  // Create ripple effect with user's color using the CursorComponent
  window.CursorComponent.createRippleEffect(playArea, data.position.x, data.position.y, user.color);
}

// Update users list and marquee
function updateUsersUI() {
  // We no longer need to update the users list or marquee since they're removed
  // This function is kept for compatibility but doesn't do anything now
  console.log('Users updated, but UI elements are hidden in Google landing page layout');
}

// Setup event listeners
function setupEventListeners() {
  console.log('🔄 SETUP: Setting up event listeners');
  
  // Play area event listeners
  playArea.addEventListener('mousemove', handleMouseMove);
  playArea.addEventListener('click', handleMouseClick);
  
  // Set up search form handling
  setupSearchFunctionality();
  
  // Create local cursor when mouse enters play area
  createLocalCursor();
}

// Set up search form functionality
function setupSearchFunctionality() {
  const searchForm = document.getElementById('search-form');
  const searchInput = searchForm?.querySelector('input[name="q"]');
  
  if (searchForm && searchInput) {
    // Handle form submission
    searchForm.addEventListener('submit', (e) => {
      const query = searchInput.value.trim();
      
      // If it looks like a URL, navigate directly to it
      if (isURL(query)) {
        e.preventDefault();
        
        // Add https:// if not present
        let url = query;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        
        // Navigate to the URL
        window.location.href = url;
      }
      // Otherwise, let the form submit to Google search
    });
    
    // Add voice search functionality
    const voiceSearch = document.querySelector('.voice-search');
    if (voiceSearch) {
      voiceSearch.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Check if SpeechRecognition is available
        if ('webkitSpeechRecognition' in window) {
          const recognition = new webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          
          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            searchForm.submit();
          };
          
          recognition.start();
        } else {
          alert('Voice search is not supported in your browser.');
        }
      });
    }
  }
}

// Check if a string appears to be a URL
function isURL(str) {
  // Simple URL pattern check
  const pattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/i;
  return pattern.test(str);
}

// Handle mouse movement and send position to server
function handleMouseMove(e) {
  // Store the mouse position globally for access by other components
  window.mouseX = e.clientX;
  window.mouseY = e.clientY;
  
  // Get position relative to play area
  const rect = playArea.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Update local cursor position if exists
  if (localCursor) {
    window.CursorComponent.updateCursorPosition(localCursor, x, y);
  }
  
  // Throttle emit to avoid excessive events
  if (!throttleTimer && socket?.connected && userId) {
    throttleTimer = setTimeout(() => {
      socket.emit('cursor:move', {
        position: { x, y },
        timestamp: Date.now()
      });
      
      throttleTimer = null;
    }, THROTTLE_DELAY);
  }
}

// Handle mouse clicks and create ripple effect
function handleMouseClick(e) {
  // Get position relative to play area
  const rect = playArea.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Create ripple effect at the cursor position using CursorComponent
  window.CursorComponent.createRippleEffect(playArea, x, y, cursorColor);
  
  // Send ripple event to server
  if (socket?.connected && userId) {
    socket.emit('cursor:click', {
      position: { x, y },
      timestamp: Date.now()
    });
  }
}

// Generate a random color
function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

// Create local cursor
function createLocalCursor() {
  if (localCursor) return;
  
  console.log('Creating local cursor with photo URL:', profilePhotoUrl);
  
  // Use CursorComponent to create local cursor
  localCursor = window.CursorComponent.createCursor(
    'local',
    username,
    cursorColor,
    profilePhotoUrl,
    true
  );
  
  playArea.appendChild(localCursor);
}

/**
 * Handle remote emoji drawing event
 * @param {Object} data - Emoji drawing data
 */
function handleRemoteEmojiDraw(data) {
  // Skip if this is our own emoji (already handled locally)
  if (data.userId === userId) return;
  
  // Create emoji element
  createEmojiElement(data.position.x, data.position.y, data.emoji, data.size, data.userId);
}

/**
 * Create an emoji element for drawing
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} emoji - Emoji character
 * @param {number} size - Size of emoji
 * @param {string} remoteUserId - ID of user who created the emoji
 */
function createEmojiElement(x, y, emoji, size = 40, remoteUserId = null) {
  // Create element
  const element = document.createElement('div');
  element.className = 'emoji-drawing';
  element.style.position = 'absolute';
  element.style.left = `${x - size / 2}px`;
  element.style.top = `${y - size / 2}px`;
  element.style.fontSize = `${size}px`;
  element.style.lineHeight = '1';
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.zIndex = '50';
  element.style.pointerEvents = 'none';
  element.style.userSelect = 'none';
  element.style.transition = 'opacity 1s ease-out';
  element.style.opacity = '1';
  element.textContent = emoji;
  
  // Add user attribution if this is from another user
  if (remoteUserId && remoteUserId !== userId) {
    const user = activeUsers.get(remoteUserId);
    if (user) {
      // Add a subtle indicator of who created this emoji
      element.title = `${user.username}'s emoji`;
      
      // Optional: add a subtle border with user's cursor color
      if (user.cursorColor) {
        element.style.textShadow = `0 0 3px ${user.cursorColor}`;
      }
    }
  }
  
  // Add to DOM
  playArea.appendChild(element);
  
  // Set timeout for fading - use the same timing as in the emoji mode
  const fadeTimeout = 2000; // Time in ms before emoji starts to fade
  
  setTimeout(() => {
    element.style.opacity = '0';
    
    // Remove after fade
    setTimeout(() => {
      element.remove();
    }, 1000);
  }, fadeTimeout);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 