// 📁 models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  date: {
    type: Date, // ✅ Use Date type for proper querying
    required: true,
  },
  status: {
    type: String, // Present, Absent, Leave, Half Day, etc.
    required: true,
  },
  location: {
    type: String, // Office, Remote, etc.
    default: 'Office',
  },
  checkInTime: {
    type: String,
  },
  checkOutTime: {
    type: String,
  },
}, {
  timestamps: true,
});

// ✅ Fix OverwriteModelError by checking if model already exists
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
