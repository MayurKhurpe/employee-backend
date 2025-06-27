const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const leaveController = require('../controllers/leaveController');

// ✅ Apply Leave
router.post('/', auth, leaveController.applyLeave);

// ✅ Approve
router.put('/admin/approve/:id', auth, isAdmin, leaveController.approveLeave);

// ✅ Reject
router.put('/admin/reject/:id', auth, isAdmin, leaveController.rejectLeave);

// ✅ View All
router.get('/admin/all', auth, isAdmin, leaveController.getAllLeaves);

module.exports = router;
