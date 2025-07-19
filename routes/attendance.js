const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');
const AuditLog = require('../models/AuditLog');
const nodemailer = require('nodemailer'); // ✅ Email
const Attendance = require('../models/attendanceModel');

const {
  markAttendance,
  getMyAttendance,
  getMySummary,
  getAllAttendance,
  getUserAttendance,
  updateCheckout,
  getSummary,
  approveAttendance,
  rejectAttendance,
} = attendanceController;

// ✅ Only HR email or Admin can approve/reject
function isHrOnly(req, res, next) {
  if (
    req.user?.email === 'hr.seekersautomation@gmail.com' ||
    req.user?.role === 'admin'
  ) {
    return next();
  }
  return res.status(403).json({ message: 'HR/Admin only.' });
}

// ✅ Mark Attendance with Audit Logging + Location Required (for in-office)
router.post('/mark', protect, markAttendance);

// ✅ Get logged-in user's full attendance
router.get('/my', protect, getMyAttendance);

// ✅ Get logged-in user's summary (for dashboard)
router.get('/my-summary', protect, getMySummary);

// ✅ Admin: Get all attendance
router.get('/all', protect, isAdmin, getAllAttendance);

// ✅ Admin: Get specific user's attendance
router.get('/user/:userId', protect, isAdmin, getUserAttendance);

// ✅ Update check-out time with Audit Logging
router.patch('/:id', protect, async (req, res) => {
  await updateCheckout(req, res);

  AuditLog.create({
    user: req.user,
    action: 'Updated Checkout Time',
    details: `Attendance ID: ${req.params.id}`,
    ip: req.ip,
  }).catch(err => console.error('AuditLog error:', err));
});

// ✅ Admin: Daily attendance summary (e.g., for charts, reports)
router.get('/summary', protect, isAdmin, getSummary);

// ✅ HR/Admin: Approve Attendance
router.put('/approve/:id', protect, isHrOnly, approveAttendance);

// ✅ HR/Admin: Reject Attendance
router.put('/reject/:id', protect, isHrOnly, rejectAttendance);

// ✅ Auto-marked Absent count (today, no check-in)
router.get('/auto-marked', protect, isAdmin, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const autoAbsent = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'Absent',
      $or: [{ checkInTime: null }, { checkInTime: '' }, { checkInTime: { $exists: false } }],
    });

    res.json({ count: autoAbsent.length });
  } catch (err) {
    console.error('Error fetching auto-marked:', err);
    res.status(500).json({ error: 'Failed to fetch auto-marked data' });
  }
});

module.exports = router;
