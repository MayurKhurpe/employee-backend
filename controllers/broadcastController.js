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

/**
 * @desc Create a broadcast message and notify relevant users by email
 */
exports.createBroadcast = async (req, res) => {
  const { message, audience } = req.body;

  if (!message || !audience) {
    return res.status(400).json({ success: false, message: 'Message and audience are required' });
  }

  try {
    const broadcast = new Broadcast({
      message,
      audience,
      createdBy: req.user?.name || 'Admin',
    });
    await broadcast.save();

    // Determine recipients
    let users = [];
    if (audience === 'all') {
      users = await User.find({ isApproved: true, email: { $exists: true, $ne: '' } });
    } else {
      users = await User.find({ role: audience, isApproved: true, email: { $exists: true, $ne: '' } });
    }

    // Send emails in batches to avoid overload (optional)
    const BATCH_SIZE = 50;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const emailPromises = batch.map(user =>
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
    }

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

/**
 * @desc Get all broadcast messages sorted by newest first
 */
exports.getBroadcasts = async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
    res.json(broadcasts);
  } catch (err) {
    console.error('Failed to fetch broadcasts:', err);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
};

/**
 * @desc Delete a broadcast message by ID
 */
exports.deleteBroadcast = async (req, res) => {
  try {
    const deleted = await Broadcast.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }
    res.json({ message: 'Broadcast deleted successfully' });
  } catch (err) {
    console.error('Failed to delete broadcast:', err);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
};
