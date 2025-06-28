const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const leaveController = require('../controllers/leaveController');
const AuditLog = require('../models/AuditLog');

// ✅ Apply Leave
router.post('/', auth, async (req, res, next) => {
  await leaveController.applyLeave(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Leave Applied',
      details: `From ${req.body.startDate} to ${req.body.endDate}`,
      ip: req.ip,
    });
    next();
  });
});

// ✅ Approve
router.put('/admin/approve/:id', auth, isAdmin, async (req, res, next) => {
  await leaveController.approveLeave(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Approved Leave',
      details: `Leave ID: ${req.params.id}`,
      ip: req.ip,
    });
    next();
  });
});

// ✅ Reject
router.put('/admin/reject/:id', auth, isAdmin, async (req, res, next) => {
  await leaveController.rejectLeave(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Rejected Leave',
      details: `Leave ID: ${req.params.id}`,
      ip: req.ip,
    });
    next();
  });
});

// ✅ View All
router.get('/admin/all', auth, isAdmin, leaveController.getAllLeaves);

module.exports = router;
