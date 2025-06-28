const express = require('express');
const router = express.Router();

const Birthday = require('../models/Birthday');
const News = require('../models/News');

// 🎂 GET /api/birthdays - upcoming birthdays from today onward
router.get('/birthdays', async (req, res) => {
  try {
    const today = new Date();
    // Reset time for date-only comparison
    today.setHours(0, 0, 0, 0);

    const upcoming = await Birthday.find({
      date: { $gte: today }
    }).sort({ date: 1 });

    res.json(upcoming);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

// 📰 GET /api/news - latest news sorted by createdAt descending
router.get('/news', async (req, res) => {
  try {
    const newsItems = await News.find().sort({ createdAt: -1 });
    res.json(newsItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

module.exports = router;
