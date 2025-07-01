const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave', 'Half Day', 'Remote Work'],
    required: true,
  },
  checkInTime: {
    type: String,
  },
  checkOutTime: {
    type: String,
  },
  location: {
    type: String, // Will store "Office" or "lat,lng" string
    default: 'Office',
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
}, {
  timestamps: true,
});

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
