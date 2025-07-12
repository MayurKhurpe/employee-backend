// 📁 utils/birthdayMailer.js
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

// ⏰ Dayjs for timezone support
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ IST Date
const getTodayIST = () => {
  return dayjs().tz('Asia/Kolkata');
};

// ⏰ Runs every day at 3:30 AM UTC (which is 9:00 AM IST)
cron.schedule('30 3 * * *', async () => {
  try {
    const today = getTodayIST();
    const todayMonth = today.month(); // 0-indexed
    const todayDate = today.date();   // 1-indexed

    // 🎉 Find users with birthday today
    const users = await User.find({ dob: { $ne: null } });

    const birthdayUsers = users.filter((user) => {
      const dob = dayjs(user.dob);
      return dob.date() === todayDate && dob.month() === todayMonth;
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
