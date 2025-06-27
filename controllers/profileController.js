const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// ✅ GET Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

// ✅ UPDATE Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, address, mobile, emergencyMobile, bloodGroup, department, joiningDate } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      {
        name, email, address, mobile,
        emergencyMobile, bloodGroup, department, joiningDate
      },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error updating profile' });
  }
};

// ✅ UPLOAD Profile Picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old image if exists
    if (user.profileImage) {
      const oldPath = path.join(__dirname, '..', 'uploads', user.profileImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const newFilename = req.file.filename;
    user.profileImage = newFilename;
    await user.save();

    res.json({ message: 'Profile picture updated', filename: newFilename });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
};
