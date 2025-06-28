// 📁 controllers/profileController.js
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

/**
 * @route   GET /api/profile
 * @desc    Fetch logged-in user's profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    console.error('❌ Error fetching profile:', err);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

/**
 * @route   PUT /api/profile
 * @desc    Update user profile details
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  const {
    name,
    email,
    address,
    mobile,
    emergencyMobile,
    bloodGroup,
    department,
    joiningDate
  } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Optional: Prevent email change unless explicitly intended
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    user.name = name || user.name;
    user.address = address || user.address;
    user.mobile = mobile || user.mobile;
    user.emergencyMobile = emergencyMobile || user.emergencyMobile;
    user.bloodGroup = bloodGroup || user.bloodGroup;
    user.department = department || user.department;
    user.joiningDate = joiningDate || user.joiningDate;

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('❌ Error updating profile:', err);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

/**
 * @route   POST /api/profile/upload
 * @desc    Upload or update profile picture
 * @access  Private
 */
exports.uploadProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 🧹 Delete old profile image
    if (user.profileImage) {
      const oldPath = path.join(__dirname, '..', 'uploads', user.profileImage);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // 💾 Save new image
    user.profileImage = req.file.filename;
    await user.save();

    res.status(200).json({ message: 'Profile picture updated', filename: req.file.filename });
  } catch (err) {
    console.error('❌ Upload failed:', err);
    res.status(500).json({ error: 'Profile picture upload failed' });
  }
};
