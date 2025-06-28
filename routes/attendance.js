const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth'); // ✅ FIXED
const attendanceController = require('../controllers/attendanceController');
const AuditLog = require('../models/AuditLog');

// ✅ Mark Attendance
router.post('/mark', protect, async (req, res, next) => {
  await attendanceController.markAttendance(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Marked Attendance',
      details: req.body.type === 'IN' ? 'Checked In' : 'Checked Out',
      ip: req.ip,
    });
    next();
  });
});

router.get('/my', protect, attendanceController.getMyAttendance);
router.get('/all', protect, isAdmin, attendanceController.getAllAttendance);
router.get('/user/:userId', protect, isAdmin, attendanceController.getUserAttendance);

router.patch('/:id', protect, async (req, res, next) => {
  await attendanceController.updateCheckout(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Updated Checkout Time',
      details: `Attendance ID: ${req.params.id}`,
      ip: req.ip,
    });
    next();
  });
});

router.get('/summary', protect, isAdmin, attendanceController.getSummary);

module.exports = router;
