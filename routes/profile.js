const express = require('express');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ GET Profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.userId }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
});

// ✅ PUT Profile (No image upload)
router.put('/', verifyToken, async (req, res) => {
  const {
    name,
    email,
    address,
    mobile,
    emergencyMobile,
    bloodGroup,
    department,
    joiningDate,
  } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;
  if (address) updateFields.address = address;
  if (mobile) updateFields.mobile = mobile;
  if (emergencyMobile) updateFields.emergencyMobile = emergencyMobile;
  if (bloodGroup) updateFields.bloodGroup = bloodGroup;
  if (department) updateFields.department = department;
  if (joiningDate) updateFields.joiningDate = joiningDate;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ error: 'User not found for update' });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error while updating profile' });
  }
});

module.exports = router;
