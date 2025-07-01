// 📁 employee-backend/scheduler.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

const Event = require('./models/Event');
const User = require('./models/User');

// ✅ MongoDB connection (for scheduler tasks)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Scheduler MongoDB connected'))
  .catch(err => console.error('❌ Scheduler DB error:', err));

// ✅ Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Daily 8 AM: Send event email reminders
cron.schedule('0 8 * * *', async () => {
  console.log('📬 Sending daily event reminders...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const events = await Event.find({ date: today });
    const userIds = [...new Set(events.map(e => e.userId.toString()))];

    for (const userId of userIds) {
      const user = await User.findById(userId);
      const userEvents = events.filter(e => e.userId.toString() === userId);

      if (user && user.email && userEvents.length) {
        const listItems = userEvents.map(e => `<li>${e.title} (${e.category})</li>`).join('');
        const html = `
          <p>Hi ${user.name},</p>
          <p>You have the following event(s) scheduled for today:</p>
          <ul>${listItems}</ul>
          <p>Best regards,<br/>MES Employee Portal</p>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '📅 Reminder: Today\'s Scheduled Event(s)',
          html,
        });

        console.log(`✅ Email sent to ${user.email}`);
      }
    }

  } catch (err) {
    console.error('❌ Error sending event emails:', err);
  }
});

// 📌 Example: Reset leaves (1st of month at midnight)
cron.schedule('0 0 1 * *', () => {
  console.log('🌙 Resetting monthly leave balance...');
  // TODO: Connect and reset leave counters
});

// 📌 Example: Daily birthdays at 9 AM
cron.schedule('0 9 * * *', () => {
  console.log('🎉 Checking for employee birthdays...');
  // TODO: Fetch birthday users and send wishes
});

// 📌 Example: Hourly pending leave alert
cron.schedule('0 * * * *', () => {
  console.log('📢 Checking for pending leave approvals...');
  // TODO: Alert admin if any leave requests are pending
});

console.log('✅ Scheduler started with cron jobs.');
