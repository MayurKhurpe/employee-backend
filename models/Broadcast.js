// 📁 models/Broadcast.js
const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  audience: {
    type: String,
    enum: ['all', 'admin', 'employee'],
    default: 'all',
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    default: null, // optional expiration
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Broadcast', broadcastSchema);
