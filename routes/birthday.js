// 📁 routes/birthday.js
const express = require('express');
const router = express.Router();
const Birthday = require('../models/Birthday');

// Get all birthdays
router.get('/', async (req, res) => {
  try {
    const birthdays = await Birthday.find().sort({ date: 1 });
    res.json(birthdays);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

module.exports = router;
