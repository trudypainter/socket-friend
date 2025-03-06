/**
 * Event Bus for Socket Friends
 * Central system to handle and dispatch different types of events
 */

class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return a function to unsubscribe
    return () => {
      this.listeners[event] = this.listeners[event].filter(
        (listener) => listener !== callback
      );
    };
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Data to pass to listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }

  /**
   * Remove all listeners
   * @param {string} event - Optional event name. If not provided, removes all listeners
   */
  removeAllListeners(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }

  /**
   * Get all registered events
   * @returns {string[]} Array of event names
   */
  getEvents() {
    return Object.keys(this.listeners);
  }
}

// Export a singleton instance
const eventBus = new EventBus();
window.EventBus = eventBus;
export default eventBus; 