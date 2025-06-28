const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const nodemailer = require('nodemailer');
const profileController = require('../controllers/profileController');
const AuditLog = require('../models/AuditLog');
const NotificationSetting = require('../models/NotificationSetting');
const User = require('../models/User');

// Multer storage config for uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// GET profile of logged-in user
router.get('/', protect, profileController.getProfile);

// UPDATE profile with audit and optional email notification
router.put('/', protect, async (req, res, next) => {
  await profileController.updateProfile(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Updated Profile',
      details: `Updated fields: ${Object.keys(req.body).join(', ')}`,
      ip: req.ip,
    });

    // Email notification if enabled
    const setting = await NotificationSetting.findOne({ userId: req.user.id });
    if (setting?.emailNotif) {
      const user = await User.findById(req.user.id);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: '📋 Your Profile was Updated',
        html: `<p>Hello ${user.name},<br>Your profile was successfully updated on ${new Date().toLocaleString()}.</p>`,
      });
    }

    next();
  });
});

// UPLOAD profile picture with audit log
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
