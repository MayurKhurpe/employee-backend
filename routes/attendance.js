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
router.post('/mark', protect, async (req, res) => {
  const { location, status } = req.body;

  // ✅ Require location ONLY for in-office types
  if ((status === 'Present' || status === 'Half Day') && (!location || !location.lat || !location.lng)) {
    return res.status(400).json({ message: '📍 Location is required for in-office attendance.' });
  }

  // ✅ Optional: Distance check from office location
  const officeLat = 18.641478;
  const officeLng = 73.795228;
  const radiusInKm = 0.1;

  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(officeLat - (location?.lat ?? officeLat));
  const dLng = toRad(officeLng - (location?.lng ?? officeLng));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(location?.lat ?? officeLat)) * Math.cos(toRad(officeLat)) *
    Math.sin(dLng / 2) ** 2;
  const distance = 2 * R * Math.asin(Math.sqrt(a));
  const isOutside = distance > radiusInKm;

  // ✅ Send alert email to admin if outside & claimed in-office
  if (isOutside && (status === 'Present' || status === 'Half Day')) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ALERT_EMAIL,
        pass: process.env.ALERT_EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.ALERT_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: '⚠ Outside Office Attendance Alert',
      html: `
        <h3>🚨 Outside Office Attendance Detected</h3>
        <p><strong>User:</strong> ${req.user.name} (${req.user.email})</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Location:</strong> ${location.lat}, ${location.lng}</p>
        <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error('❌ Failed to send admin email:', error);
      else console.log('✅ Email sent to admin:', info.response);
    });
  }

  // ✅ Call controller
  await markAttendance(req, res);

  // ✅ Log AFTER markAttendance (non-blocking)
  AuditLog.create({
    user: req.user,
    action: 'Marked Attendance',
    details: `Status: ${status}`,
    ip: req.ip,
  }).catch(err => console.error('AuditLog error:', err));
});

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
