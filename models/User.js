const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  mobile: { type: String, default: '' },
  department: { type: String, default: '' },
  address: { type: String, default: '' },
  // ✅ Removed: profileImage
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  isApproved: { type: Boolean, default: false },
  requestedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
