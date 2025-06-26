// 📁 models/Holiday.js
const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  description: String,
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
