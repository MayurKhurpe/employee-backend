// 📁 routes/admin.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// ⬇️ Models
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');

// 🔐 Protect all admin routes
router.use(protect, isAdmin);

// =========================
// ✅ USER MANAGEMENT
// =========================

// 👥 Get all users pending approval or verification
router.get('/pending-users', async (req, res) => {
  try {
    const users = await User.find({
      $or: [{ isApproved: false }, { isVerified: false }],
    }).select('name email role isApproved isVerified');

    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching pending users:', err);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// ✅ Approve a user by email (sets both approved and verified)
router.post('/approve-user', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { isApproved: true, isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error('❌ Error approving user:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// ✅ Verify a user by email (sets only verified)
router.post('/verify-user', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User verified successfully' });
  } catch (err) {
    console.error('❌ Error verifying user:', err);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// ❌ Reject/delete a user by email (fallback - unused)
router.post('/reject-user', async (req, res) => {
  try {
    const { email } = req.body;
    const deleted = await User.findOneAndDelete({ email });

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User rejected and deleted' });
  } catch (err) {
    console.error('❌ Error rejecting user:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// ❌ DELETE a user by email (used in frontend DataGrid)
router.delete('/delete-user', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndDelete({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

// 📤 Export all approved users to CSV
router.get('/export-users', async (req, res) => {
  try {
    const users = await User.find({ isApproved: true }).select('name email role');
    res.json(users);
  } catch (err) {
    console.error('❌ Export error:', err);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// =========================
// 📊 DASHBOARD ANALYTICS
// =========================
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      totalLeaves,
      pendingLeaves,
      todayCheckIns,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isApproved: false }),
      LeaveRequest.countDocuments(),
      LeaveRequest.countDocuments({ status: 'Pending' }),
      Attendance.countDocuments({
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    res.json({
      totalUsers,
      pendingUsers,
      totalLeaves,
      pendingLeaves,
      todayCheckIns,
    });
  } catch (err) {
    console.error('📊 Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
