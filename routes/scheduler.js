const cron = require('node-cron');
const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
const nodemailer = require('nodemailer');

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // replace with your email or use env variable
    pass: 'your-app-password',    // replace with app password or env variable
  },
});

// Schedule task at 5:00 PM every day
cron.schedule('0 17 * * *', async () => {
  console.log('📧 5 PM attendance warning job started...');
  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch all approved users
    const allUsers = await User.find({ isApproved: true });
    // Get user IDs who have marked attendance today
    const markedUserIds = await Attendance.find({ date: today }).distinct('user');

    // Filter users who have not marked attendance and have an email
    const unmarkedUsers = allUsers.filter(
      (u) => !markedUserIds.includes(u._id.toString()) && u.email
    );

    for (const user of unmarkedUsers) {
      const mailOptions = {
        from: 'your-email@gmail.com', // or process.env.EMAIL_USER
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
