const cron = require('node-cron');
const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Runs every day at 5:00 PM IST
cron.schedule('0 17 * * *', async () => {
  console.log('📧 5 PM attendance warning job started...');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // "YYYY-MM-DD"

  try {
    const allUsers = await User.find({ isApproved: true });
    const markedUserIds = await Attendance.find({ date: today }).distinct('user');

    const unmarkedUsers = allUsers.filter(
      (u) => !markedUserIds.includes(u._id.toString()) && u.email
    );

    for (const user of unmarkedUsers) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Reminder: Mark Your Attendance 🕔',
        html: `<p>Hi ${user.name},<br><br>You haven't marked your attendance today. Please do so before 11:59 PM to avoid being marked as Absent.<br><br>Regards,<br>MES HR Portal</p>`,
      };
      await transporter.sendMail(mailOptions);
      console.log(`📨 Reminder sent to ${user.email}`);
    }

    if (!unmarkedUsers.length) console.log('✅ All users marked attendance.');
  } catch (err) {
    console.error('❌ Email reminder error:', err);
  }
});
