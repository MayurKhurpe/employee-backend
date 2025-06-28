const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const profileController = require('../controllers/profileController');

// 📁 Upload Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Profile Routes
router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post('/upload', auth, upload.single('profileImage'), profileController.uploadProfilePicture);

module.exports = router;
