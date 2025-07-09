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

// 🔐 Only secure some routes (not all)
router.post('/', protect, isAdmin, async (req, res) => {
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

    // 📧 Notify all approved + verified users
    const users = await User.find({ isApproved: true, isVerified: true });
    const emailList = users.map(u => u.email);

    if (emailList.length > 0) {
      await transporter.sendMail({
      from: `"SAPL HR" <${process.env.EMAIL_USER}>`,
      to: 'hr.seekersautomation@gmail.com',   // only HR receives in "To"
      bcc: emailList,                          // all users hidden in "BCC"
      subject: ' New Broadcast Message from Admin 📢 ',
      html: `<p>${message}</p><br><p>— SAPL HR Portal</p>`,
     });
    }

    res.json({ message: '✅ Broadcast sent and users notified', data: broadcast });
  } catch (error) {
    console.error('Send Broadcast Error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// ✅ 🔓 Public to all logged-in users
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const userRole = req.user.role || 'employee'; // default fallback

    const broadcasts = await Broadcast.find({
      $or: [
        { audience: 'all' },
        { audience: userRole }
      ],
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: now } }
      ]
    }).sort({ pinned: -1, createdAt: -1 });

    res.json(broadcasts);
  } catch (error) {
    console.error('Fetch Broadcasts Error:', error);
    res.status(500).json({ error: 'Failed to fetch broadcast messages' });
  }
});

// 🗑️ Delete a broadcast by ID (admin only)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    await Broadcast.findByIdAndDelete(req.params.id);
    res.json({ message: '🗑️ Broadcast deleted' });
  } catch (error) {
    console.error('Delete Broadcast Error:', error);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

module.exports = router;
