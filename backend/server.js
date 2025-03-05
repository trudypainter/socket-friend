const express = require('express');
const http = require('node:http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('node:path');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();

// Import routes
const healthRoutes = require('./api/health');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize socket handlers
const socketHandler = require('./socket/socketHandler')(io);

// Basic stats route
app.get('/api/stats', (req, res) => {
  const stats = {
    userCount: socketHandler.getUserCount(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  res.json(stats);
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  server.close(() => {
    logger.info('Server shut down');
    process.exit(0);
  });
});

module.exports = { app, server, io }; 