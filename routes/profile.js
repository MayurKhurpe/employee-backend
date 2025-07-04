// 📁 routes/profile.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/profileController');

// ✅ GET profile
router.get('/', protect, getProfile);

// ✅ UPDATE profile
router.put('/', protect, updateProfile);

module.exports = router;
