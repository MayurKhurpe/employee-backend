// 📁 routes/profile.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/profileController'); // ✅ FIXED
const AuditLog = require('../models/AuditLog');
const NotificationSetting = require('../models/NotificationSetting');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📧 Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ GET Logged-in User Profile
router.get('/', protect, getProfile);

// ✅ UPDATE Profile
router.put('/', protect, async (req, res, next) => {
  await updateProfile(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Updated Profile',
      details: `Updated fields: ${Object.keys(req.body).join(', ')}`,
      ip: req.ip,
    });

    // ✅ Email Notification (optional)
    const setting = await NotificationSetting.findOne({ userId: req.user.id });
    if (setting?.emailNotif) {
      const user = await User.findById(req.user.id);
      if (user) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '📋 Your Profile was Updated',
          html: `<p>Hello ${user.name},<br>Your profile was updated on ${new Date().toLocaleString()}.</p>`,
        });
      }
    }

    next(); // optional
  });
});

module.exports = router;
