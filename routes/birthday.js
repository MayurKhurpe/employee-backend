// 📁 routes/birthday.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const all = await User.find({ birthday: { $exists: true } }, 'name birthday');

    const today = new Date();
    const upcoming = all
      .map((user) => {
        const dob = new Date(user.birthday);
        const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }

        return {
          name: user.name,
          date: nextBirthday.toISOString(),
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(upcoming);
  } catch (err) {
    console.error("❌ Birthday fetch error:", err);
    res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
  }
});

module.exports = router;
