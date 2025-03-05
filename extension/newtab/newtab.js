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
// Production URL
let serverUrl = 'https://socket-friend-b0t7.onrender.com';
// For local development: let serverUrl = 'http://localhost:3000';
let activeUsers = new Map();
let throttleTimer = null;
let localCursor = null; // Reference to local cursor element
const THROTTLE_DELAY = 50; // ms

// Initialize
async function init() {
  // Load or create user settings
  await loadUserSettings();
  
  // Initialize user settings UI
  createUserSettingsUI();
  
  // Connect to WebSocket server
  connectToServer();
  
  // Set up event listeners
  setupEventListeners();
}

// Load user settings from storage or create default
async function loadUserSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['username', 'cursorColor'], (result) => {
      if (result.username && result.cursorColor) {
        username = result.username;
        cursorColor = result.cursorColor;
      } else {
        // Create default settings if not found
        username = `user_${Math.floor(Math.random() * 10000)}`;
        cursorColor = getRandomColor();
        
        // Save to storage
        chrome.storage.local.set({ username, cursorColor });
      }
      resolve();
    });
  });
}

// Create user settings UI
function createUserSettingsUI() {
  userSettings.innerHTML = `
    <div class="user-info">
      <div class="edit-field">
        <span>Username: <span id="username-display">${username}</span></span>
        <a href="#" id="edit-username">change</a>
      </div>
      <div class="edit-field">
        <span>Cursor color: <span id="color-display" style="display: inline-block; width: 15px; height: 15px; background-color: ${cursorColor}; border-radius: 50%;"></span></span>
        <a href="#" id="edit-color">change</a>
      </div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('edit-username').addEventListener('click', editUsername);
  document.getElementById('edit-color').addEventListener('click', editColor);
  
  // Create local cursor element
  createLocalCursor();
}

// Edit username
function editUsername(e) {
  e.preventDefault();
  
  const newUsername = prompt('Enter your username:', username);
  
  if (newUsername && newUsername.trim() !== '') {
    username = newUsername.trim();
    
    // Update storage
    chrome.storage.local.set({ username });
    
    // Update UI
    document.getElementById('username-display').textContent = username;
    
    // Update local cursor
    if (localCursor) {
      const label = localCursor.querySelector('.cursor-label');
      if (label) {
        label.textContent = username;
      }
    }
    
    // Send update to server if connected
    if (socket && socket.connected) {
      socket.emit('user:update', { username });
    }
  }
}

// Edit cursor color
function editColor(e) {
  e.preventDefault();
  
  const newColor = prompt('Enter cursor color (hex code):', cursorColor);
  
  if (newColor && /^#[0-9A-F]{6}$/i.test(newColor)) {
    cursorColor = newColor;
    
    // Update storage
    chrome.storage.local.set({ cursorColor });
    
    // Update UI
    document.getElementById('color-display').style.backgroundColor = cursorColor;
    
    // Update local cursor
    if (localCursor) {
      localCursor.style.backgroundColor = cursorColor;
    }
    
    // Send update to server if connected
    if (socket && socket.connected) {
      socket.emit('user:update', { cursorColor });
    }
  }
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
    
    // Get all users
    socket.on('users:all', handleAllUsers);
  } catch (error) {
    console.error('Failed to connect to server:', error);
  }
}

// Handle successful connection
function handleConnect() {
  console.log('Connected to server');
  
  // Send user info upon connection
  socket.emit('user:join', {
    username: username,
    cursorColor: cursorColor
  });
}

// Handle disconnection
function handleDisconnect() {
  console.log('Disconnected from server');
  
  // Remove all remote cursors
  const cursors = document.querySelectorAll('.remote-cursor');
  cursors.forEach(cursor => cursor.remove());
  
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
    color: cursorColor
  });
  
  // Update UI
  updateUsersUI();
}

// Handle user joined event (for other users)
function handleUserJoined(data) {
  console.log('User joined:', data);
  
  // Add to active users if not already present
  if (!activeUsers.has(data.userId)) {
    activeUsers.set(data.userId, {
      id: data.userId,
      username: data.username || `User ${data.userId.substring(0, 5)}`,
      color: data.cursorColor || getRandomColor()
    });
    
    // Update UI
    updateUsersUI();
  }
}

// Handle user left event
function handleUserLeft(data) {
  console.log('User left:', data.userId);
  
  // Remove from active users
  activeUsers.delete(data.userId);
  
  // Remove cursor
  const cursorElement = document.getElementById(`cursor-${data.userId}`);
  if (cursorElement) {
    cursorElement.remove();
  }
  
  // Update UI
  updateUsersUI();
}

// Handle user updated event
function handleUserUpdated(data) {
  console.log('User updated:', data);
  
  // Update user data
  if (activeUsers.has(data.userId)) {
    const userData = activeUsers.get(data.userId);
    
    if (data.username) {
      userData.username = data.username;
    }
    
    if (data.cursorColor) {
      userData.color = data.cursorColor;
      
      // Update cursor color if exists
      const cursorElement = document.getElementById(`cursor-${data.userId}`);
      if (cursorElement) {
        cursorElement.style.backgroundColor = data.cursorColor;
      }
    }
    
    activeUsers.set(data.userId, userData);
    
    // Update UI
    updateUsersUI();
  }
  
  // Update local cursor if it's our data
  if (data.userId === userId) {
    if (data.username) {
      username = data.username;
    }
    
    if (data.cursorColor) {
      cursorColor = data.cursorColor;
    }
    
    // Update local cursor
    if (localCursor) {
      localCursor.style.backgroundColor = cursorColor;
      const label = localCursor.querySelector('.cursor-label');
      if (label) {
        label.textContent = username;
      }
    }
  }
}

// Handle all users event
function handleAllUsers(data) {
  console.log('Received all users:', data);
  
  // Update active users map
  data.forEach(user => {
    if (!activeUsers.has(user.id)) {
      activeUsers.set(user.id, {
        id: user.id,
        username: user.username || `User ${user.id.substring(0, 5)}`,
        color: user.cursorColor || getRandomColor()
      });
    }
  });
  
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
      username: `User ${data.userId.substring(0, 5)}`
    };
    
    cursorElement = document.createElement('div');
    cursorElement.id = `cursor-${data.userId}`;
    cursorElement.className = 'remote-cursor';
    cursorElement.style.backgroundColor = user.color;
    
    const labelElement = document.createElement('div');
    labelElement.className = 'cursor-label';
    labelElement.textContent = user.username;
    
    cursorElement.appendChild(labelElement);
    playArea.appendChild(cursorElement);
  }
  
  // Update cursor position
  cursorElement.style.left = `${data.position.x}px`;
  cursorElement.style.top = `${data.position.y}px`;
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
  
  // Create ripple effect with user's color
  createRippleEffect(data.position.x, data.position.y, user.color);
}

// Update users list and marquee
function updateUsersUI() {
  // Update users list
  usersList.innerHTML = '';
  
  // Update marquee content
  const marqueeNames = document.createElement('span');
  marqueeNames.className = 'marquee-text';
  marqueeNames.textContent = '🌟 PEOPLE HERE: ';
  
  for (const [id, user] of activeUsers) {
    // Add to users list
    const userElement = document.createElement('div');
    userElement.className = 'user-item';
    
    const cursorElement = document.createElement('div');
    cursorElement.className = 'user-cursor';
    cursorElement.style.backgroundColor = user.color;
    
    const nameElement = document.createElement('span');
    nameElement.textContent = id === userId ? `${user.username}` : user.username;
    
    userElement.appendChild(cursorElement);
    userElement.appendChild(nameElement);
    usersList.appendChild(userElement);
    
    // Add to marquee
    const nameSpan = document.createElement('span');
    nameSpan.textContent = user.username;
    nameSpan.className = 'user-name';
    marqueeNames.appendChild(nameSpan);
    
    // Add comma if not last user
    if (Array.from(activeUsers.keys()).indexOf(id) < activeUsers.size - 1) {
      marqueeNames.appendChild(document.createTextNode(', '));
    }
  }
  
  // Replace marquee content
  marqueeContent.innerHTML = '';
  marqueeContent.appendChild(marqueeNames);
}

// Set up event listeners
function setupEventListeners() {
  // Track mouse movement
  playArea.addEventListener('mousemove', handleMouseMove);
  
  // Track mouse clicks for ripple effect
  playArea.addEventListener('click', handleMouseClick);
}

// Handle mouse movement and send position to server
function handleMouseMove(e) {
  if (!socket || !socket.connected || !userId) return;
  
  // Get mouse position relative to play area
  const rect = playArea.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Update local cursor position
  if (localCursor) {
    localCursor.style.left = `${x}px`;
    localCursor.style.top = `${y}px`;
  }
  
  // Throttle updates to avoid flooding the server
  if (!throttleTimer) {
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      
      // Send cursor position to server
      socket.emit('cursor:move', {
        position: { x, y },
        timestamp: Date.now()
      });
    }, THROTTLE_DELAY);
  }
}

// Handle mouse clicks and create ripple effect
function handleMouseClick(e) {
  // Get click position relative to play area
  const rect = playArea.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Create local ripple
  createRippleEffect(x, y, cursorColor);
  
  // Send ripple event to server
  if (socket && socket.connected && userId) {
    socket.emit('cursor:click', {
      position: { x, y },
      timestamp: Date.now()
    });
  }
}

// Create ripple effect at specified position
function createRippleEffect(x, y, color) {
  // Create ripple element
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.backgroundColor = color;
  
  // Add to play area
  playArea.appendChild(ripple);
  
  // Remove after animation completes
  setTimeout(() => {
    ripple.remove();
  }, 1000);
}

// Generate a random color
function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

// Create local cursor element
function createLocalCursor() {
  // Remove existing cursor if any
  const existingCursor = document.getElementById('local-cursor');
  if (existingCursor) {
    existingCursor.remove();
  }
  
  // Create cursor element
  localCursor = document.createElement('div');
  localCursor.id = 'local-cursor';
  localCursor.className = 'local-cursor';
  localCursor.style.backgroundColor = cursorColor;
  
  // Create label element
  const labelElement = document.createElement('div');
  labelElement.className = 'cursor-label';
  labelElement.textContent = username;
  
  // Add label to cursor
  localCursor.appendChild(labelElement);
  
  // Add cursor to play area
  playArea.appendChild(localCursor);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 