const LeaveRequest = require('../models/LeaveRequest');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @desc Apply for leave
 * @route POST /api/leave
 * @access Private
 */
exports.applyLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  try {
    const leave = new LeaveRequest({
      userId: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'Pending',
    });

    await leave.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `📩 New Leave Request - ${req.user.name}`,
      html: `
        <h2>New Leave Request</h2>
        <p><strong>Name:</strong> ${req.user.name}</p>
        <p><strong>Email:</strong> ${req.user.email}</p>
        <p><strong>Type:</strong> ${leaveType}</p>
        <p><strong>From:</strong> ${new Date(startDate).toLocaleDateString()}</p>
        <p><strong>To:</strong> ${new Date(endDate).toLocaleDateString()}</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
      `,
    });

    res.status(201).json(leave);
  } catch (err) {
    console.error('❌ Error applying leave:', err);
    res.status(500).json({ success: false, message: 'Error applying leave', error: err.message });
  }
};

/**
 * @desc Get current user's leave history
 * @route GET /api/leave/user
 * @access Private
 */
exports.getUserLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    console.error('❌ Error fetching user leaves:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user leaves' });
  }
};

/**
 * @desc Get all leave requests (Admin)
 * @route GET /api/leave
 * @access Admin
 */
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    console.error('❌ Error fetching leaves:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves' });
  }
};

/**
 * @desc Approve leave
 * @route PUT /api/leave/admin/approve/:id
 * @access Admin
 */
exports.approveLeave = async (req, res) => {
  const note = req.body.responseMessage || 'Approved by admin';
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', adminNote: note },
      { new: true }
    );

    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leave.email,
      subject: '✅ Your Leave Has Been Approved',
      html: `
        <h2>Leave Approved</h2>
        <p>Hello <strong>${leave.name}</strong>,</p>
        <p>Your leave from <strong>${new Date(leave.startDate).toLocaleDateString()}</strong> to <strong>${new Date(leave.endDate).toLocaleDateString()}</strong> has been <span style="color:green;"><strong>Approved</strong></span>.</p>
        <p>Type: ${leave.leaveType}</p>
        <p>Admin Note: ${note}</p>
        <p>Regards,<br/>Admin Team</p>
      `,
    });

    res.json(leave);
  } catch (err) {
    console.error('❌ Error approving leave:', err);
    res.status(500).json({ success: false, message: 'Failed to approve leave' });
  }
};

/**
 * @desc Reject leave
 * @route PUT /api/leave/admin/reject/:id
 * @access Admin
 */
exports.rejectLeave = async (req, res) => {
  const note = req.body.responseMessage || 'Rejected by admin';
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', adminNote: note },
      { new: true }
    );

    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leave.email,
      subject: '❌ Your Leave Has Been Rejected',
      html: `
        <h2>Leave Rejected</h2>
        <p>Hello <strong>${leave.name}</strong>,</p>
        <p>Your leave from <strong>${new Date(leave.startDate).toLocaleDateString()}</strong> to <strong>${new Date(leave.endDate).toLocaleDateString()}</strong> has been <span style="color:red;"><strong>Rejected</strong></span>.</p>
        <p>Reason: ${note}</p>
        <p>Regards,<br/>Admin Team</p>
      `,
    });

    res.json(leave);
  } catch (err) {
    console.error('❌ Error rejecting leave:', err);
    res.status(500).json({ success: false, message: 'Failed to reject leave' });
  }
};
