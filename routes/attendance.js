const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const attendanceController = require('../controllers/attendanceController');
const AuditLog = require('../models/AuditLog');

// ✅ Mark Attendance
router.post('/mark', authMiddleware, async (req, res, next) => {
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

router.get('/my', authMiddleware, attendanceController.getMyAttendance);
router.get('/all', authMiddleware, isAdmin, attendanceController.getAllAttendance);
router.get('/user/:userId', authMiddleware, isAdmin, attendanceController.getUserAttendance);

router.patch('/:id', authMiddleware, async (req, res, next) => {
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

router.get('/summary', authMiddleware, isAdmin, attendanceController.getSummary);

module.exports = router;
