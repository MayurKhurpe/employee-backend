const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    role: String,
  },
  action: {
    type: String,
    required: true,
  },
  details: String,
  ip: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
