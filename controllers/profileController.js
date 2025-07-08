// 📁 controllers/profileController.js
const User = require('../models/User');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  const {
    name,
    email,
    address,
    mobile,
    emergencyMobile,
    bloodGroup,
    department,
    joiningDate,
    dob
  } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

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
     user.joiningDate = joiningDate ? new Date(joiningDate) : user.joiningDate;
     user.dob = dob ? new Date(dob) : user.dob;

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Error updating profile' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
