const cron = require('node-cron');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const Attendance = require('../models/attendanceModel');
const User = require('../models/User');
const Leave = require('../models/LeaveRequest');
const Holiday = require('../models/holidayModel'); // ✅ Add Holiday model

// 📧 Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Any of these counts as NOT absent
const validStatuses = ['Present', 'Half Day', 'Remote Work', 'Late Mark'];

// 🕒 Run every day at 9:00 AM IST
cron.schedule('30 21 * * *', async () => {
  console.log('⏰ Running Absent Reminder Email Cron at 9:00 AM IST');

  const tz = 'Asia/Kolkata';
  const startOfYesterday = dayjs().tz(tz).subtract(1, 'day').startOf('day').toDate();
  const startOfToday = dayjs().tz(tz).startOf('day').toDate();

  try {
    // ✅ 1. Check if yesterday was a weekend or holiday
    const weekday = dayjs(startOfYesterday).tz(tz).day(); // 0 = Sunday, 6 = Saturday
    if (weekday === 0) {
      console.log('📌 Yesterday was Sunday (Weekly off) → No absent mails sent.');
      return;
    }

    const holiday = await Holiday.findOne({
      date: { $gte: startOfYesterday, $lt: startOfToday },
    });

    if (holiday) {
      console.log(`📌 Yesterday was a holiday (${holiday.name}) → No absent mails sent.`);
      return;
    }

    // ✅ 2. Get all employees
    const users = await User.find({ role: 'employee' });

    // ✅ 3. Get attendance records for yesterday
    const yesterdayRecords = await Attendance.find({
      date: { $gte: startOfYesterday, $lt: startOfToday },
    }).lean();

    // ✅ 4. Build set of users who marked attendance in valid statuses
    const validSet = new Set(
      yesterdayRecords
        .filter((r) => {
          const s = (r.status || '').trim().toLowerCase();
          return validStatuses.some((vs) => vs.toLowerCase() === s);
        })
        .map((r) => r.userId.toString())
    );

    // ✅ 5. Fetch approved leaves for yesterday
    const leaves = await Leave.find({
      status: 'Approved',
      startDate: { $lte: startOfYesterday },
      endDate: { $gte: startOfYesterday },
    }).lean();

    const leaveSet = new Set(leaves.map((l) => l.userId.toString()));

    // ✅ 6. Employees who are neither present nor on leave
    const absentUsers = users.filter(
      (u) => !validSet.has(u._id.toString()) && !leaveSet.has(u._id.toString())
    );

    // ✅ 7. Send absent email
    for (const user of absentUsers) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `🕒 Attendance Reminder - ${user.name}`,
        html: `
          Hi ${user.name}, your attendance has not been marked as Present/Half Day/Remote Work for
          ${startOfYesterday.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}.<br><br>
          📌 Status: Absent<br>
          🕒 In: N/A | Out: N/A
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Absent email sent to: ${user.email}`);
    }

    if (absentUsers.length === 0) {
      console.log('✅ No absent users found.');
    }
  } catch (err) {
    console.error('❌ Error in absent reminder cron:', err);
  }
});
