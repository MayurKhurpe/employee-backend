// 📁 backend/routes/leave.js
const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const nodemailer = require('nodemailer');

// 1️⃣ POST: User applies for leave
router.post('/', async (req, res) => {
  const { name, email, leaveType, startDate, endDate, reason } = req.body;

  try {
    const leave = new LeaveRequest({ name, email, leaveType, startDate, endDate, reason });
    await leave.save();

    console.log('✅ Leave request saved to MongoDB:', leave);

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'yourcompanyemail@gmail.com',
          pass: 'your_app_password',
        },
      });

      const mailOptions = {
        from: 'yourcompanyemail@gmail.com',
        to: 'admin@yourcompany.com',
        subject: `📩 New Leave Request from ${name}`,
        html: `
          <h2>Leave Application</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>From:</strong> ${startDate}</p>
          <p><strong>To:</strong> ${endDate}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent to admin.');
    } catch (emailError) {
      console.error('⚠️ Email failed to send:', emailError.message);
    }

    res.status(201).json({ success: true, message: 'Leave saved. Email sent (or attempted).', leave });
  } catch (err) {
    console.error('❌ Error submitting leave:', err);
    res.status(500).json({ success: false, message: 'Failed to save leave request', error: err.message });
  }
});

// 2️⃣ PUT: Admin approves a leave
router.put('/admin/leave/approve/:id', async (req, res) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved' },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    res.json({ success: true, message: 'Leave approved', leave });
  } catch (err) {
    console.error('❌ Error approving leave:', err);
    res.status(500).json({ success: false, message: 'Failed to approve leave', error: err.message });
  }
});

// 3️⃣ PUT: Admin rejects a leave with optional note
router.put('/admin/leave/reject/:id', async (req, res) => {
  const { adminNote } = req.body;

  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', adminNote },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    res.json({ success: true, message: 'Leave rejected', leave });
  } catch (err) {
    console.error('❌ Error rejecting leave:', err);
    res.status(500).json({ success: false, message: 'Failed to reject leave', error: err.message });
  }
});

// 4️⃣ GET: Get all leave requests (admin)
router.get('/admin/leave/all', async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  } catch (err) {
    console.error('❌ Error fetching leaves:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves', error: err.message });
  }
});

module.exports = router;
