const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');
const AuditLog = require('../models/AuditLog');
const nodemailer = require('nodemailer'); // ✅ Email

// ✅ Mark Attendance with Audit Logging + Location Required
router.post('/mark', protect, async (req, res, next) => {
  const { location, status } = req.body;

  // ✅ Block attendance if location is not provided
  if (!location || !location.lat || !location.lng) {
    return res.status(400).json({ message: '📍 Location is required to mark attendance.' });
  }

  // ✅ Optional: Distance check from office location
  const officeLat = 18.641478;
  const officeLng = 73.795228;
  const radiusInKm = 0.1;

  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(officeLat - location.lat);
  const dLng = toRad(officeLng - location.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(location.lat)) * Math.cos(toRad(officeLat)) *
    Math.sin(dLng / 2) ** 2;
  const distance = 2 * R * Math.asin(Math.sqrt(a));

  const isOutside = distance > radiusInKm;

  // ✅ Optional: log or alert if user is outside
  if (isOutside && (status === 'Present' || status === 'Half Day')) {
    console.log(`📍 Outside office radius: ${distance.toFixed(2)} km`);

    // ✅ Send alert email to admin
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
      if (usedOfficeWiFi) {
  outsideLocationHtml += `<p style="color: green;"><strong>✅ Verified via Office WiFi</strong></p>`;
}
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Failed to send admin email:', error);
      } else {
        console.log('✅ Email sent to admin:', info.response);
      }
    });
  }

  // ✅ Continue with controller
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
