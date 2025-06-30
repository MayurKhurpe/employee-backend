const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  emailNotif: {
    type: Boolean,
    default: false
  },
  pushNotif: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.models.NotificationSetting || mongoose.model('NotificationSetting', notificationSettingSchema);
