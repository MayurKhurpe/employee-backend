// ✅ Required Modules
const Attendance = require('../models/attendanceModel');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 🔽 Dayjs + timezone setup (load ONCE, top-level)
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ Safe time formatter: handles "HH:mm" string, ISO string, Date object
function formatTimeSafe(val) {
  if (!val) return 'N/A';
  if (typeof val === 'string') {
    const hm = val.trim();
    if (/^\d{1,2}:\d{2}$/.test(hm)) return hm;
  }
  const d = dayjs(val);
  return d.isValid() ? d.tz('Asia/Kolkata').format('HH:mm') : 'N/A';
}

// ✅ Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Normalize to start-of-day (local server time; see usage)
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ✅ Distance Check (within 1 km)
function isWithinOffice(lat, lng) {
  const officeLat = 18.641478;
  const officeLng = 73.795228;
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

/* ------------------------------------------------------------------
   MARK ATTENDANCE  (User submits → Pending approval)
------------------------------------------------------------------ */
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: Missing userId' });

    const {
      status = 'Present',   // user's requested status
      location = null,
      checkInTime,
      customer,
      workLocation,
      assignedBy,
    } = req.body;

    // ⏰ Cutoff: Present off after 9:45 AM IST
    const nowIST = dayjs().tz('Asia/Kolkata');
    if (status === 'Present' && nowIST.isAfter(nowIST.hour(9).minute(45).second(0))) {
      return res.status(403).json({
        message: '⛔ Marking Present not allowed after 9:45 AM IST. Please use Late Mark.',
      });
    }

    // NOTE: if server not IST, consider moving to dayjs IST start
    const today = getStartOfDay(new Date());

    // block if already exists
    const alreadyMarked = await Attendance.findOne({ userId, date: today });
    if (alreadyMarked) {
      // if pending, tell user
      if (alreadyMarked.approvalStatus === 'Pending') {
        return res.status(400).json({ message: 'Attendance already pending for approval.' });
      }
      return res.status(400).json({ message: 'Attendance already marked for today.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Limit Late Mark to 3 times per month
    if (status === 'Late Mark') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lateMarksThisMonth = await Attendance.countDocuments({
        userId,
        date: { $gte: startOfMonth, $lte: today },
        status: 'Late Mark',
      });
      if (lateMarksThisMonth >= 3) {
        return res.status(403).json({
          message: '❌ You’ve reached your Late Mark limit for this month. Be on time — it helps you only.',
        });
      }
    }

    // ✅ Required extra fields for Remote Work
    if (status === 'Remote Work' && (!customer || !workLocation || !assignedBy)) {
      return res.status(400).json({ message: 'All remote work fields are required.' });
    }

    // ✅ Location safety (Present / Half Day)
    let outsideLocation = false;
    if (['Present', 'Half Day'].includes(status)) {
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        outsideLocation = true;
      } else {
        outsideLocation = !isWithinOffice(location.lat, location.lng);
      }
    }

    // ✅ Save attendance with approvalStatus = Pending + requestedStatus
    const newAttendance = new Attendance({
      userId,
      name: user.name,
      email: user.email,
      date: today,
      status,                 // keep existing status field (backward compatible)
      requestedStatus: status, // NEW
      approvalStatus: 'Pending', // NEW
      checkInTime,
      location: location ? `${location.lat},${location.lng}` : undefined,
      customer,
      workLocation,
      assignedBy,
    });

    await newAttendance.save();

    // ✅ Remaining Late Marks this month (after save) - unchanged
    let remainingLateMarks = null;
    if (status === 'Late Mark') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lateMarksAfterSave = await Attendance.countDocuments({
        userId,
        date: { $gte: startOfMonth, $lte: today },
        status: 'Late Mark',
      });
      remainingLateMarks = Math.max(0, 3 - lateMarksAfterSave);
    }

    // ✅ Email to admin if outside (unchanged)
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

    // ✅ Email to employee – PENDING APPROVAL
    const displayDate = dayjs(today).tz('Asia/Kolkata').format('DD MMM YYYY (dddd)');
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `📝 Attendance Submitted - Pending Approval`,
      html: `
        Hi ${user.name},<br><br>
        Your attendance for <strong>${displayDate}</strong> has been submitted as <strong>${status}</strong>.<br>
        Current status: <strong>Pending HR Approval</strong>.<br><br>
        You will receive another email once HR approves or rejects it.
      `,
    });

    res.status(201).json({
      message: 'Attendance submitted (Pending approval).',
      attendance: newAttendance,
      remainingLateMarks,
    });
  } catch (err) {
    console.error('❌ Attendance Marking Failed:', err);
    res.status(500).json({ message: 'Error marking attendance.', error: err.message });
  }
};

/* ------------------------------------------------------------------
   ADMIN: Approve Attendance
------------------------------------------------------------------ */
exports.approveAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findById(id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });

    if (attendance.approvalStatus !== 'Pending') {
      return res.status(400).json({ message: 'Attendance already processed.' });
    }

    // use requestedStatus if present as final status
    if (attendance.requestedStatus) attendance.status = attendance.requestedStatus;
    attendance.approvalStatus = 'Approved';
    await attendance.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: attendance.email,
      subject: '✅ Attendance Approved',
      html: `
        Hi ${attendance.name},<br><br>
        Your attendance for <b>${attendance.date.toDateString()}</b> has been <b>APPROVED</b> as <b>${attendance.status}</b>.<br><br>
        Thank you.
      `,
    });

    res.json({ message: 'Attendance approved successfully.', attendance });
  } catch (err) {
    console.error('❌ Approve error:', err);
    res.status(500).json({ message: 'Error approving attendance.', error: err.message });
  }
};

/* ------------------------------------------------------------------
   ADMIN: Reject Attendance
------------------------------------------------------------------ */
exports.rejectAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const attendance = await Attendance.findById(id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });

    if (attendance.approvalStatus !== 'Pending') {
      return res.status(400).json({ message: 'Attendance already processed.' });
    }

    attendance.approvalStatus = 'Rejected';
    attendance.rejectionReason = reason || 'No reason provided';
    await attendance.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: attendance.email,
      subject: '❌ Attendance Rejected',
      html: `
        Hi ${attendance.name},<br><br>
        Your attendance for <b>${attendance.date.toDateString()}</b> was <b>REJECTED</b>.<br>
        Reason: ${attendance.rejectionReason}<br><br>
        Please mark attendance again. After 11:00 AM only Half Day or Remote Work is allowed.
      `,
    });

    res.json({ message: 'Attendance rejected successfully.', attendance });
  } catch (err) {
    console.error('❌ Reject error:', err);
    res.status(500).json({ message: 'Error rejecting attendance.', error: err.message });
  }
};

// ✅ Get My Attendance
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;

    // ✅ Fetch all attendance records including Remote Work fields
    const records = await Attendance.find({ userId }).sort({ date: -1 });

    res.json(
      records.map((r) => ({
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
      }))
    );
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

    // ✅ Determine month range for Late Mark counting
    let monthStart, monthEnd;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      monthStart = new Date(y, m - 1, 1);
      monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      // use queryDate if provided, else today
      const baseDate = queryDate || new Date();
      monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      monthEnd = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
    }

    // ✅ Count Late Marks for each user in the month range (NOT just the day)
    const lateMarksMatch = {
      date: { $gte: monthStart, $lte: monthEnd },
      status: 'Late Mark',
    };
    if (userId) {
      lateMarksMatch.userId =
        typeof userId === 'string' ? require('mongoose').Types.ObjectId(userId) : userId;
    }

    const lateMarksCount = await Attendance.aggregate([
      { $match: lateMarksMatch },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const lateMarksMap = new Map();
    lateMarksCount.forEach((item) => lateMarksMap.set(item._id.toString(), item.count));

    const map = new Map();
    marked.forEach((r) => map.set(r.userId.toString() + r.date?.toISOString(), r));

    const filteredUsers = userId ? users.filter((u) => u._id.toString() === userId) : users;

    let all = [];

    if (queryDate || userId || month) {
      all = filteredUsers.map((user) => {
        const key = month
          ? null
          : userId
          ? marked.find((r) => r.userId.toString() === user._id.toString())
          : map.get(user._id.toString() + queryDate?.toISOString());

        return {
          ...(key
            ? key.toObject()
            : {
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
              }),
          lateMarks: lateMarksMap.get(user._id.toString()) || 0, // ✅ Add Late Mark Count
        };
      });

      if (month) {
        all = marked.map((rec) => ({
          ...rec.toObject(),
          lateMarks: lateMarksMap.get(rec.userId.toString()) || 0,
        }));
      }
    }

    const sorted = all.sort((a, b) => new Date(b.date) - new Date(a.date));
    const skip = (page - 1) * Number(limit);
    const paginated = sorted.slice(skip, skip + Number(limit));
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

    // Optional: format times in response
    const formattedOut = formatTimeSafe(checkOutTime);
    const formattedIn = formatTimeSafe(attendance.checkInTime);

    res.json({
      message: 'Check-out time recorded successfully.',
      attendance,
      formatted: { in: formattedIn, out: formattedOut },
    });
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
    let todayLateMark = 0; // ✅ New

    todayRecords.forEach((r) => {
      const status = r.status?.toLowerCase();
      if (status === 'present') todayPresent++;
      else if (status === 'absent') todayAbsentMarked++;
      else if (status === 'half day') todayHalfDay++;
      else if (status === 'remote work') todayRemote++;
      else if (status === 'late mark') todayLateMark++; // ✅ Count Late Mark
    });

    const trulyAbsent = allUsers.filter((u) => !markedUserIds.has(u._id.toString())).length;
    const totalAbsent = todayAbsentMarked + trulyAbsent;

    res.json({
      todayPresent,
      todayAbsent: totalAbsent,
      todayHalfDay,
      todayRemote,
      todayLateMark, // ✅ Include in API response
      totalEmployees: allUsers.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
};

// ✅ Updated My Summary - with auto absent detection & late mark count
exports.getMySummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const records = await Attendance.find({
      userId,
      date: { $gte: startOfMonth, $lte: today },
    });

    let present = 0,
      halfDay = 0,
      remoteWork = 0,
      absent = 0,
      lateMarks = 0;

    for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
      const rec = records.find((r) => new Date(r.date).toDateString() === d.toDateString());
      if (!rec) {
        absent++;
      } else {
        const status = rec.status?.toLowerCase();
        if (status === 'present') present++;
        else if (status === 'half day') halfDay++;
        else if (status === 'remote work') remoteWork++;
        else if (status === 'absent') absent++;
        else if (status === 'late mark') lateMarks++;
      }
    }

    res.json({
      present,
      absent,
      halfDay,
      remoteWork,
      lateMarks, // ✅ ADD THIS
      totalDays: present + absent + halfDay + remoteWork,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
};

// ✅ Get all users (Admin User Management)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select(
      'name email role isApproved isVerified joiningDate bloodGroup'
    );
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
