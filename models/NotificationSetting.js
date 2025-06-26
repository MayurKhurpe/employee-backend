const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  emailNotif: { type: Boolean, default: true },
  smsNotif: { type: Boolean, default: false },
  pushNotif: { type: Boolean, default: true }
});

module.exports = mongoose.model('NotificationSetting', notificationSettingSchema);
