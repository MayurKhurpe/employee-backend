// 📁 routes/birthday.js
const express = require('express');
const router = express.Router();
const Birthday = require('../models/Birthday');

router.get('/', async (req, res) => {
  try {
    const all = await Birthday.find();

    const today = new Date();
    const upcoming = all
      .map((entry) => {
        const dob = new Date(entry.date);
        const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1); // move to next year
        }

        return {
          name: entry.name,
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
