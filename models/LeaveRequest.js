// 📁 backend/models/LeaveRequest.js
const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  name: String,
  email: String,
  leaveType: String,
  startDate: String,
  endDate: String,
  reason: String,
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  adminNote: String,
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
