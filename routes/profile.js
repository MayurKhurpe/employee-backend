const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const profileController = require('../controllers/profileController');
const AuditLog = require('../models/AuditLog');

// 📁 Upload Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Profile Routes
router.get('/', protect, profileController.getProfile);

router.put('/', protect, async (req, res, next) => {
  await profileController.updateProfile(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Updated Profile',
      details: `Updated fields: ${Object.keys(req.body).join(', ')}`,
      ip: req.ip,
    });
    next();
  });
});

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
