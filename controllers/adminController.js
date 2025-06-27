// 📁 controllers/adminController.js
const User = require('../models/User');

// ✅ Get all unapproved users
exports.getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({ isApproved: false });
    res.status(200).json(pendingUsers);
  } catch (err) {
    console.error('Error fetching pending users:', err);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
};

// ✅ Approve a user
exports.approveUser = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { isApproved: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({ message: 'User approved', user });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

// ✅ Reject (delete) a user
exports.rejectUser = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({ message: 'User rejected and deleted' });
  } catch (err) {
    console.error('Error rejecting user:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
};
