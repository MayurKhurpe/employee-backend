const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const leaveController = require('../controllers/leaveController');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');

// ✅ Apply Leave
router.post('/', protect, leaveController.applyLeave);

// ✅ Get logged-in user's leave history
router.get('/user', protect, leaveController.getUserLeaves);

// ✅ Get all leaves (Admin with filters)
router.get('/admin/all', protect, isAdmin, async (req, res) => {
  try {
    const { userId, month } = req.query;
    const query = {};

    // 🎯 Filter by user
    if (userId) {
      query.user = userId;
    }

    // 📆 Filter by month (YYYY-MM format)
    if (month) {
      const startOfMonth = new Date(`${month}-01`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      query.startDate = { $gte: startOfMonth, $lt: endOfMonth };
    }

    const leaves = await LeaveRequest.find(query)
      .populate('user', 'name email') // to get user info
      .sort({ createdAt: -1 });

    // 🛠️ Format response to match frontend expectations
    const formattedLeaves = leaves.map((leave) => ({
      _id: leave._id,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      status: leave.status,
      adminNote: leave.adminNote,
      name: leave.user?.name || '',
      email: leave.user?.email || '',
    }));

    res.json({ leaves: formattedLeaves });
  } catch (err) {
    console.error('Error fetching admin leaves:', err);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// ✅ Approve leave (Admin)
router.put('/admin/approve/:id', protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;

    const leave = await LeaveRequest.findByIdAndUpdate(
      id,
      { status: 'Approved', adminNote: responseMessage },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({ message: 'Leave approved successfully' });
  } catch (err) {
    console.error('Error approving leave:', err);
    res.status(500).json({ error: 'Failed to approve leave' });
  }
});

// ✅ Reject leave (Admin)
router.put('/admin/reject/:id', protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;

    const leave = await LeaveRequest.findByIdAndUpdate(
      id,
      { status: 'Rejected', adminNote: responseMessage },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({ message: 'Leave rejected successfully' });
  } catch (err) {
    console.error('Error rejecting leave:', err);
    res.status(500).json({ error: 'Failed to reject leave' });
  }
});

module.exports = router;
