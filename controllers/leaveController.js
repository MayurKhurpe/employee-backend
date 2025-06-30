// 📁 controllers/leaveController.js
const LeaveRequest = require('../models/LeaveRequest');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @desc Apply for leave
 * @route POST /api/leave/apply
 * @access Private (Authenticated user)
 */
exports.applyLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  // Basic validation
  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'leaveType, startDate, and endDate are required' });
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

    // Notify admin about new leave request
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'admin@yourcompany.com', // You may want to pull this from env/config
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
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ success: true, message: 'Leave applied successfully', leave });
  } catch (err) {
    console.error('Error applying leave:', err);
    res.status(500).json({ success: false, message: 'Error applying leave', error: err.message });
  }
};

/**
 * @desc Approve leave request (admin only)
 * @route PUT /api/leave/approve/:id
 * @access Private (Admin)
 */
exports.approveLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved' },
      { new: true }
    );

    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

    // Notify user about approval
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leave.email,
      subject: '✅ Your Leave Has Been Approved',
      html: `
        <h2>Leave Approved</h2>
        <p>Hello <strong>${leave.name}</strong>,</p>
        <p>Your leave request from <strong>${new Date(leave.startDate).toLocaleDateString()}</strong> to <strong>${new Date(leave.endDate).toLocaleDateString()}</strong> has been <span style="color:green;"><strong>Approved</strong></span>.</p>
        <p>Leave Type: ${leave.leaveType}</p>
        <br/>
        <p>Regards,<br/>Admin Team</p>
      `,
    });

    res.json({ success: true, message: 'Leave approved and user notified', leave });
  } catch (err) {
    console.error('Error approving leave:', err);
    res.status(500).json({ success: false, message: 'Failed to approve leave', error: err.message });
  }
};

/**
 * @desc Reject leave request (admin only)
 * @route PUT /api/leave/reject/:id
 * @access Private (Admin)
 */
exports.rejectLeave = async (req, res) => {
  const note = req.body.responseMessage || req.body.adminNote || 'No reason provided.';

  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', responseMessage: note },
      { new: true }
    );

    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

    // ✅ Use leave.responseMessage saved in DB
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leave.email,
      subject: '❌ Your Leave Has Been Rejected',
      html: `
        <h2>Leave Rejected</h2>
        <p>Hello <strong>${leave.name}</strong>,</p>
        <p>Your leave request from <strong>${new Date(leave.startDate).toLocaleDateString()}</strong> to <strong>${new Date(leave.endDate).toLocaleDateString()}</strong> has been <span style="color:red;"><strong>Rejected</strong></span>.</p>
        <p>Reason Provided: ${leave.responseMessage || 'No reason provided.'}</p>
        <br/>
        <p>Regards,<br/>Admin Team</p>
      `,
    });

    res.json({ success: true, message: 'Leave rejected and user notified', leave });
  } catch (err) {
    console.error('Error rejecting leave:', err);
    res.status(500).json({ success: false, message: 'Failed to reject leave', error: err.message });
  }
};

/**
 * @desc Get all leave requests (admin only)
 * @route GET /api/leave
 * @access Private (Admin)
 */
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  } catch (err) {
    console.error('Error fetching leaves:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves', error: err.message });
  }
};
/**
 * @desc Get logged-in user's leave history
 * @route GET /api/leave/user
 * @access Private (Authenticated user)
 */
exports.getUserLeaves = async (req, res) => {
  try {
    const userId = req.user.userId;
    const leaves = await LeaveRequest.find({ userId }).sort({ createdAt: -1 });

    res.json({ success: true, leaves });
  } catch (err) {
    console.error('Error fetching user leaves:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user leaves', error: err.message });
  }
};
