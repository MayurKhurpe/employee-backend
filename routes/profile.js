// 📁 routes/profile.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const nodemailer = require('nodemailer');
const profileController = require('../controllers/profileController');
const AuditLog = require('../models/AuditLog');
const NotificationSetting = require('../models/NotificationSetting');
const User = require('../models/User');
require('dotenv').config();

// 📂 Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// 📧 Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ GET Logged-in User Profile
router.get('/', protect, (req, res) => {
  if (typeof profileController.getProfile === 'function') {
    profileController.getProfile(req, res);
  } else {
    console.error('❌ getProfile not found in profileController');
    res.status(500).json({ error: 'getProfile method missing in controller' });
  }
});

// ✅ UPDATE Profile
router.put('/', protect, async (req, res, next) => {
  await profileController.updateProfile(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Updated Profile',
      details: `Updated fields: ${Object.keys(req.body).join(', ')}`,
      ip: req.ip,
    });

    const setting = await NotificationSetting.findOne({ userId: req.user.id });
    if (setting?.emailNotif) {
      const user = await User.findById(req.user.id);
      if (user) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '📋 Your Profile was Updated',
          html: `<p>Hello ${user.name},<br>Your profile was successfully updated on ${new Date().toLocaleString()}.</p>`,
        });
      }
    }

    next();
  });
});

// ✅ UPLOAD Profile Picture
router.post('/upload', protect, upload.single('profileImage'), async (req, res, next) => {
  await profileController.uploadProfilePicture(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Uploaded Profile Picture',
      details: req.file?.filename || 'No file name',
      ip: req.ip,
    });
    next();
  });
});

module.exports = router;
