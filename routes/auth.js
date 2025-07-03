// 📁 routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// ✅ Public routes
router.post('/register', authController.register);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/login', authController.login);

// ✅ New OTP Password Reset Routes
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/set-new-password', authController.setNewPassword);

// ✅ Protected route
router.post('/change-password', protect, authController.changePassword);

module.exports = router;
