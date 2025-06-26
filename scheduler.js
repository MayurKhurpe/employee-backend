// 📁 employee-backend/scheduler.js
const cron = require('node-cron');

// Example: Reset leaves on 1st of every month at midnight
cron.schedule('0 0 1 * *', () => {
  console.log('🌙 Resetting monthly leave balance...');
  // TODO: Connect to MongoDB and reset leave counters
});

// Example: Daily birthday check at 9 AM
cron.schedule('0 9 * * *', () => {
  console.log('🎉 Checking for employee birthdays...');
  // TODO: Fetch users with today's birthday and send emails
});

// Example: Reminder for pending leave approvals every hour
cron.schedule('0 * * * *', () => {
  console.log('📢 Reminder: Some leave requests are pending...');
  // TODO: Notify admin about pending leave requests if needed
});

console.log('✅ Scheduler started with cron jobs.');
