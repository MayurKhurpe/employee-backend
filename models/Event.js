const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Party', 'Meeting', 'Seminar', 'Other'],
    default: 'Other',
  },
  date: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
