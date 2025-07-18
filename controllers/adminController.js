// 📁 routes/admin.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// ✅ FIX: Import the admin controller
const adminController = require('../controllers/adminController');

// ⬇️ Models
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/attendanceModel');

// 🔐 Protect all admin routes
router.use(protect, isAdmin);

// =========================
// ✅ USER MANAGEMENT
// =========================

// 📌 Get all users (handled by controller)
router.get('/all-users', adminController.getAllUsers);

// ✅ Pending users (in controller)
router.get('/pending-users', adminController.getPendingUsers);

// ✅ Approve a user (in controller)
router.post('/approve-user', adminController.approveUser);

// ✅ Reject user with optional email (in controller)
router.post('/reject-user', adminController.rejectUser);

// ✅ Export approved users to CSV
router.get('/export-users', adminController.exportUsers);

// ✅ Verify a user (if needed separately)
router.post('/verify-user', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    console.error('❌ Error verifying user:', err);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// ✅ Delete user
router.delete('/delete-user', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ error: 'Error deleting user' });
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
