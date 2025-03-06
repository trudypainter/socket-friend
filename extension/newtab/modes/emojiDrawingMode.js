/**
 * Emoji Drawing Mode for Socket Friends
 * Places emojis along the cursor path when holding D key
 */

import eventBus from '../utils/eventBus.js';

class EmojiDrawingMode {
  constructor() {
    this.isActive = false;
    this.socket = null;
    this.userId = null;
    this.emojis = ['💩', '⭐️', '❤️', '🤠', '🤮'];
    this.emojiSize = 40; // Default size, will be updated based on cursor
    this.lastPosition = null;
    this.minDistance = 30; // Minimum distance before placing a new emoji
    this.fadeTimeout = 2000; // Time in ms before emoji starts to fade
    
    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleRemoteEmoji = this.handleRemoteEmoji.bind(this);
  }
  
  /**
   * Initialize the emoji drawing mode
   * @param {Object} socket - Socket.io instance
   * @param {string} userId - Current user ID
   */
  init(socket, userId) {
    console.log('🎭 EMOJI INIT: Initializing emoji drawing mode', { socketExists: !!socket, socketId: socket?.id });
    
    // Store socket reference
    this.socket = socket;
    this.userId = userId;
    
    // Add debug info
    if (!socket) {
      console.error('🎭 EMOJI INIT ERROR: Socket is null or undefined');
    } else if (!socket.connected) {
      console.warn('🎭 EMOJI INIT WARNING: Socket exists but is not connected');
    } else {
      console.log('🎭 EMOJI INIT: Socket is properly connected with ID:', socket.id);
    }
    
    // Try to determine emoji size from cursor element
    const localCursor = document.getElementById('local-cursor');
    if (localCursor) {
      const photoContainer = localCursor.querySelector('.cursor-photo-container');
      if (photoContainer) {
        // Get computed style to find actual size
        const style = window.getComputedStyle(photoContainer);
        this.emojiSize = Number.parseInt(style.width, 10) || 40;
      }
    }
    
    console.log('🎭 EMOJI INIT: Emoji drawing mode initialized with size', this.emojiSize);
  }
  
  /**
   * Activate emoji drawing mode
   * @param {Object} state - Mode state
   */
  activate(state) {
    if (this.isActive) return;
    
    this.isActive = true;
    
    if (state.emojis) {
      this.emojis = state.emojis;
    }
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    
    // Reset last position
    this.lastPosition = null;
    
    console.log('🔣 EMOJI: Emoji drawing mode activated');
    
    // Show visual indicator that emoji drawing mode is active
    this.showModeIndicator();
  }
  
  /**
   * Deactivate emoji drawing mode
   */
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    
    console.log('🔣 EMOJI: Emoji drawing mode deactivated');
    
    // Hide visual indicator
    this.hideModeIndicator();
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(e) {
    if (!this.isActive) return;
    
    // Get current position
    const currentPosition = { x: e.clientX, y: e.clientY };
    
    // Check if we have a last position and if we've moved enough
    if (this.lastPosition) {
      const distance = this.getDistance(this.lastPosition, currentPosition);
      
      if (distance >= this.minDistance) {
        // Place an emoji
        this.placeEmoji(currentPosition.x, currentPosition.y);
        
        // Update last position
        this.lastPosition = currentPosition;
      }
    } else {
      // First movement, place an emoji and set last position
      this.placeEmoji(currentPosition.x, currentPosition.y);
      this.lastPosition = currentPosition;
    }
  }
  
  /**
   * Calculate distance between two points
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @returns {number} Distance
   */
  getDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Place an emoji at specified position
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  placeEmoji(x, y) {
    // Select a random emoji
    const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
    
    // Create the emoji element
    this.createEmojiElement(x, y, emoji);
    
    // Get the global socket if this.socket is not available or not connected
    const socket = this.socket?.connected ? this.socket : window.socket;
    
    // Emit event to server with userId
    if (socket?.connected) {
      const emojiData = {
        userId: this.userId,
        position: { x, y },
        emoji,
        size: this.emojiSize,
        timestamp: Date.now()
      };
      
      console.log('🚀 EMOJI EMIT: Sending emoji:draw to server:', emojiData);
      socket.emit('emoji:draw', emojiData);
      
      // Debug socket state
      console.log('🔌 SOCKET STATE:', {
        connected: true,
        id: socket.id
      });
    } else {
      console.warn('⚠️ EMOJI EMIT FAILED: Socket not connected or unavailable');
      console.log('🔍 EMOJI DEBUG: Local socket state:', {
        socketExists: !!this.socket,
        localSocketConnected: this.socket?.connected,
        localSocketId: this.socket?.id,
        globalSocketExists: !!window.socket,
        globalSocketConnected: window.socket?.connected,
        globalSocketId: window.socket?.id
      });
    }
    
    // Emit event locally
    const localEventData = {
      userId: this.userId,
      position: { x, y },
      emoji,
      size: this.emojiSize,
      timestamp: Date.now()
    };
    
    console.log('📢 EMOJI LOCAL: Emitting local emoji:draw event:', localEventData);
    eventBus.emit('emoji:draw', localEventData);
  }
  
  /**
   * Handle remote emoji event - this is now a fallback
   * as the main handling is done in newtab.js
   * @param {Object} data - Emoji event data
   */
  handleRemoteEmoji(data) {
    // This method is kept for backward compatibility
    // but is no longer the primary handler for remote emoji events
    console.log('🔣 EMOJI: Received remote emoji event in mode handler (deprecated)');
  }
  
  /**
   * Create an emoji element
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} emoji - Emoji character
   * @param {number} size - Size of emoji (optional)
   */
  createEmojiElement(x, y, emoji, size = this.emojiSize) {
    // Get play area
    const playArea = document.getElementById('play-area');
    if (!playArea) {
      console.error('🔣 EMOJI: Play area not found');
      return;
    }
    
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
    
    // Add to DOM
    playArea.appendChild(element);
    
    // Set timeout for fading
    setTimeout(() => {
      element.style.opacity = '0';
      
      // Remove after fade
      setTimeout(() => {
        element.remove();
      }, 1000);
    }, this.fadeTimeout);
  }
  
  /**
   * Show visual indicator that emoji drawing mode is active
   */
  showModeIndicator() {
    // Create indicator if it doesn't exist
    let indicator = document.getElementById('emoji-drawing-mode-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'emoji-drawing-mode-indicator';
      indicator.style.position = 'fixed';
      indicator.style.bottom = '20px';
      indicator.style.left = '20px';
      indicator.style.padding = '10px';
      indicator.style.background = 'rgba(0, 0, 0, 0.7)';
      indicator.style.color = 'white';
      indicator.style.borderRadius = '5px';
      indicator.style.fontFamily = 'Arial, sans-serif';
      indicator.style.zIndex = '1000';
      indicator.style.display = 'none';
      
      document.body.appendChild(indicator);
    }
    
    indicator.textContent = '🔣 Emoji Drawing Mode Active (Release D to exit)';
    indicator.style.display = 'block';
  }
  
  /**
   * Hide visual indicator
   */
  hideModeIndicator() {
    const indicator = document.getElementById('emoji-drawing-mode-indicator');
    
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
}

// Export singleton instance
const emojiDrawingMode = new EmojiDrawingMode();
export default emojiDrawingMode; 