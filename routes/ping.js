// 📁 routes/ping.js

const express = require('express');
const router = express.Router();

// Simple route to test if backend is alive
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

module.exports = router;
