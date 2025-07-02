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

    if (status === 'Remote Work') {
      if (!customer || !workLocation || !assignedBy) {
        return res.status(400).json({ message: 'All remote work fields are required.' });
      }
      newAttendance.customer = customer;
      newAttendance.workLocation = workLocation;
      newAttendance.assignedBy = assignedBy;
    }

    if (['Present', 'Absent', 'Half Day'].includes(status)) {
      if (typeof location === 'object' && location.lat && location.lng) {
        newAttendance.location = `${location.lat},${location.lng}`;
      } else {
        return res.status(400).json({ message: 'Location (lat,lng) is required for this status.' });
      }
    }

    await newAttendance.save();

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

// ✅ Get All Attendance (Admin) with month/user filters
exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, date, month, userId } = req.query;

    // Prepare date filter
    let queryDate = null;
    if (date) queryDate = getStartOfDay(new Date(date));

    // Get all employees
    const users = await User.find({ role: 'employee' }).select('_id name email');

    // Apply month or date filter
    let attendanceFilter = {};
    if (queryDate) {
      attendanceFilter.date = queryDate;
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      attendanceFilter.date = { $gte: start, $lte: end };
    }

    if (userId) {
      attendanceFilter.userId = userId;
    }

    const markedRecords = await Attendance.find(attendanceFilter);

    // Map userId => attendance record
    const attendanceMap = new Map();
    markedRecords.forEach((rec) => {
      attendanceMap.set(rec.userId.toString() + rec.date?.toISOString(), rec);
    });

    // Filter users if specific userId
    const filteredUsers = userId
      ? users.filter((u) => u._id.toString() === userId)
      : users;

    let fullRecords = [];

    if (queryDate || userId || month) {
      // One record per user (specific date or month)
      fullRecords = filteredUsers.map((user) => {
        const key = month
          ? null // for month, we allow multiple
          : userId
          ? markedRecords.find((r) => r.userId.toString() === user._id.toString())
          : attendanceMap.get(user._id.toString() + queryDate?.toISOString());

        return key || {
          _id: 'not-marked-' + user._id,
          userId: user._id,
          name: user.name,
          email: user.email,
          date: queryDate || new Date(),
          status: 'Not Marked Yet',
          checkInTime: null,
          checkOutTime: null,
          location: '—',
          customer: '—',
          workLocation: '—',
          assignedBy: '—',
        };
      });

      // If month is used, return all found for that user/month (not placeholder)
      if (month) {
        fullRecords = markedRecords.map((rec) => rec.toObject());
      }
    }

    // Sort and paginate
    const sorted = fullRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + Number(limit));
    const totalPages = Math.ceil(fullRecords.length / limit);

    res.json({
      records: paginated,
      totalPages,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
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

// ✅ Updated Summary with Date support
exports.getSummary = async (req, res) => {
  try {
    const queryDate = req.query.date ? getStartOfDay(new Date(req.query.date)) : getStartOfDay(new Date());

    const allUsers = await User.find({ role: 'employee' });
    const todayRecords = await Attendance.find({ date: queryDate });

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

// ✅ My Summary
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
