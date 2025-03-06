/**
 * Mode Manager for Socket Friends
 * Manages different interaction modes for users
 */

// Import EventBus
import eventBus from './eventBus.js';

// Define available modes
const MODES = {
  DEFAULT: 'default',
  DRAWING: 'drawing',
  MUSIC: 'music',
  COMBAT: 'combat',
  EMOJI_DRAWING: 'emoji_drawing', // New mode for emoji drawing when holding D
  SWORD_COMBAT: 'sword_combat', // New mode for sword combat when holding S
  CHAT: 'chat', // New mode for chatting when pressing /
};

class ModeManager {
  constructor() {
    this.currentMode = MODES.DEFAULT;
    this.modeHandlers = {};
    this.socket = null;
    this.userId = null;
    this.previousMode = null; // Store previous mode for returning after temporary modes
    
    // Initialize mode-specific state
    this.modeState = {
      [MODES.DEFAULT]: {},
      [MODES.DRAWING]: { isDrawing: false, color: '#000000', width: 2 },
      [MODES.EMOJI_DRAWING]: { isDrawing: false, emojis: ['💩', '⭐️', '❤️', '🤠', '🤮'] },
      [MODES.MUSIC]: { instrument: 'piano', volume: 0.5 },
      [MODES.COMBAT]: { weapon: 'sword', power: 1.0 },
      [MODES.SWORD_COMBAT]: { 
        weapon: 'sword', 
        power: 1.0,
        velocity: { x: 0, y: 0 },
        lastPosition: null,
        wobbleAmount: 0.2
      },
      [MODES.CHAT]: {
        isTyping: false,
        fadeOutDelay: 3000, // 3 seconds before fade out
      },
    };
    
    // Set up keyboard listeners for mode switching
    this._setupKeyboardListeners();
  }
  
  /**
   * Initialize the mode manager with socket and user info
   * @param {Object} socket - Socket.io instance
   * @param {string} userId - Current user ID
   */
  init(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    
    // Expose the MODES object for external use
    this.MODES = MODES;
    
    // Set up socket event for mode changes from others
    socket.on('mode:change', this._handleRemoteModeChange.bind(this));
    
    console.log('🎮 MODE: Mode manager initialized');
  }
  
  /**
   * Register a mode handler
   * @param {string} mode - Mode name
   * @param {Object} handler - Mode handler with activate and deactivate methods
   */
  registerMode(mode, handler) {
    this.modeHandlers[mode] = handler;
    console.log(`🎮 MODE: Registered handler for ${mode} mode`);
  }
  
  /**
   * Switch to a different mode
   * @param {string} newMode - Mode to switch to
   * @param {boolean} isTemporary - Whether the mode is temporary (will revert when deactivated)
   */
  switchMode(newMode, isTemporary = false) {
    if (!MODES[newMode.toUpperCase()]) {
      console.error(`🎮 MODE: Unknown mode: ${newMode}`);
      return;
    }
    
    const actualMode = MODES[newMode.toUpperCase()];
    
    // Skip if already in this mode
    if (this.currentMode === actualMode) return;
    
    // Store previous mode if this is a temporary switch
    if (isTemporary) {
      this.previousMode = this.currentMode;
    } else {
      // Reset previous mode if this is a permanent switch
      this.previousMode = null;
    }
    
    // Deactivate current mode
    if (this.modeHandlers[this.currentMode]?.deactivate) {
      this.modeHandlers[this.currentMode].deactivate();
    }
    
    const previousMode = this.currentMode;
    this.currentMode = actualMode;
    
    // Activate new mode
    if (this.modeHandlers[actualMode]?.activate) {
      this.modeHandlers[actualMode].activate(this.modeState[actualMode]);
    }
    
    // Emit event locally
    eventBus.emit('mode:change', {
      userId: this.userId,
      mode: actualMode,
      previousMode,
      timestamp: Date.now()
    });
    
    // Emit event to server if socket is available
    if (this.socket?.connected) {
      this.socket.emit('mode:change', {
        mode: actualMode,
        timestamp: Date.now()
      });
    }
    
    console.log(`🎮 MODE: Switched from ${previousMode} to ${actualMode} mode`);
  }
  
  /**
   * Revert to previous mode (used after temporary mode ends)
   */
  revertToPreviousMode() {
    if (this.previousMode) {
      this.switchMode(this.previousMode);
      this.previousMode = null;
    } else {
      this.switchMode(MODES.DEFAULT);
    }
  }
  
  /**
   * Get the current mode
   * @returns {string} Current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }
  
  /**
   * Get state for a specific mode
   * @param {string} mode - Mode name
   * @returns {Object} Mode state
   */
  getModeState(mode) {
    return this.modeState[mode] || {};
  }
  
  /**
   * Update state for a specific mode
   * @param {string} mode - Mode name
   * @param {Object} updates - State updates
   */
  updateModeState(mode, updates) {
    if (!this.modeState[mode]) {
      this.modeState[mode] = {};
    }
    
    this.modeState[mode] = {
      ...this.modeState[mode],
      ...updates
    };
    
    // Emit event locally
    eventBus.emit('mode:stateChange', {
      userId: this.userId,
      mode,
      state: this.modeState[mode],
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle remote mode change event
   * @param {Object} data - Event data
   * @private
   */
  _handleRemoteModeChange(data) {
    // Emit event locally for others to react to
    eventBus.emit('user:modeChange', {
      userId: data.userId,
      mode: data.mode,
      timestamp: data.timestamp
    });
    
    console.log(`🎮 MODE: User ${data.userId} switched to ${data.mode} mode`);
  }
  
  /**
   * Check if current mode should block other modes from activating
   * @returns {boolean} True if current mode should block others
   * @private
   */
  _isBlockingMode() {
    // Add any modes that should block other modes here
    const isBlocking = this.currentMode === MODES.CHAT;
    if (isBlocking) {
      console.log('ModeManager: Currently in blocking mode:', this.currentMode);
    }
    return isBlocking;
  }
  
  /**
   * Set up keyboard listeners for mode switching
   * @private
   */
  _setupKeyboardListeners() {
    // Track key states
    const keyStates = {
      d: false,
      m: false,
      s: false
    };
    
    // Function to reset all key states
    const resetKeyStates = () => {
      keyStates.d = false;
      keyStates.s = false;
      keyStates.m = false;
    };
    
    // Handle key down events
    document.addEventListener('keydown', (e) => {
      // Only trigger if not in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      // If we're in a blocking mode like chat, only allow ESC and slash to exit
      if (this._isBlockingMode()) {
        // Allow ESC key to exit to default mode
        if (e.key === 'Escape') {
          console.log('ModeManager: Escape key pressed while in blocking mode, switching to DEFAULT');
          resetKeyStates(); // Reset key states before switching
          this.switchMode(MODES.DEFAULT);
          return;
        }
        
        // Allow slash to toggle chat mode
        if (key === '/') {
          e.preventDefault();
          console.log('ModeManager: / key pressed while in blocking mode, switching to DEFAULT');
          resetKeyStates(); // Reset key states before switching
          this.switchMode(MODES.DEFAULT);
          return;
        }
        
        // Block all other mode switching
        return;
      }
      
      // Handle special case for D key hold (emoji drawing)
      if (key === 'd' && !keyStates.d) {
        keyStates.d = true;
        this.switchMode(MODES.EMOJI_DRAWING, true); // true for temporary mode
        return;
      }
      
      // Handle special case for S key hold (sword combat)
      if (key === 's' && !keyStates.s) {
        keyStates.s = true;
        this.switchMode(MODES.SWORD_COMBAT, true); // true for temporary mode
        return;
      }
      
      // Toggle chat mode on "/" key press
      if (key === '/') {
        e.preventDefault(); // Prevent the key from appearing in browser find
        
        // If already in chat mode, switch to default
        if (this.currentMode === MODES.CHAT) {
          resetKeyStates(); // Reset key states before switching
          this.switchMode(MODES.DEFAULT);
        } else {
          // Otherwise switch to chat mode
          resetKeyStates(); // Reset key states before switching
          this.switchMode(MODES.CHAT);
        }
        return;
      }
      
      // Regular mode switching on press
      switch (e.key.toUpperCase()) {
        case 'M':
          if (!keyStates.m) {
            keyStates.m = true;
            this.switchMode(MODES.MUSIC);
          }
          break;
        case 'ESCAPE':
          resetKeyStates(); // Reset key states before switching
          this.switchMode(MODES.DEFAULT);
          break;
      }
    });
    
    // Handle key up events to detect when keys are released
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      
      // If we're in a blocking mode like chat, don't process key up events
      if (this._isBlockingMode()) {
        return;
      }
      
      if (key === 'd') {
        keyStates.d = false;
        if (this.currentMode === MODES.EMOJI_DRAWING) {
          this.revertToPreviousMode();
        }
      } else if (key === 's') {
        keyStates.s = false;
        if (this.currentMode === MODES.SWORD_COMBAT) {
          this.revertToPreviousMode();
        }
      } else if (key === 'm') {
        keyStates.m = false;
      }
    });
    
    // Handle window/tab blur to reset temporary modes
    window.addEventListener('blur', () => {
      // Reset all key states
      resetKeyStates();
      
      // If in a temporary mode, revert
      if (this.currentMode === MODES.EMOJI_DRAWING || this.currentMode === MODES.SWORD_COMBAT) {
        this.revertToPreviousMode();
      }
    });
  }
}

// Export available modes and singleton instance
export const AVAILABLE_MODES = MODES;
const modeManager = new ModeManager();
window.ModeManager = modeManager;
export default modeManager; 