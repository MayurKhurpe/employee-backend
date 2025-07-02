const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, isAdmin } = require('../middleware/auth');

// ✅ GET all employees for dropdown
router.get('/all', protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'employee' }).select('_id name email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

module.exports = router;
