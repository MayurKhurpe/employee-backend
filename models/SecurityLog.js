const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  activity: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    default: 'Unknown',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
