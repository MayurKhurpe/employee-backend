const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const leaveController = require('../controllers/leaveController');

// ✅ Apply Leave
router.post('/', protect, leaveController.applyLeave);

// ✅ Get logged-in user's leave history
router.get('/user', protect, leaveController.getUserLeaves);

// ✅ Get all leaves (Admin)
router.get('/', protect, isAdmin, leaveController.getAllLeaves);

// ✅ Approve leave (Admin)
router.put('/admin/approve/:id', protect, isAdmin, leaveController.approveLeave);

// ❌ Reject leave (Admin)
router.put('/admin/reject/:id', protect, isAdmin, leaveController.rejectLeave);

module.exports = router;
