const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const leaveController = require('../controllers/leaveController');
const LeaveRequest = require('../models/LeaveRequest');

// ✅ Apply Leave
router.post('/', protect, leaveController.applyLeave);

// ✅ Get logged-in user's leave history
router.get('/user', protect, leaveController.getUserLeaves);

// ✅ Get all leaves (Admin with filters: by user + month)
router.get('/admin/all', protect, isAdmin, async (req, res) => {
  try {
    const { userId, month } = req.query;
    const query = {};

    if (userId) {
  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(userId)) {
    query.userId = new mongoose.Types.ObjectId(userId);
  } else {
    return res.status(400).json({ error: 'Invalid userId' });
  }
}

if (month) {
  // month expected: YYYY-MM
  const [y, m] = month.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
  }
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 1); // next month start (exclusive)
  query.startDate = { $gte: startOfMonth, $lt: endOfMonth };
}


    const leaves = await LeaveRequest.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const formattedLeaves = leaves.map((leave) => ({
      _id: leave._id,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      status: leave.status,
      adminNote: leave.adminNote,
      name: leave.userId?.name || '',
      email: leave.userId?.email || '',
    }));

    res.json({ leaves: formattedLeaves });
  } catch (err) {
    console.error('🔥 Error fetching admin leaves:', err);
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
      {
        status: 'Approved',
        adminNote: responseMessage || 'Your leave has been approved.',
      },
      { new: true }
    ).populate('userId', 'email name');

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({ message: 'Leave approved successfully', leave });
  } catch (err) {
    console.error('🔥 Error approving leave:', err);
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
      {
        status: 'Rejected',
        adminNote: responseMessage || 'Your leave has been rejected.',
      },
      { new: true }
    ).populate('userId', 'email name');

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({ message: 'Leave rejected successfully', leave });
  } catch (err) {
    console.error('🔥 Error rejecting leave:', err);
    res.status(500).json({ error: 'Failed to reject leave' });
  }
});

// ✅ (Optional) Get leave stats (Admin)
router.get('/admin/stats', protect, isAdmin, async (req, res) => {
  try {
    const approved = await LeaveRequest.countDocuments({ status: 'Approved' });
    const rejected = await LeaveRequest.countDocuments({ status: 'Rejected' });
    const pending = await LeaveRequest.countDocuments({ status: 'Pending' });

    res.json({ approved, rejected, pending });
  } catch (err) {
    console.error('🔥 Error fetching leave stats:', err);
    res.status(500).json({ error: 'Failed to fetch leave stats' });
  }
});

module.exports = router;
