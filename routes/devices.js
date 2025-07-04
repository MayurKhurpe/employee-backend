// 📁 routes/devices.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // ✅ Updated import
const NotificationSetting = require('../models/NotificationSetting');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// In-memory data (replace with DB logic)
let devices = [
  { id: 1, name: "Mayur’s iPhone 14", lastActive: "2025-06-16 10:23 AM", ip: "192.168.1.12", browser: "Safari iOS" },
  { id: 2, name: "Work Laptop (HP)", lastActive: "2025-06-15 8:05 PM", ip: "192.168.1.3", browser: "Chrome on Windows" }
];

// ✅ GET all linked devices
router.get('/', protect, (req, res) => {
  res.json(devices);
});

// ✅ DELETE (unlink) a device by ID
router.delete('/:id', protect, async (req, res) => {
  const id = parseInt(req.params.id);
  const removedDevice = devices.find(d => d.id === id);
  devices = devices.filter(d => d.id !== id);

  // 🔔 Email notification if enabled
  const notif = await NotificationSetting.findOne({ userId: req.user.userId });
  if (notif?.emailNotif && removedDevice) {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: req.user.email,
      subject: '🔒 Device Unlinked - MES HR Portal',
      html: `
        <h2>Device Removed</h2>
        <p>Hello ${req.user.name},</p>
        <p>The following device has been unlinked from your account:</p>
        <ul>
          <li><strong>Name:</strong> ${removedDevice.name}</li>
          <li><strong>Last Active:</strong> ${removedDevice.lastActive}</li>
          <li><strong>IP:</strong> ${removedDevice.ip}</li>
          <li><strong>Browser:</strong> ${removedDevice.browser}</li>
        </ul>
        <p>If this wasn’t you, please change your password immediately.</p>
      `,
    });
  }

  res.json({ message: 'Device unlinked successfully' });
});

module.exports = router;
