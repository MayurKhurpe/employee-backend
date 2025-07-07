// 📁 utils/birthdayMailer.js
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const User = require('../models/User');
require('dotenv').config();

// ⏰ Runs every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    // Find users with birthday today
    const users = await User.find({
      dob: { $ne: null },
    });

    const birthdayUsers = users.filter((user) => {
      const dob = new Date(user.dob);
      return dob.getDate() === todayDate && dob.getMonth() === todayMonth;
    });

    if (birthdayUsers.length === 0) return;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    for (const user of birthdayUsers) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `🎂 Happy Birthday ${user.name}!`,
        html: `
          <p>Hi ${user.name},</p>
          <p>🎉 Wishing you a very Happy Birthday!</p>
          <p>We hope you have a great day and an amazing year ahead!</p>
          <p>🎈 Best wishes from the team! 🎁</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Birthday email sent to ${user.email}`);
    }
  } catch (err) {
    console.error('❌ Error in birthday mailer:', err);
  }
});
