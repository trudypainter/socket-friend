// Cursor Component for Socket Friends
// Responsible for creating and rendering cursor elements

/**
 * Creates a cursor element with SVG arrow and profile photo
 * @param {string} id - User ID for the cursor
 * @param {string} username - Username to display
 * @param {string} color - Border color for the cursor
 * @param {string} photoUrl - URL for the profile photo (optional)
 * @param {boolean} isLocal - Whether this is the local user's cursor
 * @returns {HTMLElement} - The created cursor element
 */
function createCursor(id, username, color, photoUrl, isLocal = false) {
  // Create main cursor container
  const cursor = document.createElement('div');
  cursor.id = isLocal ? 'local-cursor' : `cursor-${id}`;
  cursor.className = isLocal ? 'local-cursor' : 'remote-cursor';
  
  // Create the SVG arrow element
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrow.setAttribute('width', '24');
  arrow.setAttribute('height', '24');
  arrow.setAttribute('viewBox', '0 0 24 24');
  arrow.classList.add('cursor-arrow');
  
  // SVG path for the arrow with outline
  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrowPath.setAttribute('d', 'M2.5,2.5 L21,12 L12,13.5 L9.5,21 L7,13.5 L2.5,2.5');
  arrowPath.setAttribute('stroke', 'white');
  arrowPath.setAttribute('stroke-width', '1.5');
  arrowPath.setAttribute('fill', color);
  arrow.appendChild(arrowPath);
  
  // Add drop shadow filter to SVG
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', `shadow-${id}`);
  filter.setAttribute('x', '-20%');
  filter.setAttribute('y', '-20%');
  filter.setAttribute('width', '140%');
  filter.setAttribute('height', '140%');
  
  const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
  feDropShadow.setAttribute('dx', '1');
  feDropShadow.setAttribute('dy', '1');
  feDropShadow.setAttribute('stdDeviation', '1.5');
  feDropShadow.setAttribute('flood-color', 'rgba(0,0,0,0.3)');
  
  filter.appendChild(feDropShadow);
  defs.appendChild(filter);
  arrow.appendChild(defs);
  arrowPath.setAttribute('filter', `url(#shadow-${id})`);
  
  // Add the SVG arrow to the cursor
  cursor.appendChild(arrow);
  
  // Create the profile photo container
  const photoContainer = document.createElement('div');
  photoContainer.className = 'cursor-photo-container';
  photoContainer.style.borderColor = color;
  
  // Add the profile photo if available
  if (photoUrl) {
    const photo = document.createElement('div');
    photo.className = 'cursor-photo';
    photo.style.backgroundImage = `url(${photoUrl})`;
    photoContainer.appendChild(photo);
  }
  
  // Add the photo container to the cursor
  cursor.appendChild(photoContainer);

  
  return cursor;
}

/**
 * Updates an existing cursor element
 * @param {HTMLElement} cursorElement - The cursor element to update
 * @param {Object} props - Properties to update (color, photoUrl, username)
 */
function updateCursor(cursorElement, props) {
  if (!cursorElement) return;
  
  // Update photo if provided
  if (props.photoUrl) {
    let photoElement = cursorElement.querySelector('.cursor-photo');
    const photoContainer = cursorElement.querySelector('.cursor-photo-container');
    
    if (photoContainer && props.color) {
      photoContainer.style.borderColor = props.color;
    }
    
    if (photoElement) {
      photoElement.style.backgroundImage = `url(${props.photoUrl})`;
    } else if (photoContainer) {
      photoElement = document.createElement('div');
      photoElement.className = 'cursor-photo';
      photoElement.style.backgroundImage = `url(${props.photoUrl})`;
      photoContainer.appendChild(photoElement);
    }
  }

}

/**
 * Updates the position of a cursor
 * @param {HTMLElement} cursorElement - The cursor element to update
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function updateCursorPosition(cursorElement, x, y) {
  if (!cursorElement) return;
  
  cursorElement.style.left = `${x}px`;
  cursorElement.style.top = `${y}px`;
}

/**
 * Removes a cursor from the DOM
 * @param {string} id - User ID of the cursor to remove
 */
function removeCursor(id) {
  const cursorElement = document.getElementById(`cursor-${id}`);
  if (cursorElement) {
    cursorElement.remove();
  }
}

/**
 * Creates a ripple effect at the arrow tip position
 * @param {HTMLElement} playArea - The play area element
 * @param {number} x - Mouse X coordinate
 * @param {number} y - Mouse Y coordinate
 * @param {string} color - Color for the ripple
 */
function createRippleEffect(playArea, x, y, color) {
  // Create ripple element
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.backgroundColor = color;
  
  // Position the ripple at the arrow tip
  // The cursor is positioned with the arrow tip at (x,y)
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  
  // Add to DOM
  playArea.appendChild(ripple);
  
  // Remove after animation completes
  setTimeout(() => {
    ripple.remove();
  }, 1000);
}

/**
 * Get the position of the arrow tip relative to cursor element
 * @returns {Object} - The x,y offset of arrow tip from cursor origin
 */
function getArrowTipPosition() {
  // The arrow tip is at (2.5, 2.5) in the SVG viewBox
  return { x: 2.5, y: 2.5 };
}

// Export cursor functions
window.CursorComponent = {
  createCursor,
  updateCursor,
  updateCursorPosition,
  removeCursor,
  createRippleEffect,
  getArrowTipPosition
}; 