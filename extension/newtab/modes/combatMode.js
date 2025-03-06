/**
 * Combat Mode for Socket Friends
 * Allows users to engage in sword combat with their cursors
 */

import eventBus from '../utils/eventBus.js';

// Define available weapons
const WEAPONS = {
  SWORD: 'sword',
  AXE: 'axe',
  HAMMER: 'hammer',
  SPEAR: 'spear',
};

class CombatMode {
  constructor() {
    this.isActive = false;
    this.socket = null;
    this.userId = null;
    this.weapon = WEAPONS.SWORD;
    this.power = 1.0;
    this.cooldown = false;
    this.weaponElement = null;
    
    // Bind methods
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleRemoteAttack = this.handleRemoteAttack.bind(this);
  }
  
  /**
   * Initialize the combat mode
   * @param {Object} socket - Socket.io instance
   * @param {string} userId - Current user ID
   */
  init(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    
    // Listen for remote attack events
    if (socket) {
      socket.on('combat:attack', this.handleRemoteAttack);
    }
    
    console.log('⚔️ COMBAT: Combat mode initialized');
  }
  
  /**
   * Activate combat mode
   * @param {Object} state - Mode state
   */
  activate(state) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.weapon = state.weapon || WEAPONS.SWORD;
    this.power = state.power || 1.0;
    
    // Create weapon element
    this.createWeaponElement();
    
    // Add event listeners
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    console.log('⚔️ COMBAT: Combat mode activated');
    
    // Show visual indicator that combat mode is active
    this.showModeIndicator();
  }
  
  /**
   * Deactivate combat mode
   */
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove weapon element
    if (this.weaponElement) {
      this.weaponElement.remove();
      this.weaponElement = null;
    }
    
    // Remove event listeners
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    console.log('⚔️ COMBAT: Combat mode deactivated');
    
    // Hide visual indicator
    this.hideModeIndicator();
  }
  
  /**
   * Create weapon element
   */
  createWeaponElement() {
    // Remove existing weapon if any
    if (this.weaponElement) {
      this.weaponElement.remove();
    }
    
    // Create weapon element
    this.weaponElement = document.createElement('div');
    this.weaponElement.className = 'combat-weapon';
    this.weaponElement.style.position = 'absolute';
    this.weaponElement.style.width = '40px';
    this.weaponElement.style.height = '40px';
    this.weaponElement.style.backgroundSize = 'contain';
    this.weaponElement.style.backgroundRepeat = 'no-repeat';
    this.weaponElement.style.backgroundPosition = 'center';
    this.weaponElement.style.pointerEvents = 'none';
    this.weaponElement.style.zIndex = '100';
    this.weaponElement.style.transition = 'transform 0.1s ease-out';
    this.weaponElement.style.transformOrigin = 'top left';
    
    // Set weapon image based on weapon type
    switch (this.weapon) {
      case WEAPONS.SWORD:
        this.weaponElement.textContent = '🗡️';
        break;
      case WEAPONS.AXE:
        this.weaponElement.textContent = '🪓';
        break;
      case WEAPONS.HAMMER:
        this.weaponElement.textContent = '🔨';
        break;
      case WEAPONS.SPEAR:
        this.weaponElement.textContent = '🔱';
        break;
      default:
        this.weaponElement.textContent = '⚔️';
    }
    
    // Apply emoji styling
    this.weaponElement.style.fontSize = '2rem';
    this.weaponElement.style.display = 'flex';
    this.weaponElement.style.alignItems = 'center';
    this.weaponElement.style.justifyContent = 'center';
    
    // Add to DOM
    document.body.appendChild(this.weaponElement);
  }
  
  /**
   * Handle mouse down event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseDown(e) {
    if (!this.isActive || this.cooldown) return;
    
    // Start attack animation
    this.startAttack(e.clientX, e.clientY);
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(e) {
    if (!this.isActive || !this.weaponElement) return;
    
    // Update weapon position
    this.weaponElement.style.left = `${e.clientX}px`;
    this.weaponElement.style.top = `${e.clientY}px`;
  }
  
  /**
   * Handle mouse up event
   */
  handleMouseUp() {
    if (!this.isActive || this.cooldown) return;
    
    // End attack
    this.endAttack();
  }
  
  /**
   * Start attack animation
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  startAttack(x, y) {
    if (!this.weaponElement) return;
    
    // Set attack direction (random for now)
    const directions = ['left', 'right', 'up', 'down'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    // Animate weapon
    switch (direction) {
      case 'left':
        this.weaponElement.style.transform = 'rotate(-45deg) scale(1.5)';
        break;
      case 'right':
        this.weaponElement.style.transform = 'rotate(45deg) scale(1.5)';
        break;
      case 'up':
        this.weaponElement.style.transform = 'rotate(-90deg) scale(1.5)';
        break;
      case 'down':
        this.weaponElement.style.transform = 'rotate(90deg) scale(1.5)';
        break;
    }
    
    // Create attack effect
    this.createAttackEffect(x, y, direction);
    
    // Enter cooldown
    this.cooldown = true;
    
    // Emit event to server
    if (this.socket?.connected) {
      this.socket.emit('combat:attack', {
        weapon: this.weapon,
        direction: direction,
        position: { x, y },
        power: this.power,
        timestamp: Date.now()
      });
    }
    
    // Emit event locally
    eventBus.emit('combat:attack', {
      userId: this.userId,
      weapon: this.weapon,
      direction: direction,
      position: { x, y },
      power: this.power,
      timestamp: Date.now()
    });
    
    // Reset after cooldown
    setTimeout(() => {
      this.cooldown = false;
      if (this.weaponElement) {
        this.weaponElement.style.transform = 'rotate(0) scale(1)';
      }
    }, 500);
  }
  
  /**
   * End attack
   */
  endAttack() {
    // Currently just a placeholder for future functionality
    // Could be used for charged attacks or combos
  }
  
  /**
   * Handle remote attack event
   * @param {Object} data - Attack event data
   */
  handleRemoteAttack(data) {
    if (!this.isActive) return;
    
    // Create attack effect for remote attack
    if (data.position) {
      this.createAttackEffect(data.position.x, data.position.y, data.direction, data.weapon);
    }
    
    // Future: Handle hit detection and knockback
  }
  
  /**
   * Create attack effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} direction - Attack direction
   * @param {string} weapon - Weapon type
   */
  createAttackEffect(x, y, direction, weapon = this.weapon) {
    // Create slash effect element
    const slash = document.createElement('div');
    slash.className = 'combat-slash';
    slash.style.position = 'absolute';
    slash.style.left = `${x}px`;
    slash.style.top = `${y}px`;
    slash.style.fontSize = '3rem';
    slash.style.zIndex = '90';
    slash.style.pointerEvents = 'none';
    slash.style.transformOrigin = 'center';
    
    // Set slash emoji based on direction
    switch (direction) {
      case 'left':
        slash.textContent = '💨';
        slash.style.transform = 'translateX(-20px) rotate(180deg)';
        break;
      case 'right':
        slash.textContent = '💨';
        slash.style.transform = 'translateX(20px)';
        break;
      case 'up':
        slash.textContent = '💨';
        slash.style.transform = 'translateY(-20px) rotate(270deg)';
        break;
      case 'down':
        slash.textContent = '💨';
        slash.style.transform = 'translateY(20px) rotate(90deg)';
        break;
      default:
        slash.textContent = '💢';
    }
    
    // Add to DOM
    document.body.appendChild(slash);
    
    // Animate and remove after animation
    setTimeout(() => {
      slash.style.transition = 'all 0.3s ease-out';
      
      switch (direction) {
        case 'left':
          slash.style.transform = 'translateX(-100px) rotate(180deg) scale(2)';
          break;
        case 'right':
          slash.style.transform = 'translateX(100px) scale(2)';
          break;
        case 'up':
          slash.style.transform = 'translateY(-100px) rotate(270deg) scale(2)';
          break;
        case 'down':
          slash.style.transform = 'translateY(100px) rotate(90deg) scale(2)';
          break;
      }
      
      slash.style.opacity = '0';
      
      setTimeout(() => {
        slash.remove();
      }, 300);
    }, 10);
  }
  
  /**
   * Show visual indicator that combat mode is active
   */
  showModeIndicator() {
    // Create indicator if it doesn't exist
    let indicator = document.getElementById('combat-mode-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'combat-mode-indicator';
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
    
    indicator.textContent = '⚔️ Combat Mode Active (ESC to exit)';
    indicator.style.display = 'block';
  }
  
  /**
   * Hide visual indicator
   */
  hideModeIndicator() {
    const indicator = document.getElementById('combat-mode-indicator');
    
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
}

// Export available weapons and singleton instance
export const AVAILABLE_WEAPONS = WEAPONS;
const combatMode = new CombatMode();
export default combatMode; 