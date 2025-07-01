const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave', 'Half Day', 'Remote Work'],
    default: 'Present',
  },
  checkInTime: {
    type: String,
    default: '',
  },
  checkOutTime: {
    type: String,
    default: '',
  },
  location: {
    type: {
      lat: { type: Number },
      lng: { type: Number },
    },
    default: null,
  },
  customer: {
    type: String,
  },
  workLocation: {
    type: String,
  },
  assignedBy: {
    type: String,
  },
}, { timestamps: true });

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
