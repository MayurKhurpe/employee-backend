// 📁 controllers/broadcastController.js
const Broadcast = require('../models/Broadcast');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📩 Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST: Create Broadcast & Email Users
exports.createBroadcast = async (req, res) => {
  const { message, audience } = req.body;

  try {
    const broadcast = new Broadcast({
      message,
      audience,
      createdBy: req.user.name || 'Admin',
    });
    await broadcast.save();

    // 🎯 Determine recipients
    let users = [];
    if (audience === 'all') {
      users = await User.find({ isApproved: true });
    } else {
      users = await User.find({ role: audience, isApproved: true });
    }

    // 📤 Send emails to users
    const emailPromises = users.map((user) =>
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: '📢 New Announcement from Admin',
        html: `
          <h3>Dear ${user.name},</h3>
          <p>${message}</p>
          <p><em>This message was sent as a broadcast to ${audience} users.</em></p>
          <br/>
          <p>Regards,<br/>Admin Team</p>
        `,
      })
    );
    await Promise.all(emailPromises);

    res.status(201).json({
      success: true,
      message: 'Broadcast sent and users notified.',
      data: broadcast,
    });
  } catch (err) {
    console.error('❌ Broadcast error:', err);
    res.status(500).json({ success: false, message: 'Failed to send broadcast', error: err.message });
  }
};

// GET: All broadcasts
exports.getBroadcasts = async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
    res.json(broadcasts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
};

// DELETE: Broadcast by ID
exports.deleteBroadcast = async (req, res) => {
  try {
    await Broadcast.findByIdAndDelete(req.params.id);
    res.json({ message: 'Broadcast deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
};
