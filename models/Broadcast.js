const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// 🔐 Secure all broadcast routes
router.use(authMiddleware, isAdmin);

// 📩 Send a new broadcast message
router.post('/', async (req, res) => {
  try {
    const { message, audience, pinned, expiresAt } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const broadcast = await Broadcast.create({
      message,
      audience,
      pinned: !!pinned,
      expiresAt: expiresAt || null,
    });

    res.json({ message: '✅ Broadcast sent successfully', data: broadcast });
  } catch (error) {
    console.error('Send Broadcast Error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// 📜 Get all broadcasts (optional: filter expired)
router.get('/', async (req, res) => {
  try {
    const now = new Date();

    const broadcasts = await Broadcast.find({
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: now } }, // Only show unexpired
      ],
    }).sort({ pinned: -1, createdAt: -1 });

    res.json(broadcasts);
  } catch (error) {
    console.error('Fetch Broadcasts Error:', error);
    res.status(500).json({ error: 'Failed to fetch broadcast messages' });
  }
});

// 🗑️ Delete a broadcast by ID
router.delete('/:id', async (req, res) => {
  try {
    await Broadcast.findByIdAndDelete(req.params.id);
    res.json({ message: '🗑️ Broadcast deleted' });
  } catch (error) {
    console.error('Delete Broadcast Error:', error);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

module.exports = router;
