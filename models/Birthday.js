const mongoose = require('mongoose');

const birthdaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true }
});

module.exports = mongoose.model('Birthday', birthdaySchema);
