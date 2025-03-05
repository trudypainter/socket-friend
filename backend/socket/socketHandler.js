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
        cursorColor: userData.cursorColor
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
        
        // Save updated user
        activeUsers.set(userId, user);
        
        // Broadcast user update to others
        socket.to(GLOBAL_ROOM).emit('user:updated', {
          userId,
          ...userData
        });
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