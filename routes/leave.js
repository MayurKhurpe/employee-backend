const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const leaveController = require('../controllers/leaveController');
const AuditLog = require('../models/AuditLog');
const NotificationSetting = require('../models/NotificationSetting');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// 📬 Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Apply Leave
router.post('/', protect, async (req, res, next) => {
  await leaveController.applyLeave(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Leave Applied',
      details: `From ${req.body.startDate} to ${req.body.endDate}`,
      ip: req.ip,
    });

    // 📧 Email Admin if they want alerts
    const admins = await User.find({ role: 'admin' });
    for (let admin of admins) {
      const setting = await NotificationSetting.findOne({ userId: admin._id });
      if (setting?.emailNotif) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: admin.email,
          subject: '📝 New Leave Application',
          html: `<p>${req.user.name} has applied for leave from <b>${req.body.startDate}</b> to <b>${req.body.endDate}</b>.</p>`,
        });
      }
    }

    next();
  });
});

// ✅ Approve
router.put('/admin/approve/:id', auth, isAdmin, async (req, res, next) => {
  await leaveController.approveLeave(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Approved Leave',
      details: `Leave ID: ${req.params.id}`,
      ip: req.ip,
    });

    // 📧 Email the employee if they want alerts
    const leave = res.locals.leave; // Make sure controller sets `res.locals.leave`
    if (leave && leave.userId) {
      const user = await User.findById(leave.userId);
      const setting = await NotificationSetting.findOne({ userId: user._id });
      if (setting?.emailNotif) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '✅ Your Leave Was Approved',
          html: `<p>Hi ${user.name},<br>Your leave request (ID: ${req.params.id}) has been <b>approved</b>.</p>`,
        });
      }
    }

    next();
  });
});

// ❌ Reject
router.put('/admin/reject/:id', auth, isAdmin, async (req, res, next) => {
  await leaveController.rejectLeave(req, res, async () => {
    await AuditLog.create({
      user: req.user,
      action: 'Rejected Leave',
      details: `Leave ID: ${req.params.id}`,
      ip: req.ip,
    });

    // 📧 Email the employee if they want alerts
    const leave = res.locals.leave; // Make sure controller sets `res.locals.leave`
    if (leave && leave.userId) {
      const user = await User.findById(leave.userId);
      const setting = await NotificationSetting.findOne({ userId: user._id });
      if (setting?.emailNotif) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '❌ Your Leave Was Rejected',
          html: `<p>Hi ${user.name},<br>Your leave request (ID: ${req.params.id}) has been <b>rejected</b>.</p>`,
        });
      }
    }

    next();
  });
});

// ✅ View All
router.get('/admin/all', auth, isAdmin, leaveController.getAllLeaves);

module.exports = router;
