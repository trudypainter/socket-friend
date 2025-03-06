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
      console.log(`👤 SERVER USER JOIN: User joining with socket ID ${socket.id}`, {
        username: userData.username,
        hasProfilePhoto: !!userData.profilePhotoUrl,
        timestamp: new Date().toISOString()
      });
      
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
      
      console.log(`👤 SERVER USER JOIN: Added user ${userId} to active users map, total users:`, activeUsers.size);
      
      // Join the global room
      socket.join(GLOBAL_ROOM);
      console.log(`👤 SERVER USER JOIN: User ${userId} joined room ${GLOBAL_ROOM}`);
      
      // Debug room membership
      const roomMembers = io.sockets.adapter.rooms.get(GLOBAL_ROOM);
      const memberCount = roomMembers ? roomMembers.size : 0;
      console.log(`👤 SERVER ROOM: Room ${GLOBAL_ROOM} now has ${memberCount} members`);
      
      // Log all users in the room
      const roomUsers = Array.from(roomMembers || []).map(socketId => {
        const user = Array.from(activeUsers.values()).find(u => u.socketId === socketId);
        return user ? `${user.username} (${socketId})` : socketId;
      });
      console.log(`👤 SERVER ROOM: Users in ${GLOBAL_ROOM}:`, roomUsers);
      
      // Inform the new user about their ID
      socket.emit('user:connected', { userId });
      console.log(`👤 SERVER USER JOIN: Sent user:connected event to user ${userId}`);
      
      // Send all active users to the new user
      socket.emit('users:all', Array.from(activeUsers.values()));
      console.log(`👤 SERVER USER JOIN: Sent users:all event to user ${userId} with ${activeUsers.size} users`);
      
      // Inform others about the new user
      socket.to(GLOBAL_ROOM).emit('user:joined', {
        userId,
        username: userData.username,
        cursorColor: userData.cursorColor,
        profilePhotoUrl: userData.profilePhotoUrl
      });
      console.log(`👤 SERVER USER JOIN: Broadcast user:joined event for user ${userId} to room ${GLOBAL_ROOM}`);
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
      console.log('🎯 SERVER EMOJI RECEIVED: User', userId, 'sent emoji:draw event:', {
        emoji: data.emoji,
        position: data.position,
        timestamp: data.timestamp
      });
      
      // Add user ID to the data if not already present
      const emojiData = {
        ...data,
        userId: data.userId || userId // Use provided userId or socket userId
      };
      
      // Check for required fields
      if (!emojiData.position || !emojiData.emoji) {
        console.error('❌ SERVER EMOJI ERROR: Invalid emoji data received:', emojiData);
        return;
      }
      
      // Log active connections
      const roomSize = io.sockets.adapter.rooms.get(GLOBAL_ROOM)?.size || 0;
      console.log('📊 SERVER STATS: Emitting to', roomSize - 1, 'other users in', GLOBAL_ROOM);
      
      try {
        // Broadcast to others in the room
        socket.to(GLOBAL_ROOM).emit('emoji:draw', emojiData);
        console.log('📢 SERVER EMOJI BROADCAST: Successfully sent emoji:draw to room', GLOBAL_ROOM);
      } catch (error) {
        console.error('❌ SERVER EMOJI BROADCAST ERROR:', error);
      }
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
      console.log(`💬 SERVER CHAT TYPING: Received from user ${userId}`, {
        socketId: socket.id,
        messageLength: data.message?.length || 0,
        timestamp: new Date().toISOString()
      });

      // Validate data
      if (!data.message) {
        console.warn(`💬 SERVER CHAT TYPING: Missing message in typing event from user ${userId}`);
      }

      // Add userId if not present
      const typingData = {
        ...data,
        userId: data.userId || userId // Use provided userId or socket userId
      };
      
      // Check room membership
      const roomMembers = io.sockets.adapter.rooms.get(GLOBAL_ROOM);
      const memberCount = roomMembers ? roomMembers.size : 0;
      console.log(`💬 SERVER CHAT TYPING: Broadcasting to ${memberCount - 1} other users in ${GLOBAL_ROOM}`);
      
      try {
        // Broadcast to others in the room
        socket.to(GLOBAL_ROOM).emit('chat:typing', typingData);
        console.log(`💬 SERVER CHAT TYPING: Successfully broadcast typing event to room ${GLOBAL_ROOM}`);
      } catch (error) {
        console.error(`💬 SERVER CHAT TYPING ERROR: Failed to broadcast typing event:`, error);
      }
    });
    
    // Handle chat message events
    socket.on('chat:message', (data) => {
      console.log(`💬 SERVER CHAT MESSAGE: Received from user ${userId}`, {
        socketId: socket.id,
        message: data.message,
        timestamp: new Date().toISOString()
      });

      // Validate data
      if (!data.message) {
        console.warn(`💬 SERVER CHAT MESSAGE: Empty message received from user ${userId}`);
      }

      // Add userId if not present
      const messageData = {
        ...data,
        userId: data.userId || userId // Use provided userId or socket userId
      };
      
      // Check room membership
      const roomMembers = io.sockets.adapter.rooms.get(GLOBAL_ROOM);
      const memberCount = roomMembers ? roomMembers.size : 0;
      console.log(`💬 SERVER CHAT MESSAGE: Broadcasting to ${memberCount - 1} other users in ${GLOBAL_ROOM}`);
      
      // Log active users
      console.log(`💬 SERVER CHAT MESSAGE: Active users in room:`, 
        Array.from(roomMembers || []).map(socketId => {
          const user = Array.from(activeUsers.values()).find(u => u.socketId === socketId);
          return user ? `${user.username} (${socketId})` : socketId;
        })
      );
      
      try {
        // Broadcast to others in the room
        socket.to(GLOBAL_ROOM).emit('chat:message', messageData);
        console.log(`💬 SERVER CHAT MESSAGE: Successfully broadcast message to room ${GLOBAL_ROOM}`);
      } catch (error) {
        console.error(`💬 SERVER CHAT MESSAGE ERROR: Failed to broadcast message:`, error);
      }
    });
    
    // Handle chat fade events
    socket.on('chat:fade', (data) => {
      console.log(`💬 SERVER CHAT FADE: Received from user ${userId}`, {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      // Add userId if not present
      const fadeData = {
        ...data,
        userId: data.userId || userId // Use provided userId or socket userId
      };
      
      // Check room membership
      const roomMembers = io.sockets.adapter.rooms.get(GLOBAL_ROOM);
      const memberCount = roomMembers ? roomMembers.size : 0;
      console.log(`💬 SERVER CHAT FADE: Broadcasting to ${memberCount - 1} other users in ${GLOBAL_ROOM}`);
      
      try {
        // Broadcast to others in the room
        socket.to(GLOBAL_ROOM).emit('chat:fade', fadeData);
        console.log(`💬 SERVER CHAT FADE: Successfully broadcast fade event to room ${GLOBAL_ROOM}`);
      } catch (error) {
        console.error(`💬 SERVER CHAT FADE ERROR: Failed to broadcast fade event:`, error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`👋 SERVER DISCONNECT: User ${userId} disconnected, socket ID: ${socket.id}`);
      
      // Check if user was in a room
      const wasInRoom = io.sockets.adapter.rooms.get(GLOBAL_ROOM)?.has(socket.id) || false;
      console.log(`�� SERVER DISCONNECT: User ${userId} was in global room: ${wasInRoom}`);
      
      // Log active users before removal
      console.log(`👋 SERVER DISCONNECT: Active users before removal: ${activeUsers.size}`);
      
      // Remove from active users
      activeUsers.delete(userId);
      console.log(`👋 SERVER DISCONNECT: Active users after removal: ${activeUsers.size}`);
      
      // Debug remaining room membership
      const roomMembers = io.sockets.adapter.rooms.get(GLOBAL_ROOM);
      const memberCount = roomMembers ? roomMembers.size : 0;
      console.log(`👋 SERVER DISCONNECT: Room ${GLOBAL_ROOM} now has ${memberCount} members`);
      
      // Log remaining users in the room
      if (roomMembers) {
        const roomUsers = Array.from(roomMembers).map(socketId => {
          const user = Array.from(activeUsers.values()).find(u => u.socketId === socketId);
          return user ? `${user.username} (${socketId})` : socketId;
        });
        console.log(`👋 SERVER DISCONNECT: Remaining users in room:`, roomUsers);
      }
      
      // Inform others
      try {
        io.to(GLOBAL_ROOM).emit('user:left', { userId });
        console.log(`👋 SERVER DISCONNECT: Broadcast user:left event for user ${userId} to room ${GLOBAL_ROOM}`);
      } catch (error) {
        console.error(`👋 SERVER DISCONNECT ERROR: Failed to broadcast user:left event:`, error);
      }
    });
  });
  
  // Return methods for external use
  return {
    getActiveUsers: () => Array.from(activeUsers.values()),
    getUserCount: () => activeUsers.size
  };
}; 