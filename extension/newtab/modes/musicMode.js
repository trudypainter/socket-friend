/**
 * Music Mode for Socket Friends
 * Allows users to play music with their cursor
 */

import eventBus from '../utils/eventBus.js';

// Define available instruments
const INSTRUMENTS = {
  PIANO: 'piano',
  GUITAR: 'guitar',
  DRUMS: 'drums',
  SYNTH: 'synth',
};

class MusicMode {
  constructor() {
    this.isActive = false;
    this.socket = null;
    this.userId = null;
    this.instrument = INSTRUMENTS.PIANO;
    this.volume = 0.5;
    this.audioContext = null;
    this.sounds = {};
    this.noteTimeout = null;
    
    // Bind methods
    this.handleClick = this.handleClick.bind(this);
    this.handleRemoteNote = this.handleRemoteNote.bind(this);
    this.createNote = this.createNote.bind(this);
  }
  
  /**
   * Initialize the music mode
   * @param {Object} socket - Socket.io instance
   * @param {string} userId - Current user ID
   */
  init(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    
    // Initialize audio context
    this.initAudioContext();
    
    // Listen for remote music events
    if (socket) {
      socket.on('music:note', this.handleRemoteNote);
    }
    
    console.log('🎵 MUSIC: Music mode initialized');
  }
  
  /**
   * Initialize audio context
   */
  initAudioContext() {
    // Create audio context if supported
    if (window.AudioContext || window.webkitAudioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Preload sounds
      this.preloadSounds();
    } else {
      console.error('🎵 MUSIC: Web Audio API not supported in this browser');
    }
  }
  
  /**
   * Preload instrument sounds
   */
  preloadSounds() {
    // Create basic oscillator sounds for each instrument
    // In a real implementation, you would load actual samples
    
    this.sounds = {
      [INSTRUMENTS.PIANO]: {
        'C4': { frequency: 261.63, type: 'sine' },
        'E4': { frequency: 329.63, type: 'sine' },
        'G4': { frequency: 392.00, type: 'sine' },
        'C5': { frequency: 523.25, type: 'sine' },
      },
      [INSTRUMENTS.GUITAR]: {
        'C4': { frequency: 261.63, type: 'triangle' },
        'E4': { frequency: 329.63, type: 'triangle' },
        'G4': { frequency: 392.00, type: 'triangle' },
        'C5': { frequency: 523.25, type: 'triangle' },
      },
      [INSTRUMENTS.DRUMS]: {
        'C4': { frequency: 100, type: 'sawtooth' },
        'E4': { frequency: 200, type: 'sawtooth' },
        'G4': { frequency: 300, type: 'sawtooth' },
        'C5': { frequency: 400, type: 'sawtooth' },
      },
      [INSTRUMENTS.SYNTH]: {
        'C4': { frequency: 261.63, type: 'square' },
        'E4': { frequency: 329.63, type: 'square' },
        'G4': { frequency: 392.00, type: 'square' },
        'C5': { frequency: 523.25, type: 'square' },
      },
    };
    
    console.log('🎵 MUSIC: Sounds preloaded');
  }
  
  /**
   * Activate music mode
   * @param {Object} state - Mode state
   */
  activate(state) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.instrument = state.instrument || INSTRUMENTS.PIANO;
    this.volume = state.volume || 0.5;
    
    // Resume audio context if suspended
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Add event listeners
    document.addEventListener('click', this.handleClick);
    
    console.log('🎵 MUSIC: Music mode activated');
    
    // Show visual indicator that music mode is active
    this.showModeIndicator();
  }
  
  /**
   * Deactivate music mode
   */
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove event listeners
    document.removeEventListener('click', this.handleClick);
    
    console.log('🎵 MUSIC: Music mode deactivated');
    
    // Hide visual indicator
    this.hideModeIndicator();
  }
  
  /**
   * Handle click event
   * @param {MouseEvent} e - Mouse event
   */
  handleClick(e) {
    if (!this.isActive || !this.audioContext) return;
    
    // Get a random note
    const notes = Object.keys(this.sounds[this.instrument]);
    const note = notes[Math.floor(Math.random() * notes.length)];
    
    // Play the note
    this.playNote(note);
    
    // Create visual note effect
    this.createNote(e.clientX, e.clientY);
    
    // Emit event to server
    if (this.socket?.connected) {
      this.socket.emit('music:note', {
        instrument: this.instrument,
        note: note,
        position: { x: e.clientX, y: e.clientY },
        timestamp: Date.now()
      });
    }
    
    // Emit event locally
    eventBus.emit('music:note', {
      userId: this.userId,
      instrument: this.instrument,
      note: note,
      position: { x: e.clientX, y: e.clientY },
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle remote note event
   * @param {Object} data - Note event data
   */
  handleRemoteNote(data) {
    if (!this.isActive || !this.audioContext) return;
    
    // Play the note
    this.playNote(data.note, data.instrument);
    
    // Create visual note effect
    if (data.position) {
      this.createNote(data.position.x, data.position.y);
    }
  }
  
  /**
   * Play a note
   * @param {string} note - Note to play
   * @param {string} instrument - Instrument to use (defaults to current)
   */
  playNote(note, instrument = this.instrument) {
    if (!this.audioContext || !note) return;
    
    const sounds = this.sounds[instrument] || this.sounds[INSTRUMENTS.PIANO];
    const sound = sounds[note];
    
    if (!sound) return;
    
    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = sound.type || 'sine';
    oscillator.frequency.setValueAtTime(sound.frequency, this.audioContext.currentTime);
    
    // Create gain node for volume
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Play sound
    oscillator.start();
    
    // Stop after a short time
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }
  
  /**
   * Create visual note effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createNote(x, y) {
    // Create note element
    const note = document.createElement('div');
    note.className = 'music-note';
    note.style.position = 'absolute';
    note.style.left = `${x}px`;
    note.style.top = `${y}px`;
    note.style.fontSize = '2rem';
    note.style.color = this.getInstrumentColor();
    note.style.zIndex = '50';
    note.style.pointerEvents = 'none';
    note.style.transition = 'all 1s ease-out';
    note.style.opacity = '1';
    note.style.transform = 'translateY(0)';
    
    // Set random music note emoji
    const noteEmojis = ['🎵', '🎶', '♩', '♪', '♫', '♬', '🎼'];
    note.textContent = noteEmojis[Math.floor(Math.random() * noteEmojis.length)];
    
    // Add to DOM
    document.body.appendChild(note);
    
    // Animate and remove after animation
    setTimeout(() => {
      note.style.opacity = '0';
      note.style.transform = 'translateY(-50px)';
      
      setTimeout(() => {
        note.remove();
      }, 1000);
    }, 10);
  }
  
  /**
   * Get color for current instrument
   * @returns {string} Hex color
   */
  getInstrumentColor() {
    const colors = {
      [INSTRUMENTS.PIANO]: '#3498db', // Blue
      [INSTRUMENTS.GUITAR]: '#2ecc71', // Green
      [INSTRUMENTS.DRUMS]: '#e74c3c', // Red
      [INSTRUMENTS.SYNTH]: '#9b59b6', // Purple
    };
    
    return colors[this.instrument] || '#f1c40f'; // Default yellow
  }
  
  /**
   * Show visual indicator that music mode is active
   */
  showModeIndicator() {
    // Create indicator if it doesn't exist
    let indicator = document.getElementById('music-mode-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'music-mode-indicator';
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
    
    indicator.textContent = '🎵 Music Mode Active (ESC to exit)';
    indicator.style.display = 'block';
  }
  
  /**
   * Hide visual indicator
   */
  hideModeIndicator() {
    const indicator = document.getElementById('music-mode-indicator');
    
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
}

// Export available instruments and singleton instance
export const AVAILABLE_INSTRUMENTS = INSTRUMENTS;
const musicMode = new MusicMode();
export default musicMode; 