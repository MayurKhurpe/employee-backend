// 📁 controllers/attendanceController.js
const Attendance = require('../models/attendanceModel');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Setup email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: get start of day for date comparisons (to ensure consistent UTC midnight)
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ✅ Mark Today's Attendance
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status = 'Present', location, checkInTime } = req.body;

    const today = getStartOfDay(new Date());

    const alreadyMarked = await Attendance.findOne({ userId, date: today });
    if (alreadyMarked) {
      return res.status(400).json({ message: 'Attendance already marked for today.' });
    }

    const user = await User.findById(userId);
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

    // 📧 Email alert if Absent
    if (status === 'Absent') {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: 'manager@yourcompany.com',
        subject: `❌ Absence Alert - ${user.name}`,
        html: `
          <p><strong>${user.name}</strong> was marked <strong>Absent</strong> today.</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Date:</strong> ${today.toLocaleDateString()}</p>
        `,
      });
    }

    res.status(201).json({ message: 'Attendance marked successfully.', attendance: newAttendance });
  } catch (err) {
    console.error('❌ Attendance Marking Failed:', err);
    res.status(500).json({ message: 'Error marking attendance.', error: err.message });
  }
};

// ✅ Get Logged In User's Attendance
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const records = await Attendance.find({ userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
};

// ✅ Admin: Get All Attendance
exports.getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('userId', 'name email')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all attendance.', error: err.message });
  }
};

// ✅ Admin: Get Specific User Attendance
exports.getUserAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user attendance.', error: err.message });
  }
};

// ✅ Update Check-Out Time
exports.updateCheckout = async (req, res) => {
  try {
    const { checkOutTime } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });

    // Security: Only user who marked attendance can update checkout
    if (attendance.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    attendance.checkOutTime = checkOutTime;
    await attendance.save();

    res.json({ message: 'Check-out time recorded successfully.', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Error updating attendance.', error: err.message });
  }
};

// ✅ Admin: Summary Stats for Today
exports.getSummary = async (req, res) => {
  try {
    const today = getStartOfDay(new Date());

    const allUsers = await User.find({});
    const todayRecords = await Attendance.find({ date: today });

    // Count attendance status types
    const todayPresent = todayRecords.filter((r) => r.status === 'Present').length;
    const todayAbsent = todayRecords.filter((r) => r.status === 'Absent').length;
    const todayHalfDay = todayRecords.filter((r) => r.status === 'Half Day').length;
    const todayRemote = todayRecords.filter((r) => r.status === 'Remote Work').length;

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
};
