// 📁 routes/news.js
const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

// ✅ Get all news
router.get('/', newsController.getAllNews);

// ✅ Optional: Add news
router.post('/', newsController.addNews);

module.exports = router;
