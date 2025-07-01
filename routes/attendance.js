const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');
const AuditLog = require('../models/AuditLog');

// ✅ Mark Attendance with Audit Logging
router.post('/mark', protect, async (req, res, next) => {
  await attendanceController.markAttendance(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Marked Attendance',
      details: `Status: ${req.body.status}`,
      ip: req.ip,
    });
    next();
  });
});

// ✅ Get logged-in user's full attendance
router.get('/my', protect, attendanceController.getMyAttendance);

// ✅ Get logged-in user's summary (for dashboard)
router.get('/my-summary', protect, attendanceController.getMySummary);

// ✅ Admin: Get all attendance
router.get('/all', protect, isAdmin, attendanceController.getAllAttendance);

// ✅ Admin: Get specific user's attendance
router.get('/user/:userId', protect, isAdmin, attendanceController.getUserAttendance);

// ✅ Update check-out time with Audit Logging
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

// ✅ Admin: Daily attendance summary (e.g., for charts, reports)
router.get('/summary', protect, isAdmin, attendanceController.getSummary);

module.exports = router;
