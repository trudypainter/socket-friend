/**
 * Chat Mode
 * 
 * Enables users to type messages that appear below their cursor
 * - Activated by pressing the "/" key
 * - Messages appear in colored bubbles that match the user's cursor color
 * - Messages fade out after 3 seconds of inactivity
 * - Messages are sent to all other users in real time
 */

class ChatMode {
  constructor() {
    this.isActive = false;
    this.socket = null;
    this.userId = null;
    this.chatInput = null;
    this.chatBubble = null;
    this.currentMessage = "";
    this.typingTimer = null;
    this.fadeOutDelay = 3000; // 3 seconds before fade out
    this.clickHandler = null;
    
    // Bind methods to maintain this context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleRemoteChat = this.handleRemoteChat.bind(this);
    this.handleRemoteTyping = this.handleRemoteTyping.bind(this);
    this.handleRemoteFade = this.handleRemoteFade.bind(this);
    this.resetTypingTimer = this.resetTypingTimer.bind(this);
    this.fadeOutMessage = this.fadeOutMessage.bind(this);
    this.setupClickHandler = this.setupClickHandler.bind(this);
    this.removeClickHandler = this.removeClickHandler.bind(this);
    this.positionBubble = this.positionBubble.bind(this);
  }

  /**
   * Initialize the chat mode with socket connection and user ID
   */
  init(socket, userId) {
    console.log('💬 CHAT INIT: Initializing chat mode', { socketExists: !!socket, socketId: socket?.id });
    
    // Store socket reference
    this.socket = socket;
    this.userId = userId;
    
    // Add debug info
    if (!socket) {
      console.error('💬 CHAT INIT ERROR: Socket is null or undefined');
    } else if (!socket.connected) {
      console.warn('💬 CHAT INIT WARNING: Socket exists but is not connected');
    } else {
      console.log('💬 CHAT INIT: Socket is properly connected with ID:', socket.id);
    }
    
    // Set up socket event listeners for remote chat messages
    if (socket) {
      this.socket.on('chat:message', this.handleRemoteChat);
      this.socket.on('chat:typing', this.handleRemoteTyping);
      this.socket.on('chat:fade', this.handleRemoteFade);
      console.log('💬 CHAT INIT: Registered event handlers for chat events');
    } else {
      console.error('💬 CHAT INIT ERROR: Cannot register event handlers - socket is null');
    }
    
    console.log('💬 CHAT INIT: Chat mode initialization complete');
  }

  /**
   * Activate chat mode
   */
  activate(state = {}) {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Get current cursor position for initial placement
    const cursorX = state.cursorX || window.mouseX || 0;
    const cursorY = state.cursorY || window.mouseY || 0;
    
    // Create chat elements and position them initially
    this.createChatElements(cursorX, cursorY);
    this.showChatIndicator();
    
    // Set up click handler to maintain focus
    this.setupClickHandler();
    
    // Set focus to the chat input
    setTimeout(() => {
      if (this.chatInput) {
        this.chatInput.focus();
      }
    }, 0);
    
    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    
    console.log('Chat mode activated');
  }

  /**
   * Deactivate chat mode
   */
  deactivate() {
    console.log('💬 CHAT DEACTIVATE: Deactivation started');
    
    if (!this.isActive) {
      console.log('💬 CHAT DEACTIVATE: Already inactive, skipping deactivation');
      return;
    }
    
    this.isActive = false;
    console.log('💬 CHAT DEACTIVATE: Set isActive to false');
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.removeClickHandler();
    console.log('💬 CHAT DEACTIVATE: Removed event listeners');
    
    // Clean up UI elements
    this.removeChatElements();
    this.hideChatIndicator();
    console.log('💬 CHAT DEACTIVATE: Removed UI elements');
    
    // Clear any existing timers
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
      console.log('💬 CHAT DEACTIVATE: Cleared typing timer');
    }
    
    // Get the global socket if this.socket is not available or not connected
    const socket = this.socket?.connected ? this.socket : window.socket;
    
    // Send fade message to others if we have text showing
    if (this.currentMessage.trim() !== "") {
      const fadeData = { userId: this.userId };
      
      if (socket?.connected) {
        console.log('💬 CHAT DEACTIVATE: Sending chat:fade to server');
        socket.emit('chat:fade', fadeData);
      } else {
        console.warn('💬 CHAT DEACTIVATE: Socket not connected, cannot send fade event');
      }
    }
    
    this.currentMessage = "";
    console.log('💬 CHAT DEACTIVATE: Deactivation complete');
  }

  /**
   * Create chat input and bubble elements
   * @param {number} initialX - Initial X position for the chat bubble
   * @param {number} initialY - Initial Y position for the chat bubble
   */
  createChatElements(initialX, initialY) {
    // Create chat input element (invisible but functional)
    this.chatInput = document.createElement('input');
    this.chatInput.className = 'chat-input';
    this.chatInput.style.position = 'absolute';
    this.chatInput.style.left = '-1000px'; // Hide it off-screen
    this.chatInput.style.opacity = '0';
    this.chatInput.addEventListener('input', this.handleInput);
    document.body.appendChild(this.chatInput);
    
    // Create chat bubble element
    this.chatBubble = document.createElement('div');
    this.chatBubble.className = 'chat-bubble';
    this.chatBubble.style.position = 'absolute';
    this.chatBubble.style.padding = '12px 20px'; // Larger padding for better appearance
    this.chatBubble.style.borderRadius = '20px'; // More rounded corners
    this.chatBubble.style.fontSize = '16px'; // Slightly larger font
    this.chatBubble.style.minWidth = '40px'; // Ensure minimum width
    this.chatBubble.style.maxWidth = '250px'; // Allow more width for messages
    this.chatBubble.style.wordBreak = 'break-word';
    this.chatBubble.style.whiteSpace = 'normal'; // Allow text to wrap
    this.chatBubble.style.overflow = 'hidden';
    this.chatBubble.style.textOverflow = 'ellipsis';
    this.chatBubble.style.color = 'white';
    this.chatBubble.style.zIndex = '999'; // Below cursor but above other elements
    this.chatBubble.style.opacity = '0';
    this.chatBubble.style.transition = 'opacity 0.3s ease';
    this.chatBubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; // Add shadow for depth
    
    // Get local cursor color to match bubble background
    const localCursor = document.querySelector('.local-cursor');
    if (localCursor) {
      // Find the photo container which has the colored border
      const photoContainer = localCursor.querySelector('.cursor-photo-container');
      if (photoContainer) {
        // Use the border color of the photo container
        const cursorColor = window.getComputedStyle(photoContainer).borderColor;
        this.chatBubble.style.backgroundColor = cursorColor;
      } else {
        this.chatBubble.style.backgroundColor = '#4285f4'; // Default blue
      }
    } else {
      this.chatBubble.style.backgroundColor = '#4285f4'; // Default blue
    }
    
    document.body.appendChild(this.chatBubble);
    
    // Position the chat bubble immediately at the current cursor position
    this.positionBubble(initialX, initialY);
  }

  /**
   * Remove chat elements from the DOM
   */
  removeChatElements() {
    if (this.chatInput) {
      this.chatInput.removeEventListener('input', this.handleInput);
      this.chatInput.parentNode?.removeChild(this.chatInput);
      this.chatInput = null;
    }
    
    if (this.chatBubble) {
      this.chatBubble.parentNode?.removeChild(this.chatBubble);
      this.chatBubble = null;
    }
  }

  /**
   * Handle keyboard input in chat mode
   */
  handleKeyDown(e) {
    // Only handle keys that we care about - let others pass through
    if (e.key === 'Escape') {
      e.preventDefault();
      console.log('💬 CHAT KEY: Escape key pressed, exiting chat mode');
      // Force switch to DEFAULT mode instead of using revertToPreviousMode
      if (window.modeManager?.MODES) {
        window.modeManager.switchMode(window.modeManager.MODES.DEFAULT);
      } else {
        console.error('💬 CHAT ERROR: modeManager or MODES not available');
        // Try to fall back to a string-based mode name
        if (window.modeManager) {
          window.modeManager.switchMode('default');
        }
      }
      return;
    }
    
    // Enter key to send message and exit chat mode
    if (e.key === 'Enter' && this.currentMessage.trim() !== "") {
      e.preventDefault();
      
      // Get the global socket if this.socket is not available or not connected
      const socket = this.socket?.connected ? this.socket : window.socket;
      
      // Prepare message data
      const messageData = {
        message: this.currentMessage,
        userId: this.userId
      };
      
      if (socket?.connected) {
        console.log('💬 CHAT EMIT: Sending chat:message to server:', messageData);
        socket.emit('chat:message', messageData);
      } else {
        console.warn('💬 CHAT EMIT FAILED: Socket not connected, cannot send message');
        console.log('💬 CHAT DEBUG: Socket state:', {
          localSocketExists: !!this.socket,
          localSocketConnected: this.socket?.connected,
          localSocketId: this.socket?.id,
          globalSocketExists: !!window.socket,
          globalSocketConnected: window.socket?.connected,
          globalSocketId: window.socket?.id
        });
      }
      
      this.resetTypingTimer();
      console.log('💬 CHAT KEY: Enter key pressed with message, exiting chat mode');
      
      if (window.modeManager?.MODES) {
        window.modeManager.switchMode(window.modeManager.MODES.DEFAULT);
      } else {
        console.error('💬 CHAT ERROR: modeManager or MODES not available');
        // Try to fall back to a string-based mode name
        if (window.modeManager) {
          window.modeManager.switchMode('default');
        }
      }
      return;
    }
    
    // Allow all other keys to be handled normally by the input
  }

  /**
   * Handle input in the chat input field
   */
  handleInput(e) {
    this.currentMessage = e.target.value;
    
    // Update the local chat bubble
    if (this.chatBubble) {
      this.chatBubble.textContent = this.currentMessage;
      this.chatBubble.style.opacity = '1';
    }
    
    // Get the global socket if this.socket is not available or not connected
    const socket = this.socket?.connected ? this.socket : window.socket;
    
    // Prepare typing data
    const typingData = {
      message: this.currentMessage,
      userId: this.userId
    };
    
    // Emit typing event to others
    if (socket?.connected) {
      console.log('💬 CHAT TYPING: Sending chat:typing to server');
      socket.emit('chat:typing', typingData);
    } else {
      console.warn('💬 CHAT TYPING FAILED: Socket not connected, cannot send typing event');
    }
    
    // Reset the typing timer
    this.resetTypingTimer();
  }

  /**
   * Position the chat bubble at a specific location
   * @param {number} x - X coordinate 
   * @param {number} y - Y coordinate
   */
  positionBubble(x, y) {
    if (!this.chatBubble) return;
    
    // Find the local cursor element to position the bubble relative to it
    const localCursor = document.querySelector('.local-cursor');
    if (localCursor) {
      const cursorRect = localCursor.getBoundingClientRect();
      
      // Position below the cursor, aligned to left edge of cursor
      const bubbleX = cursorRect.left;
      const bubbleY = cursorRect.bottom + 15; // Position below the cursor with some spacing
      
      this.chatBubble.style.left = `${bubbleX}px`;
      this.chatBubble.style.top = `${bubbleY}px`;
    } else {
      // Fallback positioning directly below mouse pointer
      this.chatBubble.style.left = `${x}px`;
      this.chatBubble.style.top = `${y + 50}px`;
    }
  }

  /**
   * Handle mouse movement to update chat bubble position
   */
  handleMouseMove(e) {
    if (!this.isActive || !this.chatBubble) return;
    
    // Update bubble position using the current mouse coordinates
    this.positionBubble(e.clientX, e.clientY);
  }

  /**
   * Set up click handler that maintains input focus
   */
  setupClickHandler() {
    // Create a click handler that maintains focus without preventing events
    this.clickHandler = () => {
      // Refocus the chat input after a very short delay
      // This allows click events to be processed first
      requestAnimationFrame(() => {
        if (this.chatInput && this.isActive) {
          this.chatInput.focus();
        }
      });
    };
    
    // Add the click handler to the document
    document.addEventListener('click', this.clickHandler);
  }

  /**
   * Remove click handler
   */
  removeClickHandler() {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
  }

  /**
   * Handle remote chat messages from other users
   */
  handleRemoteChat(data) {
    console.log('💬 CHAT RECEIVE: Received chat:message event:', data);
    
    // Check for required data fields
    if (!data || !data.message) {
      console.error('💬 CHAT RECEIVE ERROR: Invalid or missing message data', data);
      return;
    }
    
    if (!data.userId) {
      console.error('💬 CHAT RECEIVE ERROR: Missing userId in message data', data);
      return;
    }
    
    if (data.userId === this.userId) {
      console.log('💬 CHAT RECEIVE: Ignoring own message');
      return; // Ignore own messages
    }
    
    // Debug active users
    const activeUsers = window.activeUsers || new Map();
    console.log('💬 CHAT RECEIVE: Active users count:', activeUsers.size);
    console.log('💬 CHAT RECEIVE: Is sender in active users?', activeUsers.has(data.userId));
    
    // Find the remote user's cursor
    const remoteCursor = document.querySelector(`.remote-cursor[data-user-id="${data.userId}"]`);
    if (!remoteCursor) {
      console.warn('💬 CHAT RECEIVE: Remote cursor not found for user', data.userId);
      
      // Debug all remote cursors
      const allCursors = document.querySelectorAll('.remote-cursor');
      console.log('💬 CHAT RECEIVE DEBUG: All remote cursors:', Array.from(allCursors).map(cursor => {
        return {
          id: cursor.getAttribute('data-user-id'),
          visible: cursor.style.display !== 'none'
        };
      }));
      
      return;
    }
    
    console.log('💬 CHAT RECEIVE: Found remote cursor for user', data.userId, 'at position:', {
      top: remoteCursor.style.top,
      left: remoteCursor.style.left,
      visible: remoteCursor.style.display !== 'none',
      rect: remoteCursor.getBoundingClientRect()
    });
    
    // Create or update chat bubble for remote user
    let chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
    
    if (!chatBubble) {
      console.log('💬 CHAT RECEIVE: Creating new chat bubble for user', data.userId);
      chatBubble = document.createElement('div');
      chatBubble.className = 'remote-chat-bubble';
      chatBubble.setAttribute('data-user-id', data.userId);
      chatBubble.style.position = 'absolute';
      chatBubble.style.padding = '12px 20px'; // Larger padding
      chatBubble.style.borderRadius = '20px'; // More rounded corners
      chatBubble.style.fontSize = '16px'; // Slightly larger font
      chatBubble.style.minWidth = '40px'; // Ensure minimum width
      chatBubble.style.maxWidth = '250px'; // Allow more width for messages
      chatBubble.style.wordBreak = 'break-word';
      chatBubble.style.whiteSpace = 'normal'; // Allow text to wrap
      chatBubble.style.overflow = 'hidden';
      chatBubble.style.textOverflow = 'ellipsis';
      chatBubble.style.color = 'white';
      chatBubble.style.zIndex = '999'; // Below cursor but above other elements
      chatBubble.style.opacity = '1';
      chatBubble.style.transition = 'opacity 0.3s ease';
      chatBubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; // Add shadow for depth
      
      // Match the remote cursor's color (using border color)
      const photoContainer = remoteCursor.querySelector('.cursor-photo-container');
      if (photoContainer) {
        const cursorColor = window.getComputedStyle(photoContainer).borderColor;
        chatBubble.style.backgroundColor = cursorColor;
        console.log('💬 CHAT RECEIVE: Using cursor color for bubble:', cursorColor);
      } else {
        // Fallback to a default color
        chatBubble.style.backgroundColor = '#e74c3c';
        console.log('💬 CHAT RECEIVE: Using default color for bubble (cursor photo not found)');
      }
      
      // Debug parent element before appending
      console.log('💬 CHAT RECEIVE: Appending bubble to document.body, body exists:', !!document.body);
      
      // Try to append to playArea if it exists (for better z-index control)
      const playArea = document.getElementById('play-area');
      if (playArea) {
        console.log('💬 CHAT RECEIVE: Using play-area for chat bubble parent');
        playArea.appendChild(chatBubble);
      } else {
        console.log('💬 CHAT RECEIVE: Using document.body for chat bubble parent');
        document.body.appendChild(chatBubble);
      }
      
      console.log('💬 CHAT RECEIVE: Chat bubble created and appended to DOM');
    } else {
      console.log('💬 CHAT RECEIVE: Updating existing chat bubble for user', data.userId);
    }
    
    // Update position and content
    const rect = remoteCursor.getBoundingClientRect();
    chatBubble.textContent = data.message;
    console.log('💬 CHAT RECEIVE: Set bubble text to:', data.message);
    
    // Need to wait a tick for the width to update after setting content
    setTimeout(() => {
      // Position below and aligned with left edge of cursor
      chatBubble.style.left = `${rect.left}px`;
      chatBubble.style.top = `${rect.bottom + 15}px`;
      console.log('💬 CHAT RECEIVE: Positioned bubble at left:', rect.left, 'top:', rect.bottom + 15);
      
      // Debug final bubble state
      console.log('💬 CHAT RECEIVE: Bubble final state:', {
        width: chatBubble.offsetWidth,
        height: chatBubble.offsetHeight,
        text: chatBubble.textContent,
        visible: chatBubble.style.opacity !== '0',
        position: {
          left: chatBubble.style.left,
          top: chatBubble.style.top
        }
      });
    }, 0);
    
    // Set timer to fade out after delay
    setTimeout(() => {
      console.log('💬 CHAT RECEIVE: Starting fade out for bubble from user', data.userId);
      if (chatBubble?.parentNode) {
        chatBubble.style.opacity = '0';
        setTimeout(() => {
          if (chatBubble?.parentNode) {
            console.log('💬 CHAT RECEIVE: Removing bubble from DOM for user', data.userId);
            chatBubble.parentNode?.removeChild(chatBubble);
          }
        }, 300);
      }
    }, this.fadeOutDelay);
  }

  /**
   * Handle remote typing events from other users
   */
  handleRemoteTyping(data) {
    console.log('💬 CHAT TYPING RECEIVE: Received chat:typing event:', {
      userId: data.userId,
      messageLength: data.message?.length || 0
    });
    
    // Check for required data fields
    if (!data || !data.message) {
      console.error('💬 CHAT TYPING RECEIVE ERROR: Invalid or missing message data', data);
      return;
    }
    
    if (!data.userId) {
      console.error('💬 CHAT TYPING RECEIVE ERROR: Missing userId in message data', data);
      return;
    }
    
    if (data.userId === this.userId) {
      console.log('💬 CHAT TYPING RECEIVE: Ignoring own typing event');
      return; // Ignore own typing
    }
    
    // Debug active users
    const activeUsers = window.activeUsers || new Map();
    console.log('💬 CHAT TYPING RECEIVE: Active users count:', activeUsers.size);
    console.log('💬 CHAT TYPING RECEIVE: Is sender in active users?', activeUsers.has(data.userId));
    
    // Find the remote user's cursor
    const remoteCursor = document.querySelector(`.remote-cursor[data-user-id="${data.userId}"]`);
    if (!remoteCursor) {
      console.warn('💬 CHAT TYPING RECEIVE: Remote cursor not found for user', data.userId);
      
      // Debug all remote cursors
      const allCursors = document.querySelectorAll('.remote-cursor');
      console.log('💬 CHAT TYPING RECEIVE DEBUG: All remote cursors:', Array.from(allCursors).map(cursor => {
        return {
          id: cursor.getAttribute('data-user-id'),
          visible: cursor.style.display !== 'none'
        };
      }));
      
      return;
    }
    
    console.log('💬 CHAT TYPING RECEIVE: Found remote cursor for user', data.userId, 'at position:', {
      top: remoteCursor.style.top,
      left: remoteCursor.style.left,
      visible: remoteCursor.style.display !== 'none',
      rect: remoteCursor.getBoundingClientRect()
    });
    
    // Create or update chat bubble for remote user
    let chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
    
    if (!chatBubble) {
      console.log('💬 CHAT TYPING RECEIVE: Creating new chat bubble for user', data.userId);
      chatBubble = document.createElement('div');
      chatBubble.className = 'remote-chat-bubble';
      chatBubble.setAttribute('data-user-id', data.userId);
      chatBubble.style.position = 'absolute';
      chatBubble.style.padding = '12px 20px'; // Larger padding to match local bubble
      chatBubble.style.borderRadius = '20px'; // More rounded corners
      chatBubble.style.fontSize = '16px'; // Slightly larger font
      chatBubble.style.minWidth = '40px'; // Ensure minimum width
      chatBubble.style.maxWidth = '250px'; // Allow more width for messages
      chatBubble.style.wordBreak = 'break-word';
      chatBubble.style.whiteSpace = 'normal'; // Allow text to wrap
      chatBubble.style.overflow = 'hidden';
      chatBubble.style.textOverflow = 'ellipsis';
      chatBubble.style.color = 'white';
      chatBubble.style.zIndex = '999'; // Below cursor but above other elements
      chatBubble.style.opacity = '1';
      chatBubble.style.transition = 'opacity 0.3s ease';
      chatBubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; // Add shadow for depth
      
      // Match the remote cursor's color (using border color)
      const photoContainer = remoteCursor.querySelector('.cursor-photo-container');
      if (photoContainer) {
        const cursorColor = window.getComputedStyle(photoContainer).borderColor;
        chatBubble.style.backgroundColor = cursorColor;
        console.log('💬 CHAT TYPING RECEIVE: Using cursor color for bubble:', cursorColor);
      } else {
        // Fallback to a default color
        chatBubble.style.backgroundColor = '#e74c3c';
        console.log('💬 CHAT TYPING RECEIVE: Using default color for bubble (cursor photo not found)');
      }
      
      // Debug parent element before appending
      console.log('💬 CHAT TYPING RECEIVE: Appending bubble to document.body, body exists:', !!document.body);
      
      // Try to append to playArea if it exists (for better z-index control)
      const playArea = document.getElementById('play-area');
      if (playArea) {
        console.log('💬 CHAT TYPING RECEIVE: Using play-area for chat bubble parent');
        playArea.appendChild(chatBubble);
      } else {
        console.log('💬 CHAT TYPING RECEIVE: Using document.body for chat bubble parent');
        document.body.appendChild(chatBubble);
      }
      
      console.log('💬 CHAT TYPING RECEIVE: Chat bubble created and appended to DOM');
    } else {
      console.log('💬 CHAT TYPING RECEIVE: Updating existing chat bubble for user', data.userId);
    }
    
    // Update position and content
    const rect = remoteCursor.getBoundingClientRect();
    chatBubble.textContent = data.message;
    console.log('💬 CHAT TYPING RECEIVE: Set bubble text to message of length:', data.message.length);
    
    // Need to wait a tick for the width to update after setting content
    setTimeout(() => {
      // Position below and aligned with left edge of cursor
      chatBubble.style.left = `${rect.left}px`;
      chatBubble.style.top = `${rect.bottom + 15}px`;
      console.log('💬 CHAT TYPING RECEIVE: Positioned bubble at left:', rect.left, 'top:', rect.bottom + 15);
      
      // Debug final bubble state
      console.log('💬 CHAT TYPING RECEIVE: Bubble final state:', {
        width: chatBubble.offsetWidth,
        height: chatBubble.offsetHeight,
        textLength: chatBubble.textContent.length,
        visible: chatBubble.style.opacity !== '0',
        position: {
          left: chatBubble.style.left,
          top: chatBubble.style.top
        }
      });
    }, 0);
    
    // Clear any existing fade timer for this user
    const fadeTimerId = chatBubble.getAttribute('data-fade-timer');
    if (fadeTimerId) {
      clearTimeout(Number.parseInt(fadeTimerId));
    }
    
    // Set new fade timer
    const timerId = setTimeout(() => {
      if (chatBubble?.parentNode) {
        chatBubble.style.opacity = '0';
        setTimeout(() => {
          if (chatBubble?.parentNode) {
            chatBubble.parentNode?.removeChild(chatBubble);
          }
        }, 300);
      }
    }, this.fadeOutDelay);
    
    chatBubble.setAttribute('data-fade-timer', timerId);
  }

  /**
   * Handle remote fade events from other users
   */
  handleRemoteFade(data) {
    console.log('💬 CHAT FADE RECEIVE: Received chat:fade event:', data);
    
    if (data.userId === this.userId) {
      console.log('💬 CHAT FADE RECEIVE: Ignoring own fade event');
      return; // Ignore own fade events
    }
    
    const chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
    if (chatBubble) {
      console.log('💬 CHAT FADE RECEIVE: Fading out chat bubble for user', data.userId);
      chatBubble.style.opacity = '0';
      setTimeout(() => {
        if (chatBubble?.parentNode) {
          console.log('💬 CHAT FADE RECEIVE: Removing chat bubble for user', data.userId);
          chatBubble.parentNode?.removeChild(chatBubble);
        }
      }, 300);
    } else {
      console.warn('💬 CHAT FADE RECEIVE: No chat bubble found for user', data.userId);
    }
  }

  /**
   * Reset the typing inactivity timer
   */
  resetTypingTimer() {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    
    this.typingTimer = setTimeout(this.fadeOutMessage, this.fadeOutDelay);
  }

  /**
   * Fade out the message after inactivity
   */
  fadeOutMessage() {
    if (this.chatBubble) {
      this.chatBubble.style.opacity = '0';
    }
    
    // Get the global socket if this.socket is not available or not connected
    const socket = this.socket?.connected ? this.socket : window.socket;
    
    // Prepare fade data
    const fadeData = { 
      userId: this.userId 
    };
    
    // Notify others that we're no longer typing
    if (socket?.connected) {
      console.log('💬 CHAT FADE: Sending chat:fade to server');
      socket.emit('chat:fade', fadeData);
    } else {
      console.warn('💬 CHAT FADE FAILED: Socket not connected, cannot send fade event');
    }
  }

  /**
   * Show chat mode indicator
   */
  showChatIndicator() {
    let modeIndicator = document.querySelector('.mode-indicator');
    
    if (!modeIndicator) {
      modeIndicator = document.createElement('div');
      modeIndicator.className = 'mode-indicator';
      modeIndicator.style.position = 'fixed';
      modeIndicator.style.bottom = '20px';
      modeIndicator.style.left = '20px';
      modeIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      modeIndicator.style.color = 'white';
      modeIndicator.style.padding = '8px 12px';
      modeIndicator.style.borderRadius = '4px';
      modeIndicator.style.fontSize = '14px';
      modeIndicator.style.zIndex = '10001';
      document.body.appendChild(modeIndicator);
    } else {
      // Ensure it's positioned on the left even if it exists
      modeIndicator.style.left = '20px';
      modeIndicator.style.right = 'auto';
    }
    
    modeIndicator.textContent = 'CHAT MODE';
    modeIndicator.style.display = 'block';
  }

  /**
   * Hide chat mode indicator
   */
  hideChatIndicator() {
    const modeIndicator = document.querySelector('.mode-indicator');
    if (modeIndicator) {
      modeIndicator.style.display = 'none';
    }
  }
}

// Export the chat mode
const chatMode = new ChatMode();
export default chatMode; 