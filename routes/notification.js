// 📁 routes/notification.js
const express = require('express');
const router = express.Router();
const NotificationSetting = require('../models/NotificationSetting');
const { protect } = require('../middleware/auth'); // ✅ Use consistent middleware import

// ✅ GET: Fetch current user's notification settings
router.get('/', protect, async (req, res) => {
  try {
    const setting = await NotificationSetting.findOne({ userId: req.user.id });

    if (!setting) {
      return res.json({
        emailNotif: false,
        pushNotif: false,
      });
    }

    res.json({
      emailNotif: setting.emailNotif || false,
      pushNotif: setting.pushNotif || false,
    });
  } catch (error) {
    console.error('❌ GET /notification error:', error.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ✅ PUT: Update or create user's notification settings
router.put('/', protect, async (req, res) => {
  try {
    const { emailNotif = false, pushNotif = false } = req.body;

    const updated = await NotificationSetting.findOneAndUpdate(
      { userId: req.user.id },
      { emailNotif, pushNotif },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: '✅ Notification settings updated successfully',
      settings: updated,
    });
  } catch (error) {
    console.error('❌ PUT /notification error:', error.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
