const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const users = await User.find({ dob: { $ne: null } }); // 👈 fixed here

    const today = new Date();
    const upcoming = users
      .map((user) => {
        const dob = new Date(user.dob); // 👈 fixed here
        const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1); // move to next year
        }

        return {
          name: user.name,
          date: nextBirthday.toISOString(),
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(upcoming);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
  }
});

module.exports = router;
