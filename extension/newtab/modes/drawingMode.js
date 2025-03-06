/**
 * Drawing Mode for Socket Friends
 * Allows users to draw on the screen
 */

import eventBus from '../utils/eventBus.js';

class DrawingMode {
  constructor() {
    this.isActive = false;
    this.isDrawing = false;
    this.canvas = null;
    this.context = null;
    this.socket = null;
    this.userId = null;
    this.color = '#000000';
    this.width = 2;
    this.lastPosition = null;
    
    // Bind methods
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleRemoteDrawing = this.handleRemoteDrawing.bind(this);
  }
  
  /**
   * Initialize the drawing mode
   * @param {Object} socket - Socket.io instance
   * @param {string} userId - Current user ID
   */
  init(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    
    // Create canvas for drawing
    this.createCanvas();
    
    // Listen for remote drawing events
    if (socket) {
      socket.on('drawing:stroke', this.handleRemoteDrawing);
    }
    
    console.log('🎨 DRAWING: Drawing mode initialized');
  }
  
  /**
   * Activate drawing mode
   * @param {Object} state - Mode state
   */
  activate(state) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.color = state.color || '#000000';
    this.width = state.width || 2;
    
    // Show canvas
    if (this.canvas) {
      this.canvas.style.display = 'block';
    }
    
    // Add event listeners
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    console.log('🎨 DRAWING: Drawing mode activated');
    
    // Show visual indicator that drawing mode is active
    this.showModeIndicator();
  }
  
  /**
   * Deactivate drawing mode
   */
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.isDrawing = false;
    
    // Hide canvas
    if (this.canvas) {
      // Don't hide the canvas, just stop drawing
      // this.canvas.style.display = 'none';
    }
    
    // Remove event listeners
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    console.log('🎨 DRAWING: Drawing mode deactivated');
    
    // Hide visual indicator
    this.hideModeIndicator();
  }
  
  /**
   * Create canvas for drawing
   */
  createCanvas() {
    // Check if canvas already exists
    let canvas = document.getElementById('drawing-canvas');
    
    if (!canvas) {
      // Create new canvas
      canvas = document.createElement('canvas');
      canvas.id = 'drawing-canvas';
      canvas.className = 'drawing-canvas';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none'; // Let clicks pass through
      canvas.style.zIndex = '5'; // Above the page, below cursors
      
      // Add to DOM
      const playArea = document.getElementById('play-area');
      if (playArea) {
        playArea.appendChild(canvas);
      } else {
        document.body.appendChild(canvas);
      }
      
      // Set canvas size to match window
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Handle window resize
      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    }
    
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    
    // Hide canvas initially
    this.canvas.style.display = 'none';
  }
  
  /**
   * Handle mouse down event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseDown(e) {
    if (!this.isActive) return;
    
    this.isDrawing = true;
    this.lastPosition = { x: e.clientX, y: e.clientY };
    
    // Start a new path
    this.context.beginPath();
    this.context.moveTo(e.clientX, e.clientY);
    
    // Emit event locally
    eventBus.emit('drawing:start', {
      userId: this.userId,
      position: this.lastPosition,
      color: this.color,
      width: this.width,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(e) {
    if (!this.isActive || !this.isDrawing) return;
    
    // Draw line
    this.context.lineWidth = this.width;
    this.context.lineCap = 'round';
    this.context.strokeStyle = this.color;
    
    this.context.lineTo(e.clientX, e.clientY);
    this.context.stroke();
    
    // Get current position
    const currentPosition = { x: e.clientX, y: e.clientY };
    
    // Emit event to server
    if (this.socket?.connected) {
      this.socket.emit('drawing:stroke', {
        points: [this.lastPosition, currentPosition],
        color: this.color,
        width: this.width,
        timestamp: Date.now()
      });
    }
    
    // Emit event locally
    eventBus.emit('drawing:stroke', {
      userId: this.userId,
      points: [this.lastPosition, currentPosition],
      color: this.color,
      width: this.width,
      timestamp: Date.now()
    });
    
    // Update last position
    this.lastPosition = currentPosition;
  }
  
  /**
   * Handle mouse up event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseUp() {
    if (!this.isActive) return;
    
    this.isDrawing = false;
    
    // End the path
    this.context.closePath();
    
    // Emit event locally
    eventBus.emit('drawing:end', {
      userId: this.userId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle remote drawing event
   * @param {Object} data - Drawing event data
   */
  handleRemoteDrawing(data) {
    if (!this.isActive || !this.context || !data.points || data.points.length < 2) return;
    
    // Draw line
    this.context.beginPath();
    this.context.lineWidth = data.width || 2;
    this.context.lineCap = 'round';
    this.context.strokeStyle = data.color || '#000000';
    
    this.context.moveTo(data.points[0].x, data.points[0].y);
    this.context.lineTo(data.points[1].x, data.points[1].y);
    this.context.stroke();
    this.context.closePath();
  }
  
  /**
   * Show visual indicator that drawing mode is active
   */
  showModeIndicator() {
    // Create indicator if it doesn't exist
    let indicator = document.getElementById('drawing-mode-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'drawing-mode-indicator';
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
    
    indicator.textContent = '🎨 Drawing Mode Active (ESC to exit)';
    indicator.style.display = 'block';
  }
  
  /**
   * Hide visual indicator
   */
  hideModeIndicator() {
    const indicator = document.getElementById('drawing-mode-indicator');
    
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
}

// Export singleton instance
const drawingMode = new DrawingMode();
export default drawingMode; 