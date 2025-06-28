// 📁 controllers/adminController.js
const User = require('../models/User');
const NotificationSetting = require('../models/NotificationSetting');
const { Parser } = require('json2csv');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📧 Setup email transporter (consider OAuth2 in production for Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

// ✅ Approve a user + send email if user has emailNotif = true
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

    // Check user notification preferences
    const notif = await NotificationSetting.findOne({ userId: user._id });
    if (notif?.emailNotif) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: '🎉 You have been approved!',
        html: `
          <h2>Welcome, ${user.name}!</h2>
          <p>Your account has been <strong style="color:green;">approved</strong> by the admin team. You can now log in and start using the Employee Management System.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Click here to login</a></p>
        `,
      });
    }

    res.status(200).json({ message: 'User approved', user });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

// ✅ Reject (delete) a user + optional email notification
exports.rejectUser = async (req, res) => {
  const { email, notify = false } = req.body; // notify: boolean to send rejection email
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (notify) {
      // Check user notification preferences
      const notif = await NotificationSetting.findOne({ userId: user._id });
      if (notif?.emailNotif) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '🚫 Account Rejected',
          html: `
            <p>Hi ${user.name},</p>
            <p>We're sorry, but your account registration request has been <span style="color:red;"><strong>rejected</strong></span> by the admin.</p>
            <p>If you think this is a mistake, please contact the admin team.</p>
          `,
        });
      }
    }

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
