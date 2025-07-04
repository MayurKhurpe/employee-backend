const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const nodemailer = require('nodemailer');
const AuditLog = require('../models/AuditLog');
const NotificationSetting = require('../models/NotificationSetting');
const User = require('../models/User');
require('dotenv').config();

// ✅ Import controller functions (ensure the path is correct and file name is `profileController.js`)
const profileController = require('../controllers/profileController');
const getProfile = profileController.getProfile;
const updateProfile = profileController.updateProfile;
const uploadProfilePicture = profileController.uploadProfilePicture;

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

    const setting = await NotificationSetting.findOne({ userId: req.user.userId });
    if (setting?.emailNotif) {
      const user = await User.findById(req.user.userId);
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
  await uploadProfilePicture(req, res, async () => {
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
