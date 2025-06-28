const express = require('express');
const router = express.Router();
const BroadcastMessage = require('../models/BroadcastMessage');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// 🔐 Secure all routes
router.use(authMiddleware, isAdmin);

// 📩 Send broadcast message
router.post('/', async (req, res) => {
  try {
    const { message, audience } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const broadcast = await BroadcastMessage.create({ message, audience });
    res.json({ message: '✅ Broadcast sent!', data: broadcast });
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// 📜 Get all broadcast messages
router.get('/', async (req, res) => {
  try {
    const broadcasts = await BroadcastMessage.find().sort({ createdAt: -1 });
    res.json(broadcasts);
  } catch (err) {
    console.error('Fetch broadcasts error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 🗑️ Delete a broadcast
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await BroadcastMessage.findByIdAndDelete(id);
    res.json({ message: 'Broadcast deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

module.exports = router;
