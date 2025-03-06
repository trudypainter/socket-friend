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
    this.socket = socket;
    this.userId = userId;
    
    // Set up socket event listeners for remote chat messages
    this.socket.on('chat:message', this.handleRemoteChat);
    this.socket.on('chat:typing', this.handleRemoteTyping);
    this.socket.on('chat:fade', this.handleRemoteFade);
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
    console.log('Chat mode: deactivate() method called');
    
    if (!this.isActive) {
      console.log('Chat mode: Already inactive, skipping deactivation');
      return;
    }
    
    this.isActive = false;
    console.log('Chat mode: Set isActive to false');
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.removeClickHandler();
    console.log('Chat mode: Removed event listeners');
    
    // Clean up UI elements
    this.removeChatElements();
    this.hideChatIndicator();
    console.log('Chat mode: Removed UI elements');
    
    // Clear any existing timers
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
      console.log('Chat mode: Cleared typing timer');
    }
    
    // Send fade message to others if we have text showing
    if (this.currentMessage.trim() !== "" && this.socket) {
      this.socket?.emit('chat:fade', { userId: this.userId });
      console.log('Chat mode: Sent fade message to others');
    }
    
    this.currentMessage = "";
    console.log('Chat mode: Deactivation complete');
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
      console.log('Chat mode: Escape key pressed, exiting chat mode');
      // Force switch to DEFAULT mode instead of using revertToPreviousMode
      if (window.modeManager?.MODES) {
        window.modeManager.switchMode(window.modeManager.MODES.DEFAULT);
      } else {
        console.error('Chat mode: modeManager or MODES not available');
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
      if (this.socket) {
        this.socket?.emit('chat:message', {
          message: this.currentMessage,
          userId: this.userId
        });
      }
      this.resetTypingTimer();
      console.log('Chat mode: Enter key pressed with message, exiting chat mode');
      if (window.modeManager?.MODES) {
        window.modeManager.switchMode(window.modeManager.MODES.DEFAULT);
      } else {
        console.error('Chat mode: modeManager or MODES not available');
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
    
    // Emit typing event to others
    if (this.socket) {
      this.socket?.emit('chat:typing', {
        message: this.currentMessage,
        userId: this.userId
      });
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
    if (data.userId === this.userId) return; // Ignore own messages
    
    // Find the remote user's cursor
    const remoteCursor = document.querySelector(`.remote-cursor[data-user-id="${data.userId}"]`);
    if (!remoteCursor) return;
    
    // Create or update chat bubble for remote user
    let chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
    
    if (!chatBubble) {
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
      } else {
        // Fallback to a default color
        chatBubble.style.backgroundColor = '#e74c3c';
      }
      
      document.body.appendChild(chatBubble);
    }
    
    // Update position and content
    const rect = remoteCursor.getBoundingClientRect();
    chatBubble.textContent = data.message;
    
    // Need to wait a tick for the width to update after setting content
    setTimeout(() => {
      // Position below and aligned with left edge of cursor
      chatBubble.style.left = `${rect.left}px`;
      chatBubble.style.top = `${rect.bottom + 15}px`;
    }, 0);
    
    // Set timer to fade out after delay
    setTimeout(() => {
      if (chatBubble?.parentNode) {
        chatBubble.style.opacity = '0';
        setTimeout(() => {
          if (chatBubble?.parentNode) {
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
    if (data.userId === this.userId) return; // Ignore own typing
    
    // Find the remote user's cursor
    const remoteCursor = document.querySelector(`.remote-cursor[data-user-id="${data.userId}"]`);
    if (!remoteCursor) return;
    
    // Create or update chat bubble for remote user
    let chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
    
    if (!chatBubble) {
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
      } else {
        // Fallback to a default color
        chatBubble.style.backgroundColor = '#e74c3c';
      }
      
      document.body.appendChild(chatBubble);
    }
    
    // Update position and content
    const rect = remoteCursor.getBoundingClientRect();
    
    // Position the bubble below and aligned with left edge of cursor
    chatBubble.textContent = data.message;
    
    // Need to wait a tick for the width to update after setting content
    setTimeout(() => {
      // Position below and aligned with left edge of cursor
      chatBubble.style.left = `${rect.left}px`;
      chatBubble.style.top = `${rect.bottom + 15}px`;
      chatBubble.style.opacity = '1';
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
    const chatBubble = document.querySelector(`.remote-chat-bubble[data-user-id="${data.userId}"]`);
    if (chatBubble) {
      chatBubble.style.opacity = '0';
      setTimeout(() => {
        if (chatBubble?.parentNode) {
          chatBubble.parentNode?.removeChild(chatBubble);
        }
      }, 300);
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
    
    // Notify others that we're no longer typing
    this.socket.emit('chat:fade', { userId: this.userId });
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