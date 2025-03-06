// In-memory storage for active users
const activeUsers = new Map();
const GLOBAL_ROOM = 'global';

// Generate a unique user ID
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Socket.io handler
module.exports = (io) => {
  // Handle new connections
  io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);
    
    // Assign a unique user ID
    const userId = generateUserId();
    socket.userId = userId;
    
    // User joins (with username and cursor color)
    socket.on('user:join', (userData) => {
      // Store user data
      activeUsers.set(userId, {
        id: userId,
        socketId: socket.id,
        username: userData.username || `User ${userId.substring(0, 5)}`,
        cursorColor: userData.cursorColor || '#000000',
        profilePhotoUrl: userData.profilePhotoUrl || '',
        currentMode: 'default',
        connectedAt: new Date()
      });
      
      // Join the global room
      socket.join(GLOBAL_ROOM);
      
      // Inform the new user about their ID
      socket.emit('user:connected', { userId });
      
      // Send all active users to the new user
      socket.emit('users:all', Array.from(activeUsers.values()));
      
      // Inform others about the new user
      socket.to(GLOBAL_ROOM).emit('user:joined', {
        userId,
        username: userData.username,
        cursorColor: userData.cursorColor,
        profilePhotoUrl: userData.profilePhotoUrl
      });
    });
    
    // Handle user updates (name, color)
    socket.on('user:update', (userData) => {
      const user = activeUsers.get(userId);
      
      if (user) {
        // Update user data
        if (userData.username) {
          user.username = userData.username;
        }
        
        if (userData.cursorColor) {
          user.cursorColor = userData.cursorColor;
        }
        
        if (userData.profilePhotoUrl) {
          user.profilePhotoUrl = userData.profilePhotoUrl;
        }
        
        // Save updated user
        activeUsers.set(userId, user);
        
        // Broadcast user update to others
        socket.to(GLOBAL_ROOM).emit('user:updated', {
          userId,
          ...userData
        });
      }
    });
    
    // Handle mode changes
    socket.on('mode:change', (data) => {
      const user = activeUsers.get(userId);
      
      if (user) {
        // Update user's current mode
        user.currentMode = data.mode;
        activeUsers.set(userId, user);
        
        // Broadcast mode change to others
        socket.to(GLOBAL_ROOM).emit('mode:change', {
          userId,
          mode: data.mode,
          timestamp: data.timestamp
        });
        
        console.log(`User ${userId} changed mode to ${data.mode}`);
      }
    });
    
    // Handle cursor movement
    socket.on('cursor:move', (data) => {
      // Add user ID to the data
      const cursorData = {
        ...data,
        userId
      };
      
      // Broadcast to others in the room
      socket.to(GLOBAL_ROOM).emit('cursor:update', cursorData);
    });
    
    // Handle cursor clicks
    socket.on('cursor:click', (data) => {
      // Add user ID to the data
      const clickData = {
        ...data,
        userId
      };
      
      // Broadcast to others in the room
      socket.to(GLOBAL_ROOM).emit('cursor:click', clickData);
    });
    
    // Handle drawing mode events
    socket.on('drawing:stroke', (data) => {
      // Add user ID to the data
      const strokeData = {
        ...data,
        userId
      };
      
      // Broadcast to others in the room
      socket.to(GLOBAL_ROOM).emit('drawing:stroke', strokeData);
    });
    
    // Handle music mode events
    socket.on('music:note', (data) => {
      // Add user ID to the data
      const noteData = {
        ...data,
        userId
      };
      
      // Broadcast to others in the room
      socket.to(GLOBAL_ROOM).emit('music:note', noteData);
    });
    
    // Handle combat mode events
    socket.on('combat:attack', (data) => {
      // Add user ID to the data
      const attackData = {
        ...data,
        userId
      };
      
      // Broadcast to others in the room
      socket.to(GLOBAL_ROOM).emit('combat:attack', attackData);
    });
    
    // Handle emoji drawing events
    socket.on('emoji:draw', (data) => {
      // Add user ID to the data
      const emojiData = {
        ...data,
        userId
      };
      
      // Broadcast to others in the room
      socket.to(GLOBAL_ROOM).emit('emoji:draw', emojiData);
    });
    
    // Handle sword combat attack events
    socket.on('sword:attack', (data) => {
      // Add user ID to the data
      const attackData = {
        ...data,
        userId
      };
      
      // Broadcast to others in the room
      socket.to(GLOBAL_ROOM).emit('sword:attack', attackData);
    });
    
    // Handle sword combat hit events
    socket.on('sword:hit', (data) => {
      const hitData = {
        ...data,
        attackerId: userId
      };
      socket.to(GLOBAL_ROOM).emit('sword:hit', hitData);
    });
    
    // Handle chat typing events
    socket.on('chat:typing', (data) => {
      const typingData = {
        ...data,
        userId
      };
      socket.to(GLOBAL_ROOM).emit('chat:typing', typingData);
    });
    
    // Handle chat message events
    socket.on('chat:message', (data) => {
      const messageData = {
        ...data,
        userId
      };
      socket.to(GLOBAL_ROOM).emit('chat:message', messageData);
    });
    
    // Handle chat fade events
    socket.on('chat:fade', (data) => {
      const fadeData = {
        ...data,
        userId
      };
      socket.to(GLOBAL_ROOM).emit('chat:fade', fadeData);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.id}`);
      
      // Remove from active users
      activeUsers.delete(userId);
      
      // Inform others
      io.to(GLOBAL_ROOM).emit('user:left', { userId });
    });
  });
  
  // Return methods for external use
  return {
    getActiveUsers: () => Array.from(activeUsers.values()),
    getUserCount: () => activeUsers.size
  };
}; 