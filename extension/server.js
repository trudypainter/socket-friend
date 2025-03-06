const express = require('express');
const path = require('node:path');
const http = require('node:http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the newtab directory
app.use(express.static(path.join(__dirname, 'newtab')));

// Serve socket.io client library
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// Serve newtab.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'newtab', 'newtab.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // When a new user joins
  socket.on('user_join', (userData) => {
    // Broadcast to all other clients
    socket.broadcast.emit('user_joined', {
      id: socket.id,
      ...userData
    });
    
    // Send current users to the new user
    socket.emit('get_users', Array.from(io.sockets.sockets.values())
      .filter(s => s.id !== socket.id)
      .map(s => ({
        id: s.id,
        // You would store user data on the socket
        // This is a simplified version
      }))
    );
  });
  
  // When a user moves their cursor
  socket.on('cursor_move', (position) => {
    socket.broadcast.emit('cursor_moved', {
      id: socket.id,
      position
    });
  });
  
  // When a user disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    io.emit('user_left', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 