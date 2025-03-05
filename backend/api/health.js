const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Socket Friends server is running',
    timestamp: new Date().toISOString()
  });
});

// More detailed health check with stats (to be expanded later)
router.get('/stats', (req, res) => {
  // This will be expanded to include connected users, active rooms, etc.
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 