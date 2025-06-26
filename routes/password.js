// routes/password.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const RESET_SECRET = 'resetsecretkey'; // Should be stored in .env in production

// 🔹 Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign({ email }, RESET_SECRET, { expiresIn: '10m' });

    // In real app, send via email. For now, return to frontend
    console.log(`🔗 Reset link: http://localhost:3000/reset-password/${token}`);
    res.json({ message: 'Reset link sent to email (check console)' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔹 Reset Password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, RESET_SECRET);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findOneAndUpdate(
      { email: decoded.email },
      { password: hashedPassword }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
