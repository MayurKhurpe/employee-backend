// 📁 utils/absentReminderCron.js
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const Attendance = require('../models/attendanceModel');
const User = require('../models/User');

// 📧 Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 📅 Get start of the day in IST
const getStartOfDayIST = () => {
  return dayjs().tz('Asia/Kolkata').startOf('day').toDate();
};

// 🕒 Run every day at 9:00 AM IST (which is 3:30 AM UTC)
cron.schedule('30 3 * * *', async () => {
  console.log('⏰ Running Absent Reminder Email Cron at 9:00 AM IST');

  const today = getStartOfDayIST();

  try {
    const users = await User.find({ role: 'employee' });
    const markedToday = await Attendance.find({ date: today });

    const markedUserIds = new Set(markedToday.map((r) => r.userId.toString()));
    const absentUsers = users.filter((u) => !markedUserIds.has(u._id.toString()));

    for (const user of absentUsers) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `🕒 Attendance Reminder - ${user.name}`,
        html: `
          Hi ${user.name}, your attendance has not been marked as Present/Half Day for ${today.getDate()} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}.<br>
          ${today.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}<br>
          📌 Status: Absent<br><br>
          🕒 In: N/A | Out: N/A
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Absent email sent to: ${user.email}`);
    }
  } catch (err) {
    console.error('❌ Error in absent reminder cron:', err);
  }
});
