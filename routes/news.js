// 📁 routes/news.js
const express = require('express');
const router = express.Router();
const News = require('../models/News');

// Get all news
router.get('/', async (req, res) => {
  try {
    const newsList = await News.find().sort({ date: -1 });
    res.json(newsList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

module.exports = router;
