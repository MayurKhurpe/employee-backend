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

    // 📧 Notify user
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leave.email,
      subject: '✅ Your Leave Has Been Approved',
      html: `
        <h2>Leave Approved</h2>
        <p>Hello <strong>${leave.name}</strong>,</p>
        <p>Your leave request from <strong>${leave.startDate}</strong> to <strong>${leave.endDate}</strong> has been <span style="color: green;"><strong>Approved</strong></span>.</p>
        <p>Leave Type: ${leave.leaveType}</p>
        <br/>
        <p>Regards,<br/>Admin Team</p>
      `,
    });

    res.json({ success: true, message: 'Leave approved and user notified', leave });
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

    // 📧 Notify user
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leave.email,
      subject: '❌ Your Leave Has Been Rejected',
      html: `
        <h2>Leave Rejected</h2>
        <p>Hello <strong>${leave.name}</strong>,</p>
        <p>Your leave request from <strong>${leave.startDate}</strong> to <strong>${leave.endDate}</strong> has been <span style="color: red;"><strong>Rejected</strong></span>.</p>
        <p>Reason Provided: ${responseMessage || 'No reason given.'}</p>
        <br/>
        <p>Regards,<br/>Admin Team</p>
      `,
    });

    res.json({ success: true, message: 'Leave rejected and user notified', leave });
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
