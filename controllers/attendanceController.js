// ✅ Required Modules
const Attendance = require('../models/attendanceModel');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Dayjs + Timezone setup
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ Helpers
const formatTimeSafe = (val) => {
  if (!val) return 'N/A';
  if (typeof val === 'string' && /^\d{1,2}:\d{2}$/.test(val.trim())) return val.trim();
  const d = dayjs(val);
  return d.isValid() ? d.tz('Asia/Kolkata').format('HH:mm') : 'N/A';
};

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isWithinOffice = (lat, lng) => {
  const officeLat = 18.641478;
  const officeLng = 73.795228;
  const R = 6371;
  const toRad = (val) => (val * Math.PI) / 180;
  const dLat = toRad(officeLat - lat);
  const dLng = toRad(officeLng - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(officeLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a)) <= 1;
};

// ✅ Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ===============================================================
   1️⃣ MARK ATTENDANCE
================================================================*/
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { status = 'Present', location = null, checkInTime, customer, workLocation, assignedBy } = req.body;

    const nowIST = dayjs().tz('Asia/Kolkata');
    if (status === 'Present' && nowIST.isAfter(nowIST.hour(9).minute(45))) {
      return res.status(403).json({ message: '⛔ Marking Present not allowed after 9:45 AM IST. Use Late Mark.' });
    }

    const today = getStartOfDay(new Date());
    const alreadyMarked = await Attendance.findOne({ userId, date: today });
    if (alreadyMarked) {
      return res.status(400).json({
        message: alreadyMarked.approvalStatus === 'Pending'
          ? 'Attendance already pending for approval.'
          : 'Attendance already marked for today.'
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (status === 'Late Mark') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lateMarks = await Attendance.countDocuments({ userId, date: { $gte: startOfMonth, $lte: today }, status: 'Late Mark' });
      if (lateMarks >= 3) return res.status(403).json({ message: '❌ Late Mark limit reached for this month.' });
    }

    if (status === 'Remote Work' && (!customer || !workLocation || !assignedBy)) {
      return res.status(400).json({ message: 'All remote work fields are required.' });
    }

    const outsideLocation = ['Present', 'Half Day'].includes(status)
      ? !location || !isWithinOffice(location.lat, location.lng)
      : false;

    const newAttendance = new Attendance({
      userId,
      name: user.name,
      email: user.email,
      date: today,
      status,
      requestedStatus: status,
      approvalStatus: 'Pending',
      checkInTime,
      location: location ? `${location.lat},${location.lng}` : '—',
      customer,
      workLocation,
      assignedBy,
    });

    await newAttendance.save();

    if (['Present', 'Half Day'].includes(status) && outsideLocation) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: 'hr.seekersautomation@gmail.com',
        subject: `⚠ Outside Attendance Alert - ${user.name}`,
        html: `
          <h3>⚠ ${user.name} marked ${status} outside office location</h3>
          <p><strong>Date:</strong> ${today.toDateString()}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Check-in Time:</strong> ${checkInTime || '—'}</p>
          <p><strong>Location:</strong> ${location ? `Lat: ${location.lat}, Lng: ${location.lng}` : 'Not Available'}</p>
        `
      });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: '📝 Attendance Submitted - Pending Approval',
      html: `
        Hi ${user.name},<br><br>
        Your attendance for <b>${dayjs(today).tz('Asia/Kolkata').format('DD MMM YYYY')}</b> has been submitted as <b>${status}</b>.<br>
        Current status: <b>Pending HR Approval</b>.
      `
    });

    res.status(201).json({ message: 'Attendance submitted (Pending approval).', attendance: newAttendance });
  } catch (err) {
    res.status(500).json({ message: 'Error marking attendance.', error: err.message });
  }
};

/* ===============================================================
   2️⃣ APPROVE ATTENDANCE
================================================================*/
exports.approveAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findById(id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });

    if (attendance.approvalStatus !== 'Pending') return res.status(400).json({ message: 'Already processed.' });

    attendance.status = attendance.requestedStatus || attendance.status;
    attendance.approvalStatus = 'Approved';
    await attendance.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: attendance.email,
      subject: '✅ Attendance Approved',
      html: `Hi ${attendance.name},<br>Your attendance for ${attendance.date.toDateString()} has been APPROVED as ${attendance.status}.`
    });

    res.json({ message: 'Attendance approved successfully.', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Error approving attendance.', error: err.message });
  }
};

/* ===============================================================
   3️⃣ REJECT ATTENDANCE
================================================================*/
exports.rejectAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const attendance = await Attendance.findById(id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });

    if (attendance.approvalStatus !== 'Pending') return res.status(400).json({ message: 'Already processed.' });

    attendance.approvalStatus = 'Rejected';
    attendance.rejectionReason = reason || 'No reason provided';
    await attendance.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: attendance.email,
      subject: '❌ Attendance Rejected',
      html: `Hi ${attendance.name},<br>Your attendance for ${attendance.date.toDateString()} was REJECTED.<br>Reason: ${attendance.rejectionReason}`
    });

    res.json({ message: 'Attendance rejected successfully.', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Error rejecting attendance.', error: err.message });
  }
};

/* ===============================================================
   4️⃣ GET MY ATTENDANCE
================================================================*/
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const records = await Attendance.find({ userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
};

/* ===============================================================
   5️⃣ UPDATE CHECKOUT
================================================================*/
exports.updateCheckout = async (req, res) => {
  try {
    const { checkOutTime } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });

    if (attendance.userId.toString() !== req.user.userId) return res.status(403).json({ message: 'Unauthorized' });

    attendance.checkOutTime = checkOutTime;
    await attendance.save();

    res.json({
      message: 'Check-out time recorded successfully.',
      attendance,
      formatted: { in: formatTimeSafe(attendance.checkInTime), out: formatTimeSafe(checkOutTime) }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating attendance.', error: err.message });
  }
};

/* ===============================================================
   6️⃣ GET ALL ATTENDANCE (Admin)
================================================================*/
exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, date, month, userId } = req.query;
    const mongoose = require('mongoose');
    let filter = {};

    if (date) filter.date = getStartOfDay(new Date(date));
    else if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    if (userId) filter.userId = mongoose.Types.ObjectId(userId);

    const records = await Attendance.find(filter).sort({ date: -1 });
    const skip = (page - 1) * limit;
    const paginated = records.slice(skip, skip + Number(limit));
    res.json({ records: paginated, totalPages: Math.ceil(records.length / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
};

/* ===============================================================
   7️⃣ SUMMARY
================================================================*/
exports.getSummary = async (req, res) => {
  try {
    const { date, month, userId } = req.query;
    const mongoose = require('mongoose');
    let filter = {};

    if (date) filter.date = getStartOfDay(new Date(date));
    else if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    if (userId) filter.userId = mongoose.Types.ObjectId(userId);

    const allUsers = await User.find({ role: 'employee' });
    const todayRecords = await Attendance.find(filter);

    let counts = { present: 0, absent: 0, halfDay: 0, remote: 0, lateMark: 0 };
    todayRecords.forEach((r) => {
      const s = r.status.toLowerCase();
      if (s === 'present') counts.present++;
      else if (s === 'absent') counts.absent++;
      else if (s === 'half day') counts.halfDay++;
      else if (s === 'remote work') counts.remote++;
      else if (s === 'late mark') counts.lateMark++;
    });

    const markedUserIds = new Set(todayRecords.map((r) => r.userId.toString()));
    const unmarked = allUsers.filter((u) => !markedUserIds.has(u._id.toString())).length;
    counts.absent += unmarked;

    res.json({ ...counts, totalEmployees: allUsers.length });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
};

/* ===============================================================
   8️⃣ GET MY SUMMARY
================================================================*/
exports.getMySummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const records = await Attendance.find({ userId, date: { $gte: startOfMonth, $lte: today } });

    let summary = { present: 0, halfDay: 0, remoteWork: 0, absent: 0, lateMarks: 0 };
    for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
      const rec = records.find((r) => new Date(r.date).toDateString() === d.toDateString());
      if (!rec) summary.absent++;
      else {
        const s = rec.status.toLowerCase();
        if (s === 'present') summary.present++;
        else if (s === 'half day') summary.halfDay++;
        else if (s === 'remote work') summary.remoteWork++;
        else if (s === 'absent') summary.absent++;
        else if (s === 'late mark') summary.lateMarks++;
      }
    }

    res.json({ ...summary, totalDays: summary.present + summary.absent + summary.halfDay + summary.remoteWork });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
};

/* ===============================================================
   🔟 GET SPECIFIC USER'S ATTENDANCE (Admin)
================================================================*/
exports.getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const records = await Attendance.find({ userId }).sort({ date: -1 });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user attendance.', error: err.message });
  }
};

/* ===============================================================
   9️⃣ GET ALL USERS (Admin)
================================================================*/
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role isApproved isVerified joiningDate bloodGroup');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
