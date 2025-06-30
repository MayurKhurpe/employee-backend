// 📁 routes/leave.js
const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const leaveController = require('../controllers/leaveController');

// ✅ Apply Leave
router.post('/', protect, leaveController.applyLeave);

// ✅ Get logged-in user's leave history
router.get('/user', protect, leaveController.getUserLeaves);

// ✅ Get all leaves (Admin)
router.get('/admin/all', protect, isAdmin, async (req, res) => {
  try {
    const leaves = await require('../models/LeaveRequest').find().sort({ createdAt: -1 });
    res.json({ leaves }); // ✅ Match frontend expectation: { leaves: [...] }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// ✅ Approve leave (Admin)
router.put('/admin/approve/:id', protect, isAdmin, leaveController.approveLeave);

// ✅ Reject leave (Admin)
router.put('/admin/reject/:id', protect, isAdmin, leaveController.rejectLeave);

module.exports = router;
