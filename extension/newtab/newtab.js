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
// For local development: 
// const serverUrl = 'http://localhost:3000';
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
  
  // Debug emoji rendering to check for issues
  debugEmojiRendering();
  
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
  console.log('🔌 CONNECT: Attempting to connect to server at', serverUrl);
  
  try {
    // Initialize Socket.io connection
    socket = io(serverUrl);
    console.log('🔌 CONNECT: Socket.io instance created');
    
    // Debug socket object
    console.log('🔍 SOCKET DEBUG: Socket created with ID:', socket.id);
    console.log('🔍 SOCKET DEBUG: Socket connection state:', socket.connected ? 'Connected' : 'Disconnected');
    
    // Connection event handlers
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectionError);
    console.log('🔌 CONNECT: Basic connection handlers registered');
    
    // User event handlers
    socket.on('user:connected', handleUserConnected);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('user:updated', handleUserUpdated);
    console.log('👤 CONNECT: User event handlers registered');
    
    // Cursor event handlers
    socket.on('cursor:update', handleCursorUpdate);
    socket.on('cursor:click', handleRemoteClick);
    console.log('🖱️ CONNECT: Cursor event handlers registered');
    
    // Emoji drawing event handler
    socket.on('emoji:draw', handleRemoteEmojiDraw);
    console.log('🎨 CONNECT: Emoji drawing event handler registered');
    
    // Add global handlers for chat events (as a fallback)
    socket.on('chat:message', handleGlobalChatMessage);
    socket.on('chat:typing', handleGlobalChatTyping);
    socket.on('chat:fade', handleGlobalChatFade);
    console.log('💬 CONNECT: Global chat event handlers registered');
    
    // Get all users
    socket.on('users:all', handleAllUsers);
    console.log('👥 CONNECT: Users:all event handler registered');
    
    // List all registered event listeners
    console.log('📋 CONNECT: All registered event handlers:', Object.keys(socket._callbacks).join(', '));
    
    // Check if we have any chat-related event listeners at this point
    const chatListeners = Object.keys(socket._callbacks || {}).filter(key => key.startsWith('$chat:'));
    console.log('💬 CONNECT: Chat event listeners at socket creation:', chatListeners);
    
    // Add a debug listener for all chat events to monitor if they're being received
    socket.onAny((event, ...args) => {
      if (event.startsWith('chat:')) {
        console.log(`🔍 SOCKET EVENT MONITOR: Received ${event} event:`, args[0]);
      }
    });
    console.log('🔍 CONNECT: Added global event monitor for chat events');
  } catch (error) {
    console.error('❌ CONNECT ERROR:', error);
  }
}

// Handle successful connection
function handleConnect() {
  console.log('🟢 CONNECTED: Successfully connected to server');
  console.log('🆔 CONNECTED: Socket ID:', socket.id);
  console.log('📸 CONNECTED: User profile photo URL:', profilePhotoUrl);
  console.log('🎨 CONNECTED: User cursor color:', cursorColor);
  
  // Make socket available globally for use by other modules
  window.socket = socket;
  console.log('🌐 CONNECTED: Socket made available globally as window.socket');
  
  // Log socket event listeners
  if (socket._callbacks) {
    console.log('🔌 CONNECTED: Initial socket event listeners:', Object.keys(socket._callbacks));
  }
  
  // Send user info upon connection
  socket?.emit('user:join', {
    username: username,
    cursorColor: cursorColor,
    profilePhotoUrl: profilePhotoUrl
  });
  console.log('📤 CONNECTED: Sent user:join event');
  
  // Initialize mode manager with socket and userId
  if (window.modeManager && userId) {
    console.log('🎮 CONNECTED: Initializing mode manager with socket and userId:', userId);
    window.modeManager.init(socket, userId);
    
    // Initialize modes
    if (window.drawingMode) {
      console.log('🖌️ CONNECTED: Initializing drawing mode');
      window.drawingMode.init(socket, userId);
    }
    
    if (window.musicMode) {
      console.log('🎵 CONNECTED: Initializing music mode');
      window.musicMode.init(socket, userId);
    }
    
    if (window.combatMode) {
      console.log('⚔️ CONNECTED: Initializing combat mode');
      window.combatMode.init(socket, userId);
    }
    
    if (window.emojiDrawingMode) {
      console.log('🎭 CONNECTED: Initializing emoji drawing mode');
      window.emojiDrawingMode.init(socket, userId);
      
      // Debug emoji drawing mode
      console.log('🔍 EMOJI MODE DEBUG:', {
        isActive: window.emojiDrawingMode.isActive,
        emojis: window.emojiDrawingMode.emojis,
        emojiSize: window.emojiDrawingMode.emojiSize,
        socketConnected: window.emojiDrawingMode.socket?.connected
      });
    }
    
    if (window.swordCombatMode) {
      console.log('🗡️ CONNECTED: Initializing sword combat mode');
      window.swordCombatMode.init(socket, userId);
    }
    
    if (window.chatMode) {
      console.log('💬 CONNECTED: Initializing chat mode');
      window.chatMode.init(socket, userId);
      
      // Debug chat mode
      console.log('🔍 CHAT MODE DEBUG:', {
        isActive: window.chatMode.isActive,
        socketConnected: window.chatMode.socket?.connected,
        userId: window.chatMode.userId
      });
    }
    
    console.log('✅ CONNECTED: All modes initialized');
    
    // Log socket event listeners after all modes are initialized
    if (socket._callbacks) {
      console.log('🔌 CONNECTED: Socket event listeners after mode initialization:', Object.keys(socket._callbacks));
      
      // Specifically check for chat-related event listeners
      const chatListeners = Object.keys(socket._callbacks).filter(key => key.startsWith('$chat:'));
      console.log('💬 CONNECTED: Chat event listeners:', chatListeners);
    }
  } else {
    console.warn('⚠️ CONNECTED: Could not initialize modes - missing modeManager or userId');
  }
}

// Handle disconnection
function handleDisconnect() {
  console.log('🔴 DISCONNECTED: Lost connection to server');
  
  // Update global socket state
  if (window.socket === socket) {
    console.log('🌐 DISCONNECTED: Clearing global socket reference');
    window.socket = null;
  }
  
  // Remove all remote cursors
  const cursors = document.querySelectorAll('.remote-cursor');
  for (const cursor of cursors) {
    cursor.remove();
  }
  
  // Clear active users
  activeUsers.clear();
  
  // Update user interface
  updateUsersUI();
  
  // Show disconnection message in the search bar to inform user
  const searchInput = document.querySelector('.search-bar input');
  if (searchInput) {
    searchInput.placeholder = '⚠️ Disconnected from server. Reconnecting...';
  }
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

// Handle new user joined
function handleUserJoined(data) {
  console.log('👤 USER JOINED: New user joined:', data.userId);
  
  // Add to active users
  activeUsers.set(data.userId, {
    id: data.userId,
    username: data.username || `User ${data.userId.substring(0, 5)}`,
    cursorColor: data.cursorColor || '#000000',
    profilePhotoUrl: data.profilePhotoUrl || ''
  });
  
  console.log('👤 USER JOINED: Added to active users, total users:', activeUsers.size);
  console.log('👤 USER JOINED: Active user IDs:', Array.from(activeUsers.keys()));
  
  // Create cursor for the new user
  createCursorForUser(data.userId, data.username, data.cursorColor, data.profilePhotoUrl);
  
  // Update UI
  updateUsersUI();
  
  // Log chat-related state
  if (window.chatMode) {
    console.log('💬 USER JOINED: Chat mode state when user joined:', {
      isActive: window.chatMode.isActive,
      socketConnected: window.chatMode.socket?.connected,
      userId: window.chatMode.userId
    });
  }
}

// Handle user left
function handleUserLeft(data) {
  console.log('👤 USER LEFT: User left:', data.userId);
  
  // Remove from active users
  activeUsers.delete(data.userId);
  console.log('👤 USER LEFT: Removed from active users, remaining users:', activeUsers.size);
  console.log('👤 USER LEFT: Remaining user IDs:', Array.from(activeUsers.keys()));
  
  // Remove cursor
  const cursor = document.querySelector(`.remote-cursor[data-user-id="${data.userId}"]`);
  if (cursor) {
    cursor.remove();
    console.log('👤 USER LEFT: Removed cursor element for user:', data.userId);
  } else {
    console.warn('👤 USER LEFT: No cursor found for user:', data.userId);
  }
  
  // Remove any chat bubbles from this user
  const chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
  if (chatBubble) {
    chatBubble.remove();
    console.log('💬 USER LEFT: Removed chat bubble for user:', data.userId);
  }
  
  // Update UI
  updateUsersUI();
  
  // Log chat-related state
  if (window.chatMode) {
    console.log('💬 USER LEFT: Chat mode state when user left:', {
      isActive: window.chatMode.isActive,
      socketConnected: window.chatMode.socket?.connected,
      userId: window.chatMode.userId
    });
  }
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
  console.log('📥 EMOJI RECEIVE: Received emoji:draw from server:', data);
  
  // Check data integrity
  if (!data || !data.position || !data.emoji) {
    console.error('❌ EMOJI RECEIVE ERROR: Invalid emoji data received:', data);
    return;
  }
  
  // Skip if this is our own emoji (already handled locally)
  if (data.userId === userId) {
    console.log('🔄 EMOJI RECEIVE: Skipping own emoji drawing');
    return;
  }
  
  const userInfo = activeUsers.get(data.userId);
  console.log('👤 EMOJI USER:', {
    userId: data.userId,
    username: userInfo ? userInfo.username : 'Unknown user'
  });
  
  // Create emoji element
  console.log('🎨 EMOJI DRAWING:', {
    x: data.position.x,
    y: data.position.y,
    emoji: data.emoji,
    size: data.size
  });
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
  // Get play area
  const playArea = document.getElementById('play-area');
  if (!playArea) {
    console.error('❌ EMOJI RENDER: Play area not found, cannot render emoji');
    return;
  }
  
  console.log('🎭 EMOJI RENDER: Creating emoji element:', { x, y, emoji, size, remoteUserId });
  
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
      console.log(`🎨 EMOJI STYLE: Added attribution for user ${user.username}`);
    } else {
      console.warn(`⚠️ EMOJI USER: User ${remoteUserId} not found in active users`);
    }
  }
  
  // Add to DOM
  playArea.appendChild(element);
  console.log('✅ EMOJI RENDER: Emoji added to play area');
  
  // Set timeout for fading - use the same timing as in the emoji mode
  const fadeTimeout = 2000; // Time in ms before emoji starts to fade
  
  setTimeout(() => {
    element.style.opacity = '0';
    console.log('🌫️ EMOJI FADE: Emoji starting to fade out');
    
    // Remove after fade
    setTimeout(() => {
      element.remove();
      console.log('🗑️ EMOJI CLEANUP: Emoji element removed from DOM');
    }, 1000);
  }, fadeTimeout);
}

/**
 * Debug function to help diagnose emoji rendering issues
 */
function debugEmojiRendering() {
  console.log('🔍 EMOJI DEBUG: Starting emoji rendering diagnostics');
  
  // Check if play area exists
  const playArea = document.getElementById('play-area');
  console.log('🔍 EMOJI DEBUG: Play area exists:', !!playArea);
  
  if (playArea) {
    // Check play area dimensions and visibility
    const playAreaRect = playArea.getBoundingClientRect();
    console.log('🔍 EMOJI DEBUG: Play area dimensions:', {
      width: playAreaRect.width,
      height: playAreaRect.height,
      top: playAreaRect.top,
      left: playAreaRect.left,
      visible: playAreaRect.width > 0 && playAreaRect.height > 0
    });
    
    // CSS properties that might affect visibility
    const playAreaStyle = window.getComputedStyle(playArea);
    console.log('🔍 EMOJI DEBUG: Play area styles:', {
      display: playAreaStyle.display,
      visibility: playAreaStyle.visibility,
      opacity: playAreaStyle.opacity,
      zIndex: playAreaStyle.zIndex,
      position: playAreaStyle.position
    });
  }
  
  // Check event bus for emoji:draw listeners
  if (window.EventBus) {
    const emojiListeners = window.EventBus.listeners?.['emoji:draw'] || [];
    console.log('🔍 EMOJI DEBUG: Number of emoji:draw event listeners:', emojiListeners.length);
  }
  
  // Check socket connection
  console.log('🔍 EMOJI DEBUG: Socket connection state:', {
    socketExists: !!socket,
    connected: socket?.connected,
    id: socket?.id
  });
  
  // Monitor emoji:draw events
  if (socket) {
    const originalOn = socket.on.bind(socket);
    socket.on = (event, callback) => {
      if (event === 'emoji:draw') {
        const wrappedCallback = (data) => {
          console.log('🔍 EMOJI DEBUG: Socket received emoji:draw event:', data);
          return callback(data);
        };
        return originalOn(event, wrappedCallback);
      }
      return originalOn(event, callback);
    };
    
    // Listen again for emoji:draw events with our wrapped listener
    socket.on('emoji:draw', handleRemoteEmojiDraw);
    console.log('🔍 EMOJI DEBUG: Added monitoring for emoji:draw socket events');
  }
  
  console.log('🔍 EMOJI DEBUG: Emoji rendering diagnostics complete');
}

/**
 * Debug function to check if chat event listeners are properly registered
 */
function debugChatEventListeners() {
  console.log('🔍 CHAT DEBUG: Checking chat event listeners');
  
  // Check if socket exists and is connected
  if (!socket) {
    console.error('🔍 CHAT DEBUG: Socket is null or undefined');
    return;
  }
  
  console.log('🔍 CHAT DEBUG: Socket connection state:', socket.connected ? 'Connected' : 'Disconnected');
  
  // Check socket event listeners
  if (socket._callbacks) {
    const allListeners = Object.keys(socket._callbacks);
    console.log('🔍 CHAT DEBUG: All socket event listeners:', allListeners);
    
    // Check for chat-related event listeners
    const chatListeners = allListeners.filter(key => key.startsWith('$chat:'));
    console.log('🔍 CHAT DEBUG: Chat event listeners:', chatListeners);
    
    if (chatListeners.length === 0) {
      console.warn('🔍 CHAT DEBUG WARNING: No chat event listeners found!');
    } else {
      console.log('🔍 CHAT DEBUG: Found', chatListeners.length, 'chat event listeners');
    }
  } else {
    console.warn('🔍 CHAT DEBUG: No _callbacks object found on socket');
  }
  
  // Check chat mode state
  if (window.chatMode) {
    console.log('🔍 CHAT DEBUG: Chat mode state:', {
      isActive: window.chatMode.isActive,
      socketConnected: window.chatMode.socket?.connected,
      userId: window.chatMode.userId
    });
  } else {
    console.warn('🔍 CHAT DEBUG: Chat mode not initialized');
  }
  
  // Check active users
  console.log('🔍 CHAT DEBUG: Active users count:', activeUsers.size);
  console.log('🔍 CHAT DEBUG: Active user IDs:', Array.from(activeUsers.keys()));
  
  // Check for remote cursors
  const remoteCursors = document.querySelectorAll('.remote-cursor');
  console.log('🔍 CHAT DEBUG: Remote cursors count:', remoteCursors.length);
  console.log('🔍 CHAT DEBUG: Remote cursor IDs:', Array.from(remoteCursors).map(cursor => cursor.getAttribute('data-user-id')));
  
  // Check for chat bubbles
  const chatBubbles = document.querySelectorAll('.remote-chat-bubble');
  console.log('🔍 CHAT DEBUG: Chat bubbles count:', chatBubbles.length);
  console.log('🔍 CHAT DEBUG: Chat bubble IDs:', Array.from(chatBubbles).map(bubble => bubble.getAttribute('data-user-id')));
}

// Call the debug function after initialization
setTimeout(debugChatEventListeners, 5000);  // Check 5 seconds after page load
setTimeout(debugChatEventListeners, 15000); // Check again after 15 seconds

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

/**
 * Test function to manually send chat events
 * Can be called from the console for testing
 */
function testChatEvents() {
  console.log('🧪 CHAT TEST: Manual chat event test triggered');
  
  if (!socket || !socket.connected) {
    console.error('🧪 CHAT TEST ERROR: Socket not connected, cannot send test events');
    return;
  }
  
  // Test chat:typing event
  const typingData = {
    userId: userId,
    message: 'Test typing message...'
  };
  console.log('🧪 CHAT TEST: Sending test chat:typing event:', typingData);
  socket.emit('chat:typing', typingData);
  
  // Test chat:message event after a short delay
  setTimeout(() => {
    const messageData = {
      userId: userId,
      message: 'Test chat message from console!'
    };
    console.log('🧪 CHAT TEST: Sending test chat:message event:', messageData);
    socket.emit('chat:message', messageData);
    
    // Test chat:fade event after another delay
    setTimeout(() => {
      const fadeData = {
        userId: userId
      };
      console.log('🧪 CHAT TEST: Sending test chat:fade event:', fadeData);
      socket.emit('chat:fade', fadeData);
    }, 2000);
  }, 1000);
  
  // Check event listeners
  debugChatEventListeners();
}

// Expose test function globally
window.testChatEvents = testChatEvents;

/**
 * Global handler for chat messages (fallback if chat mode handler doesn't work)
 */
function handleGlobalChatMessage(data) {
  console.log('🌐 GLOBAL CHAT MESSAGE: Received chat:message event:', data);
  
  // Forward to chat mode if available
  if (window.chatMode?.handleRemoteChat) {
    console.log('🌐 GLOBAL CHAT MESSAGE: Forwarding to chat mode handler');
    window.chatMode.handleRemoteChat(data);
  } else {
    console.warn('🌐 GLOBAL CHAT MESSAGE: Chat mode not available, handling directly');
    
    // Basic implementation to show chat bubble
    if (data.userId && data.userId !== userId && data.message) {
      // Find the remote user's cursor
      const remoteCursor = document.querySelector(`.remote-cursor[data-user-id="${data.userId}"]`);
      if (remoteCursor) {
        // Create a simple chat bubble
        let chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
        if (!chatBubble) {
          chatBubble = document.createElement('div');
          chatBubble.className = 'remote-chat-bubble';
          chatBubble.setAttribute('data-user-id', data.userId);
          chatBubble.style.position = 'absolute';
          chatBubble.style.padding = '12px 20px';
          chatBubble.style.borderRadius = '20px';
          chatBubble.style.fontSize = '16px';
          chatBubble.style.backgroundColor = '#e74c3c';
          chatBubble.style.color = 'white';
          chatBubble.style.zIndex = '999';
          chatBubble.style.opacity = '1';
          chatBubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
          chatBubble.style.transition = 'opacity 0.3s ease';
          chatBubble.style.pointerEvents = 'none'; // Make sure it doesn't block interactions
          
          // Try to get user's color
          const user = activeUsers.get(data.userId);
          if (user?.cursorColor) {
            chatBubble.style.backgroundColor = user.cursorColor;
          }
          
          playArea.appendChild(chatBubble);
          console.log('🌐 GLOBAL CHAT MESSAGE: Created new chat bubble for user', data.userId);
        }
        
        // Update content and position
        chatBubble.textContent = data.message;
        const rect = remoteCursor.getBoundingClientRect();
        chatBubble.style.left = `${rect.left}px`;
        chatBubble.style.top = `${rect.bottom + 15}px`;
        console.log('🌐 GLOBAL CHAT MESSAGE: Positioned bubble at', rect.left, rect.bottom + 15);
        
        // Make sure it's visible
        chatBubble.style.display = 'block';
        chatBubble.style.opacity = '1';
        
        // Fade out after delay
        setTimeout(() => {
          chatBubble.style.opacity = '0';
          setTimeout(() => {
            chatBubble.parentNode?.removeChild(chatBubble);
          }, 300);
        }, 3000);
      } else {
        console.warn('🌐 GLOBAL CHAT MESSAGE: Remote cursor not found for user', data.userId);
        
        // Try to create a cursor for this user if they're in activeUsers
        const user = activeUsers.get(data.userId);
        if (user) {
          console.log('🌐 GLOBAL CHAT MESSAGE: User found in activeUsers, creating cursor');
          createCursorForUser(data.userId, user.username, user.cursorColor, user.profilePhotoUrl);
          
          // Try again after a short delay to allow cursor to be created
          setTimeout(() => handleGlobalChatMessage(data), 100);
        }
      }
    }
  }
}

/**
 * Global handler for chat typing events (fallback if chat mode handler doesn't work)
 */
function handleGlobalChatTyping(data) {
  console.log('🌐 GLOBAL CHAT TYPING: Received chat:typing event:', data);
  
  // Forward to chat mode if available
  if (window.chatMode?.handleRemoteTyping) {
    console.log('🌐 GLOBAL CHAT TYPING: Forwarding to chat mode handler');
    window.chatMode.handleRemoteTyping(data);
  } else {
    console.warn('🌐 GLOBAL CHAT TYPING: Chat mode not available, handling directly');
    
    // Basic implementation to show typing indicator
    if (data.userId && data.userId !== userId && data.message) {
      // Find the remote user's cursor
      const remoteCursor = document.querySelector(`.remote-cursor[data-user-id="${data.userId}"]`);
      if (remoteCursor) {
        // Create a simple chat bubble
        let chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
        if (!chatBubble) {
          chatBubble = document.createElement('div');
          chatBubble.className = 'remote-chat-bubble';
          chatBubble.setAttribute('data-user-id', data.userId);
          chatBubble.style.position = 'absolute';
          chatBubble.style.padding = '12px 20px';
          chatBubble.style.borderRadius = '20px';
          chatBubble.style.fontSize = '16px';
          chatBubble.style.backgroundColor = '#3498db';
          chatBubble.style.color = 'white';
          chatBubble.style.zIndex = '999';
          chatBubble.style.opacity = '1';
          chatBubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
          chatBubble.style.transition = 'opacity 0.3s ease';
          chatBubble.style.pointerEvents = 'none'; // Make sure it doesn't block interactions
          
          // Try to get user's color
          const user = activeUsers.get(data.userId);
          if (user?.cursorColor) {
            chatBubble.style.backgroundColor = user.cursorColor;
          }
          
          playArea.appendChild(chatBubble);
          console.log('🌐 GLOBAL CHAT TYPING: Created new chat bubble for user', data.userId);
        }
        
        // Update content and position
        chatBubble.textContent = data.message;
        const rect = remoteCursor.getBoundingClientRect();
        chatBubble.style.left = `${rect.left}px`;
        chatBubble.style.top = `${rect.bottom + 15}px`;
        console.log('🌐 GLOBAL CHAT TYPING: Positioned bubble at', rect.left, rect.bottom + 15);
        
        // Make sure it's visible
        chatBubble.style.display = 'block';
        chatBubble.style.opacity = '1';
      } else {
        console.warn('🌐 GLOBAL CHAT TYPING: Remote cursor not found for user', data.userId);
      }
    }
  }
}

/**
 * Global handler for chat fade events (fallback if chat mode handler doesn't work)
 */
function handleGlobalChatFade(data) {
  console.log('🌐 GLOBAL CHAT FADE: Received chat:fade event:', data);
  
  // Forward to chat mode if available
  if (window.chatMode?.handleRemoteFade) {
    console.log('🌐 GLOBAL CHAT FADE: Forwarding to chat mode handler');
    window.chatMode.handleRemoteFade(data);
  } else {
    console.warn('🌐 GLOBAL CHAT FADE: Chat mode not available, handling directly');
    
    // Basic implementation to fade out chat bubble
    if (data.userId && data.userId !== userId) {
      const chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
      if (chatBubble) {
        chatBubble.style.opacity = '0';
        setTimeout(() => {
          chatBubble.parentNode?.removeChild(chatBubble);
        }, 300);
      }
    }
  }
}

/**
 * Create a cursor for a remote user
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {string} cursorColor - Cursor color
 * @param {string} profilePhotoUrl - Profile photo URL
 */
function createCursorForUser(userId, username, cursorColor, profilePhotoUrl) {
  console.log('👆 CURSOR: Creating cursor for user', userId, username);
  
  // Check if cursor already exists
  const existingCursor = document.querySelector(`.remote-cursor[data-user-id="${userId}"]`);
  if (existingCursor) {
    console.log('👆 CURSOR: Cursor already exists for user', userId);
    return existingCursor;
  }
  
  // Create cursor element
  const cursorElement = document.createElement('div');
  cursorElement.className = 'remote-cursor';
  cursorElement.setAttribute('data-user-id', userId);
  
  // Set initial position (center of screen)
  cursorElement.style.position = 'absolute';
  cursorElement.style.left = '50%';
  cursorElement.style.top = '50%';
  cursorElement.style.transform = 'translate(-50%, -50%)';
  cursorElement.style.zIndex = '100';
  cursorElement.style.pointerEvents = 'none';
  cursorElement.style.transition = 'transform 0.1s ease-out, left 0.1s ease-out, top 0.1s ease-out';
  
  // Create photo container
  const photoContainer = document.createElement('div');
  photoContainer.className = 'cursor-photo-container';
  photoContainer.style.width = '40px';
  photoContainer.style.height = '40px';
  photoContainer.style.borderRadius = '50%';
  photoContainer.style.border = `2px solid ${cursorColor || '#e74c3c'}`;
  photoContainer.style.overflow = 'hidden';
  photoContainer.style.backgroundColor = '#fff';
  photoContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  // Create photo element if URL is provided
  if (profilePhotoUrl) {
    const photoElement = document.createElement('div');
    photoElement.className = 'cursor-photo';
    photoElement.style.width = '100%';
    photoElement.style.height = '100%';
    photoElement.style.backgroundImage = `url(${profilePhotoUrl})`;
    photoElement.style.backgroundSize = 'cover';
    photoElement.style.backgroundPosition = 'center';
    photoContainer.appendChild(photoElement);
  } else {
    // Create initials element if no photo
    const initialsElement = document.createElement('div');
    initialsElement.className = 'cursor-initials';
    initialsElement.style.width = '100%';
    initialsElement.style.height = '100%';
    initialsElement.style.display = 'flex';
    initialsElement.style.alignItems = 'center';
    initialsElement.style.justifyContent = 'center';
    initialsElement.style.color = cursorColor || '#e74c3c';
    initialsElement.style.fontWeight = 'bold';
    initialsElement.style.fontSize = '16px';
    initialsElement.textContent = username ? username.charAt(0).toUpperCase() : '?';
    photoContainer.appendChild(initialsElement);
  }
  
  // Create username label
  const usernameLabel = document.createElement('div');
  usernameLabel.className = 'cursor-username';
  usernameLabel.textContent = username || 'User';
  usernameLabel.style.position = 'absolute';
  usernameLabel.style.bottom = '-20px';
  usernameLabel.style.left = '50%';
  usernameLabel.style.transform = 'translateX(-50%)';
  usernameLabel.style.whiteSpace = 'nowrap';
  usernameLabel.style.fontSize = '12px';
  usernameLabel.style.fontWeight = 'bold';
  usernameLabel.style.color = cursorColor || '#e74c3c';
  
  // Assemble cursor
  cursorElement.appendChild(photoContainer);
  cursorElement.appendChild(usernameLabel);
  
  // Add to play area
  playArea.appendChild(cursorElement);
  
  console.log('👆 CURSOR: Created cursor for user', userId);
  return cursorElement;
}

// Expose the function globally
window.createCursorForUser = createCursorForUser; 