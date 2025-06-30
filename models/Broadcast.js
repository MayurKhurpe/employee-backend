const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  audience: {
    type: String,
    default: 'all',
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Broadcast || mongoose.model('Broadcast', broadcastSchema);
