// 📁 routes/password.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const RESET_SECRET = process.env.RESET_SECRET || 'resetsecretkey'; // Use env var in production

// 🔹 Forgot Password - generate reset token and log reset link
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate reset token valid for 10 minutes
    const token = jwt.sign({ email }, RESET_SECRET, { expiresIn: '10m' });

    // TODO: Send reset link via email in production
    console.log(`🔗 Reset link: http://localhost:3000/reset-password/${token}`);

    res.json({ message: 'Reset link sent to email (check server logs)' });
  } catch (err) {
    console.error('Forgot Password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔹 Reset Password - validate token, update password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Verify token
    const decoded = jwt.verify(token, RESET_SECRET);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password by email in token
    const user = await User.findOneAndUpdate(
      { email: decoded.email },
      { password: hashedPassword }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset Password error:', err);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
