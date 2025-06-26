// 📁 routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const Attendance = require('../models/attendanceModel');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ POST - Mark Today's Attendance (POST /api/attendance/mark)
router.post('/mark', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status = 'Present', location, checkInTime } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyMarked = await Attendance.findOne({ userId, date: today });
    if (alreadyMarked) {
      return res.status(400).json({ message: 'Attendance already marked for today.' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newAttendance = new Attendance({
      userId,
      name: user.name,
      email: user.email,
      date: today,
      status,
      location,
      checkInTime,
    });

    await newAttendance.save();

    // Email alert if Absent
    if (status === 'Absent') {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'manager@yourcompany.com',
        subject: `❌ Absence Alert - ${user.name}`,
        html: `
          <p><strong>${user.name}</strong> was marked <strong>Absent</strong> today.</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        `,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error('❌ Email error:', err);
        else console.log('📧 Absence email sent:', info.response);
      });
    }

    res.status(201).json({ message: 'Attendance marked successfully.', attendance: newAttendance });
  } catch (err) {
    res.status(500).json({ message: 'Error marking attendance.', error: err.message });
  }
});

// ✅ GET - User's Own Attendance
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const records = await Attendance.find({ userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
});

// ✅ GET - Admin: All Attendance
router.get('/all', authMiddleware, isAdmin, async (req, res) => {
  try {
    const records = await Attendance.find().populate('userId', 'name email').sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all attendance.', error: err.message });
  }
});

// ✅ GET - Admin: Specific User Attendance
router.get('/user/:userId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
});

// ✅ PATCH - Update Check-Out Time
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { checkOutTime } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });

    if (attendance.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    attendance.checkOutTime = checkOutTime;
    await attendance.save();

    res.json({ message: 'Check-out time recorded successfully.', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Error updating attendance.', error: err.message });
  }
});

// ✅ GET - Admin: Attendance Summary
router.get('/summary', authMiddleware, isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allUsers = await User.find({});
    const todayRecords = await Attendance.find({ date: today });

    const todayPresent = todayRecords.filter((r) => r.status === 'Present').length;
    const todayAbsent = todayRecords.filter((r) => r.status === 'Absent').length;
    const todayHalfDay = todayRecords.filter((r) => r.status === 'Half Day').length;
    const todayRemote = todayRecords.filter(
      (r) =>
        (r.status === 'Present' || r.status === 'Half Day') &&
        r.location?.toLowerCase() === 'remote'
    ).length;

    res.json({
      todayPresent,
      todayAbsent,
      todayHalfDay,
      todayRemote,
      totalEmployees: allUsers.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
});

module.exports = router;
