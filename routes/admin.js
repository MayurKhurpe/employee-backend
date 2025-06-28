// 📁 routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// ⬇️ Models
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');

// 🔐 Protect all admin routes
router.use(authMiddleware, isAdmin);

// =========================
// ✅ USER MANAGEMENT
// =========================

// 👥 Get all users pending approval
router.get('/pending-users', adminController.getPendingUsers);

// ✅ Approve a user by email
router.post('/approve-user', adminController.approveUser);

// ❌ Reject/delete a user by email
router.post('/reject-user', adminController.rejectUser);

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
router.get('/export-users', adminController.exportUsers);

// =========================
// 📊 DASHBOARD ANALYTICS
// =========================
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      totalDocuments,
      totalLeaves,
      pendingLeaves,
      todayCheckIns,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isApproved: false }),
      Document.countDocuments(),
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
      totalDocuments,
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
