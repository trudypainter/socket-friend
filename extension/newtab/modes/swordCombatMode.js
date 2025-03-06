/**
 * Sword Combat Mode for Socket Friends
 * Implements physics-based sword combat with cursor collision detection
 */

import eventBus from '../utils/eventBus.js';

class SwordCombatMode {
  constructor() {
    this.isActive = false;
    this.socket = null;
    this.userId = null;
    this.swordElement = null;
    this.lastPosition = null;
    this.velocity = { x: 0, y: 0 };
    this.wobbleAmount = 0.2;
    this.swordLength = 100;
    this.swordWidth = 20;
    this.damping = 0.9; // Damping factor for physics
    this.animationFrame = null;
    this.lastTimestamp = 0;
    this.hitCooldown = false;
    this.hitCooldownTime = 500; // ms
    
    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleRemoteAttack = this.handleRemoteAttack.bind(this);
    this.updatePhysics = this.updatePhysics.bind(this);
    this.checkCollisions = this.checkCollisions.bind(this);
  }
  
  /**
   * Initialize the sword combat mode
   * @param {Object} socket - Socket.io instance
   * @param {string} userId - Current user ID
   */
  init(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    
    // Listen for remote attack events
    if (socket) {
      socket.on('sword:attack', this.handleRemoteAttack);
    }
    
    console.log('⚔️ SWORD: Sword combat mode initialized');
  }
  
  /**
   * Activate sword combat mode
   * @param {Object} state - Mode state
   */
  activate(state) {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Initialize state from provided state
    if (state) {
      this.wobbleAmount = state.wobbleAmount || 0.2;
      this.velocity = { x: 0, y: 0 }; // Always reset velocity on activation
      this.lastPosition = null;
    }
    
    // Create sword element
    this.createSwordElement();
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mousedown', this.handleMouseDown);
    
    // Start physics loop
    this.lastTimestamp = performance.now();
    this.animationFrame = requestAnimationFrame(this.updatePhysics);
    
    console.log('⚔️ SWORD: Sword combat mode activated');
    
    // Show visual indicator that sword combat mode is active
    this.showModeIndicator();
  }
  
  /**
   * Deactivate sword combat mode
   */
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove sword element
    if (this.swordElement) {
      this.swordElement.remove();
      this.swordElement = null;
    }
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    
    // Stop physics loop
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    console.log('⚔️ SWORD: Sword combat mode deactivated');
    
    // Hide visual indicator
    this.hideModeIndicator();
  }
  
  /**
   * Create sword element
   */
  createSwordElement() {
    // Remove existing sword if any
    if (this.swordElement) {
      this.swordElement.remove();
    }
    
    // Create SVG element for the sword
    const svgNS = 'http://www.w3.org/2000/svg';
    this.swordElement = document.createElementNS(svgNS, 'svg');
    this.swordElement.setAttribute('width', `${this.swordLength + 20}px`);
    this.swordElement.setAttribute('height', `${this.swordLength + 20}px`);
    this.swordElement.setAttribute('viewBox', `0 0 ${this.swordLength + 20} ${this.swordLength + 20}`);
    this.swordElement.style.position = 'absolute';
    this.swordElement.style.pointerEvents = 'none';
    this.swordElement.style.zIndex = '100';
    this.swordElement.style.filter = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))';
    this.swordElement.id = 'sword-element';
    
    // Create the sword blade (rectangle)
    const blade = document.createElementNS(svgNS, 'rect');
    blade.setAttribute('x', '10');
    blade.setAttribute('y', '10');
    blade.setAttribute('width', `${this.swordWidth}`);
    blade.setAttribute('height', `${this.swordLength}`);
    blade.setAttribute('fill', 'black');
    blade.setAttribute('stroke', '#333');
    blade.setAttribute('stroke-width', '2');
    blade.setAttribute('rx', '2');
    blade.id = 'sword-blade';
    
    // Add the blade to the SVG
    this.swordElement.appendChild(blade);
    
    // Add to DOM
    document.body.appendChild(this.swordElement);
    
    // Set initial position off-screen
    this.swordElement.style.left = '-1000px';
    this.swordElement.style.top = '-1000px';
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(e) {
    if (!this.isActive || !this.swordElement) return;
    
    const currentPosition = { x: e.clientX, y: e.clientY };
    
    // Calculate velocity if we have a last position
    if (this.lastPosition) {
      // Calculate new velocity based on mouse movement
      this.velocity.x = (currentPosition.x - this.lastPosition.x) * 0.3;
      this.velocity.y = (currentPosition.y - this.lastPosition.y) * 0.3;
    }
    
    // Update last position
    this.lastPosition = { ...currentPosition };
    
    // Position the sword element at the cursor
    this.swordElement.style.left = `${currentPosition.x - 10}px`;
    this.swordElement.style.top = `${currentPosition.y - 10}px`;
  }
  
  /**
   * Handle mouse down event (attack)
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseDown(e) {
    if (!this.isActive || !this.swordElement || this.hitCooldown) return;
    
    // Increase wobble for attack
    this.wobbleAmount = 0.8;
    
    // Emit attack event
    if (this.socket?.connected) {
      this.socket.emit('sword:attack', {
        position: { x: e.clientX, y: e.clientY },
        velocity: this.velocity,
        timestamp: Date.now()
      });
    }
    
    // Emit event locally
    eventBus.emit('sword:attack', {
      userId: this.userId,
      position: { x: e.clientX, y: e.clientY },
      velocity: this.velocity,
      timestamp: Date.now()
    });
    
    // Set cooldown
    this.hitCooldown = true;
    setTimeout(() => {
      this.hitCooldown = false;
      this.wobbleAmount = 0.2;
    }, this.hitCooldownTime);
  }
  
  /**
   * Handle remote attack event
   * @param {Object} data - Attack event data
   */
  handleRemoteAttack(data) {
    if (!this.isActive) return;
    
    // Create attack effect
    this.createAttackEffect(data.position.x, data.position.y);
    
    // Check if this attack hits us
    this.checkHit(data);
  }
  
  /**
   * Update physics simulation
   * @param {number} timestamp - Current timestamp
   */
  updatePhysics(timestamp) {
    if (!this.isActive || !this.swordElement) {
      return;
    }
    
    // Calculate delta time
    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    
    // Apply damping to velocity
    this.velocity.x *= this.damping;
    this.velocity.y *= this.damping;
    
    // Get the blade element
    const blade = document.getElementById('sword-blade');
    if (blade) {
      // Calculate rotation based on velocity and wobble
      const rotationX = this.velocity.y * this.wobbleAmount * 10;
      const rotationY = -this.velocity.x * this.wobbleAmount * 10;
      
      // Apply rotation transform to the blade
      blade.setAttribute('transform', `rotate(${rotationX + rotationY} ${this.swordWidth / 2 + 10} ${this.swordLength / 2 + 10})`);
    }
    
    // Check for collisions with other cursors
    this.checkCollisions();
    
    // Continue the animation loop
    this.animationFrame = requestAnimationFrame(this.updatePhysics);
  }
  
  /**
   * Check for collisions with other cursors
   */
  checkCollisions() {
    if (!this.isActive || !this.swordElement || this.hitCooldown) return;
    
    // Get all remote cursors
    const remoteCursors = document.querySelectorAll('.remote-cursor');
    
    // Get sword position and dimensions
    const swordRect = this.swordElement.getBoundingClientRect();
    
    // Check each cursor for collision
    for (const cursor of remoteCursors) {
      const cursorRect = cursor.getBoundingClientRect();
      
      // Simple rectangle collision detection
      if (this.rectsIntersect(swordRect, cursorRect)) {
        // Get user ID from cursor
        const userId = cursor.id.replace('cursor-', '');
        
        // Create hit effect
        this.createHitEffect(cursorRect.left + cursorRect.width / 2, cursorRect.top + cursorRect.height / 2);
        
        // Emit hit event
        if (this.socket?.connected) {
          this.socket.emit('sword:hit', {
            targetId: userId,
            position: { 
              x: cursorRect.left + cursorRect.width / 2, 
              y: cursorRect.top + cursorRect.height / 2 
            },
            timestamp: Date.now()
          });
        }
        
        // Set cooldown
        this.hitCooldown = true;
        setTimeout(() => {
          this.hitCooldown = false;
        }, this.hitCooldownTime);
        
        // Only hit one cursor at a time
        break;
      }
    }
  }
  
  /**
   * Check if we were hit by a remote attack
   * @param {Object} data - Attack data
   */
  checkHit(data) {
    if (!this.isActive) return;
    
    // Get local cursor
    const localCursor = document.getElementById('local-cursor');
    if (!localCursor) return;
    
    // Get cursor position
    const cursorRect = localCursor.getBoundingClientRect();
    
    // Check if attack position is close to our cursor
    const distance = Math.sqrt(
      (data.position.x - (cursorRect.left + cursorRect.width / 2)) ** 2 +
      (data.position.y - (cursorRect.top + cursorRect.height / 2)) ** 2
    );
    
    // If close enough, create hit effect
    if (distance < 100) {
      this.createHitEffect(cursorRect.left + cursorRect.width / 2, cursorRect.top + cursorRect.height / 2);
      
      // Apply knockback effect to our cursor
      this.applyKnockback(data.velocity);
    }
  }
  
  /**
   * Apply knockback effect to our cursor
   * @param {Object} velocity - Velocity vector
   */
  applyKnockback(velocity) {
    // Increase our velocity in the direction of the attack
    this.velocity.x += velocity.x * 2;
    this.velocity.y += velocity.y * 2;
    
    // Increase wobble
    this.wobbleAmount = 0.5;
    
    // Reset wobble after a delay
    setTimeout(() => {
      this.wobbleAmount = 0.2;
    }, 500);
  }
  
  /**
   * Check if two rectangles intersect
   * @param {DOMRect} rect1 - First rectangle
   * @param {DOMRect} rect2 - Second rectangle
   * @returns {boolean} - Whether the rectangles intersect
   */
  rectsIntersect(rect1, rect2) {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }
  
  /**
   * Create attack effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createAttackEffect(x, y) {
    // Create slash effect element
    const slash = document.createElement('div');
    slash.className = 'sword-slash';
    slash.style.position = 'absolute';
    slash.style.left = `${x}px`;
    slash.style.top = `${y}px`;
    slash.style.width = '50px';
    slash.style.height = '50px';
    slash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    slash.style.borderRadius = '50%';
    slash.style.transform = 'translate(-50%, -50%) scale(0)';
    slash.style.zIndex = '90';
    slash.style.pointerEvents = 'none';
    
    // Add to DOM
    document.body.appendChild(slash);
    
    // Animate and remove after animation
    setTimeout(() => {
      slash.style.transition = 'all 0.2s ease-out';
      slash.style.transform = 'translate(-50%, -50%) scale(1)';
      slash.style.opacity = '0';
      
      setTimeout(() => {
        slash.remove();
      }, 200);
    }, 10);
  }
  
  /**
   * Create hit effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createHitEffect(x, y) {
    // Create hit effect element
    const hit = document.createElement('div');
    hit.className = 'sword-hit';
    hit.style.position = 'absolute';
    hit.style.left = `${x}px`;
    hit.style.top = `${y}px`;
    hit.style.width = '80px';
    hit.style.height = '80px';
    hit.style.backgroundImage = 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,0,0,0) 70%)';
    hit.style.transform = 'translate(-50%, -50%) scale(0)';
    hit.style.zIndex = '95';
    hit.style.pointerEvents = 'none';
    
    // Add to DOM
    document.body.appendChild(hit);
    
    // Animate and remove after animation
    setTimeout(() => {
      hit.style.transition = 'all 0.3s ease-out';
      hit.style.transform = 'translate(-50%, -50%) scale(1)';
      hit.style.opacity = '0';
      
      setTimeout(() => {
        hit.remove();
      }, 300);
    }, 10);
  }
  
  /**
   * Show visual indicator that sword combat mode is active
   */
  showModeIndicator() {
    // Create indicator if it doesn't exist
    let indicator = document.getElementById('sword-combat-mode-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'sword-combat-mode-indicator';
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
    
    indicator.textContent = '⚔️ Sword Combat Mode Active (Release S to exit)';
    indicator.style.display = 'block';
  }
  
  /**
   * Hide visual indicator
   */
  hideModeIndicator() {
    const indicator = document.getElementById('sword-combat-mode-indicator');
    
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
}

// Export singleton instance
const swordCombatMode = new SwordCombatMode();
export default swordCombatMode; 