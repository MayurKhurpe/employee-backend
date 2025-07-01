const Attendance = require('../models/attendanceModel');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper to get start-of-day
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ✅ Mark Attendance
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      status = 'Present',
      location = null,
      checkInTime,
      customer,
      workLocation,
      assignedBy,
    } = req.body;

    const today = getStartOfDay(new Date());

    // ❌ Prevent duplicate entry
    if (await Attendance.findOne({ userId, date: today })) {
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
      checkInTime,
    });

    // ✅ For Remote Work: Validate required fields, no location needed
    if (status === 'Remote Work') {
      if (!customer || !workLocation || !assignedBy) {
        return res.status(400).json({ message: 'All remote work fields are required.' });
      }
      newAttendance.customer = customer;
      newAttendance.workLocation = workLocation;
      newAttendance.assignedBy = assignedBy;
    }

    // ✅ For Office statuses, location is mandatory
    if (['Present', 'Absent', 'Half Day'].includes(status)) {
      if (typeof location === 'object' && location.lat && location.lng) {
        newAttendance.location = `${location.lat},${location.lng}`;
      } else {
        return res.status(400).json({ message: 'Location (lat,lng) is required for this status.' });
      }
    }

    await newAttendance.save();

    // 📧 Optional Email on Absent
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

    res.status(201).json({
      message: 'Attendance marked successfully.',
      attendance: newAttendance.toObject(),
    });

  } catch (err) {
    console.error('❌ Attendance Marking Failed:', err);
    res.status(500).json({ message: 'Error marking attendance.', error: err.message });
  }
};

// ✅ Get My Attendance Records
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const records = await Attendance.find({ userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
};

// ✅ Get All Attendance (Admin)
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

// ✅ Get Specific User Attendance (Admin)
exports.getUserAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user attendance.', error: err.message });
  }
};

// ✅ Update Checkout Time
exports.updateCheckout = async (req, res) => {
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
};

// ✅ Admin: Summary Stats for Today
exports.getSummary = async (req, res) => {
  try {
    const today = getStartOfDay(new Date());

    const allUsers = await User.find({ role: 'employee' });
    const todayRecords = await Attendance.find({ date: today });

    const markedUserIds = new Set(todayRecords.map((r) => r.userId.toString()));

    let todayPresent = 0;
    let todayAbsentMarked = 0;
    let todayHalfDay = 0;
    let todayRemote = 0;

    todayRecords.forEach((r) => {
      const status = r.status?.toLowerCase();
      if (status === 'present') todayPresent++;
      else if (status === 'absent') todayAbsentMarked++;
      else if (status === 'half day') todayHalfDay++;
      else if (status === 'remote work') todayRemote++;
    });

    const trulyAbsent = allUsers.filter(
      (u) => !markedUserIds.has(u._id.toString())
    ).length;

    const totalAbsent = todayAbsentMarked + trulyAbsent;

    res.json({
      todayPresent,
      todayAbsent: totalAbsent,
      todayHalfDay,
      todayRemote,
      totalEmployees: allUsers.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
};

// ✅ NEW: Get My Summary (for dashboard)
exports.getMySummary = async (req, res) => {
  try {
    const userId = req.user.userId;

    const records = await Attendance.find({ userId });

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let remoteWork = 0;

    records.forEach((r) => {
      const status = r.status?.toLowerCase();
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'half day') halfDay++;
      else if (status === 'remote work') remoteWork++;
    });

    res.json({
      present,
      absent,
      halfDay,
      remoteWork,
      totalDays: records.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
};
