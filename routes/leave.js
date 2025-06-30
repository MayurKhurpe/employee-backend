const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const leaveController = require('../controllers/leaveController');

// ✅ Apply Leave
router.post('/', protect, leaveController.applyLeave);

// ✅ Get logged-in user's leave history
router.get('/user', protect, leaveController.getUserLeaves);

// ✅ Admin: View all leaves
router.get('/admin/all', protect, isAdmin, leaveController.getAllLeaves);

// ✅ Admin: Approve
router.put('/admin/approve/:id', protect, isAdmin, leaveController.approveLeave);

// ✅ Admin: Reject
router.put('/admin/reject/:id', protect, isAdmin, leaveController.rejectLeave);

module.exports = router;
