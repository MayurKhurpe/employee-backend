const LeaveRequest = require('../models/LeaveRequest');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📩 Config mail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1️⃣ POST: Apply Leave
exports.applyLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  try {
    const leave = new LeaveRequest({
      userId: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'Pending',
    });

    await leave.save();

    // 📧 Notify admin
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'admin@yourcompany.com',
      subject: `📩 New Leave Request - ${req.user.name}`,
      html: `
        <h2>Leave Request</h2>
        <p><strong>Name:</strong> ${req.user.name}</p>
        <p><strong>Email:</strong> ${req.user.email}</p>
        <p><strong>Type:</strong> ${leaveType}</p>
        <p><strong>From:</strong> ${startDate}</p>
        <p><strong>To:</strong> ${endDate}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(201).json({ success: true, message: 'Leave applied.', leave });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error applying leave', error: err.message });
  }
};

// 2️⃣ PUT: Admin Approve
exports.approveLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved' },
      { new: true }
    );
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json({ success: true, message: 'Leave approved', leave });
  } catch (err) {
    res.status(500).json({ message: 'Approval failed', error: err.message });
  }
};

// 3️⃣ PUT: Admin Reject
exports.rejectLeave = async (req, res) => {
  const { responseMessage } = req.body;
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', responseMessage },
      { new: true }
    );
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json({ success: true, message: 'Leave rejected', leave });
  } catch (err) {
    res.status(500).json({ message: 'Rejection failed', error: err.message });
  }
};

// 4️⃣ GET: All Leaves
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};
