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
    enum: ['Present', 'Absent', 'Leave', 'Half Day', 'Remote Work', 'Late Mark'],
    default: 'Present',
  },
  requestedStatus: {
    type: String,
    trim: true,
    default: '',
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: '',
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
  customer: { type: String },
  workLocation: { type: String },
  assignedBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
