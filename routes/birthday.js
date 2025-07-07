// 📁 routes/birthday.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const users = await User.find({ dob: { $ne: null } }); // only users with dob

    const today = new Date();
    const upcoming = users
      .map((user) => {
        const dob = new Date(user.dob);
        const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);

        return {
          name: user.name,
          date: nextBirthday.toISOString(),
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(upcoming);
  } catch (err) {
    console.error('❌ Birthday fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

module.exports = router;
