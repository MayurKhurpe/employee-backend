const express = require('express');
const router = express.Router();
const NotificationSetting = require('../models/NotificationSetting');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ GET settings for logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const setting = await NotificationSetting.findOne({ userId: req.user.id });
    if (!setting) {
      // Create default if not found
      const newSetting = new NotificationSetting({ userId: req.user.id });
      await newSetting.save();
      return res.json(newSetting);
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ✅ UPDATE settings for logged-in user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { emailNotif, smsNotif, pushNotif } = req.body;
    const updated = await NotificationSetting.findOneAndUpdate(
      { userId: req.user.id },
      { emailNotif, smsNotif, pushNotif },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
