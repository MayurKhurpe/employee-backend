// ✅ Required Modules
const Attendance = require('../models/attendanceModel');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Email transporter
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

// ✅ Distance Check (within 1 km)
function isWithinOffice(lat, lng) {
  const officeLat = 18.5204;
  const officeLng = 73.8567;
  const R = 6371;
  const toRad = (val) => (val * Math.PI) / 180;

  const dLat = toRad(officeLat - lat);
  const dLng = toRad(officeLng - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(officeLat)) * Math.sin(dLng / 2) ** 2;

  const distance = 2 * R * Math.asin(Math.sqrt(a));
  return distance <= 1;
}

// ✅ Mark Attendance
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: Missing userId' });

    const {
      status = 'Present',
      location = null,
      checkInTime,
      customer,
      workLocation,
      assignedBy,
    } = req.body;

    const today = getStartOfDay(new Date());

    const alreadyMarked = await Attendance.findOne({ userId, date: today });
    if (alreadyMarked) return res.status(400).json({ message: 'Attendance already marked for today.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (status === 'Remote Work' && (!customer || !workLocation || !assignedBy)) {
      return res.status(400).json({ message: 'All remote work fields are required.' });
    }

    let outsideLocation = false;
    if (['Present', 'Half Day'].includes(status)) {
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        outsideLocation = true;
      } else {
        const isInside = isWithinOffice(location.lat, location.lng);
        outsideLocation = !isInside;
      }
    }

    const newAttendance = new Attendance({
      userId,
      name: user.name,
      email: user.email,
      date: today,
      status,
      checkInTime,
      location: location ? `${location.lat},${location.lng}` : undefined,
      customer,
      workLocation,
      assignedBy,
    });

    await newAttendance.save();

    // ✅ Email to admin if outside
    if (['Present', 'Half Day'].includes(status) && outsideLocation) {
      try {
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
          `,
        });
      } catch (err) {
        console.error('❌ Failed to notify admin:', err);
      }
    }

    // ✅ Email to employee
    const fullDateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
    const displayDate = `${today.getDate()} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;

    let body = '';
    if (status === 'Remote Work') {
      body = `Hi ${user.name}, your attendance has been marked as Remote Work for ${displayDate}.<br><br>
        📌 <strong>Status:</strong> Remote Work<br><br>
        👤 <strong>Customer:</strong> ${customer}<br>
        🏢 <strong>Location:</strong> ${workLocation}<br>
        📨 <strong>Assigned By:</strong> ${assignedBy}<br><br>
        🕒 <strong>In:</strong> ${checkInTime || 'N/A'} | <strong>Out:</strong> N/A`;
    } else {
      body = `Hi ${user.name}, your attendance has been marked as ${status} for ${displayDate}.<br>
        ${fullDateStr}<br><br>
        📌 <strong>Status:</strong> ${status}<br><br>
        🕒 <strong>In:</strong> N/A | <strong>Out:</strong> N/A`;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `📝 Attendance Marked - ${status}`,
      html: body,
    });

    res.status(201).json({ message: 'Attendance marked successfully.', attendance: newAttendance });
  } catch (err) {
    console.error('❌ Attendance Marking Failed:', err);
    res.status(500).json({ message: 'Error marking attendance.', error: err.message });
  }
};
// ✅ Get My Attendance
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;

    // ✅ Fetch all attendance records including Remote Work fields
    const records = await Attendance.find({ userId }).sort({ date: -1 });

    res.json(records.map((r) => ({
      _id: r._id,
      userId: r.userId,
      name: r.name,
      email: r.email,
      date: r.date,
      status: r.status,
      checkInTime: r.checkInTime || '',
      checkOutTime: r.checkOutTime || '',
      location: r.location || '',
      customer: r.customer || '',
      workLocation: r.workLocation || '',
      assignedBy: r.assignedBy || '',
    })));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
};


// ✅ Admin: Get All Attendance
exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, date, month, userId } = req.query;
    let queryDate = date ? getStartOfDay(new Date(date)) : null;
    const users = await User.find({ role: 'employee' }).select('_id name email');

    let filter = {};
    if (queryDate) filter.date = queryDate;
    else if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    if (userId) filter.userId = userId;

    const marked = await Attendance.find(filter);
    const map = new Map();
    marked.forEach((r) => map.set(r.userId.toString() + r.date?.toISOString(), r));

    const filteredUsers = userId
      ? users.filter((u) => u._id.toString() === userId)
      : users;

    let all = [];

    if (queryDate || userId || month) {
      all = filteredUsers.map((user) => {
        const key = month
          ? null
          : userId
          ? marked.find((r) => r.userId.toString() === user._id.toString())
          : map.get(user._id.toString() + queryDate?.toISOString());

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

      if (month) {
        all = marked.map((rec) => rec.toObject());
      }
    }

    const sorted = all.sort((a, b) => new Date(b.date) - new Date(a.date));
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + Number(limit));
    const totalPages = Math.ceil(all.length / limit);

    res.json({ records: paginated, totalPages });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.', error: err.message });
  }
};

// ✅ Admin: Get One User Attendance
exports.getUserAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user attendance.', error: err.message });
  }
};

// ✅ Update Checkout
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

// ✅ Summary
exports.getSummary = async (req, res) => {
  try {
    const queryDate = req.query.date
      ? getStartOfDay(new Date(req.query.date))
      : getStartOfDay(new Date());
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

    const trulyAbsent = allUsers.filter((u) => !markedUserIds.has(u._id.toString())).length;
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

    let present = 0, absent = 0, halfDay = 0, remoteWork = 0;
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
