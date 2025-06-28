// 📁 routes/broadcast.js
const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const { protect, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📧 Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔐 Secure all broadcast routes
router.use(protect, isAdmin);

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

    // 📧 Notify all approved and verified users
    const users = await User.find({ isApproved: true, isVerified: true });
    const emailList = users.map(u => u.email);

    if (emailList.length > 0) {
      await transporter.sendMail({
        from: `"MES HR" <${process.env.EMAIL_USER}>`,
        to: emailList,
        subject: '📢 New Broadcast Message from Admin',
        html: `<p>${message}</p><br><p>— MES HR Portal</p>`,
      });
    }

    res.json({ message: '✅ Broadcast sent and users notified', data: broadcast });
  } catch (error) {
    console.error('Send Broadcast Error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// 📜 Get all broadcasts
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const broadcasts = await Broadcast.find({
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: now } },
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
