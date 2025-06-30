const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const leaveController = require('../controllers/leaveController');

// ✅ Apply Leave
router.post('/', protect, leaveController.applyLeave);

// ✅ Get logged-in user's leave history
router.get('/user', protect, leaveController.getUserLeaves);

// ✅ Fix: This is the correct route for /api/leave/admin/all
router.get('/admin/all', protect, isAdmin, leaveController.getAllLeaves);

// ✅ Approve leave (Admin)
router.put('/admin/approve/:id', protect, isAdmin, leaveController.approveLeave);

// ✅ Reject leave (Admin)
router.put('/admin/reject/:id', protect, isAdmin, leaveController.rejectLeave);

module.exports = router;
