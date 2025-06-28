// 📁 controllers/adminController.js
const User = require('../models/User');
const { Parser } = require('json2csv');

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

// 📤 Export all approved users to CSV
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find({ isApproved: true }).select('name email role createdAt');

    const fields = ['name', 'email', 'role', 'createdAt'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(users);

    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    return res.send(csv);
  } catch (err) {
    console.error('❌ Export users error:', err);
    res.status(500).json({ error: 'Failed to export users' });
  }
};
