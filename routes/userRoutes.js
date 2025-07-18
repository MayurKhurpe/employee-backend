// 📁 routes/userRoutes.js (or your filename)
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ❌ Wrong path (causes middleware issues):
// const { protect, isAdmin } = require('../middleware/auth');

// ✅ Fixed path:
const { protect, isAdmin } = require('../middleware/auth'); // ✏️ Changed this line

// ✅ GET all employees for dropdown
router.get('/all', protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'employee' }).select('_id name email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// ✅ Get logged-in user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

// ✅ Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

// ✅ Get user details by ID (Admin only)
router.get('/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user details', error: err.message });
  }
});

module.exports = router;
