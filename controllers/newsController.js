// 📁 controllers/newsController.js
const News = require('../models/News');

// ✅ Get all news
exports.getAllNews = async (req, res) => {
  try {
    const newsList = await News.find().sort({ date: -1 });
    res.json(newsList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};

// ✅ Add news (optional, if needed)
exports.addNews = async (req, res) => {
  const { title } = req.body;
  try {
    const news = new News({ title });
    await news.save();
    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add news' });
  }
};
