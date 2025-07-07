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
    const users = await User.find({ dob: { $ne: null } });

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
  <div style="text-align: center; font-family: Arial, sans-serif;">
    <h2 style="color: #ff4081;">🎉 Happy Birthday, ${user.name}!</h2>
    <img src="https://employee-web-brown.vercel.app/birthday.gif" 
         alt="Birthday Cake" 
         style="width: 160px; margin: 16px 0;" />
    <p style="font-size: 16px; color: #444;">
      Wishing you a day filled with joy, laughter, and unforgettable moments. 🎂
    </p>
    <p style="font-size: 15px; color: #888;">
      – Best wishes from the Seekers Automation team 🙏
    </p>
  </div>
`,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Birthday email sent to ${user.email}`);
    }
  } catch (err) {
    console.error('❌ Error in birthday mailer:', err);
  }
});
