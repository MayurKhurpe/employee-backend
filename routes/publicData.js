const express = require('express');
const router = express.Router();

const Birthday = require('../models/Birthday');
const News = require('../models/News');

// 🎂 GET /api/birthdays
router.get('/birthdays', async (req, res) => {
  try {
    const today = new Date();
    const upcoming = await Birthday.find({
      date: { $gte: today }
    }).sort('date');
    res.json(upcoming);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

// 📰 GET /api/news
router.get('/news', async (req, res) => {
  try {
    const newsItems = await News.find().sort({ createdAt: -1 });
    res.json(newsItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

module.exports = router;
