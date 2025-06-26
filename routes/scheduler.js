const cron = require('node-cron');
const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
const nodemailer = require('nodemailer');

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password', // 🔒 App password, not your actual Gmail password
  },
});

// 1️⃣ Warning Email at 5 PM
cron.schedule('0 17 * * *', async () => {
  console.log('📧 5 PM attendance warning job started...');
  const today = new Date().toISOString().split('T')[0];

  try {
    const allUsers = await User.find({ isApproved: true });
    const markedUserIds = await Attendance.find({ date: today }).distinct('user');

    const unmarkedUsers = allUsers.filter(
      (u) => !markedUserIds.includes(u._id.toString()) && u.email
    );

    for (const user of unmarkedUsers) {
      const mailOptions = {
        from: 'your-email@gmail.com',
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
