// 📁 controllers/newsController.js
const News = require('../models/News');
const User = require('../models/User');
const NotificationSetting = require('../models/NotificationSetting');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📧 Email Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @route   GET /api/news
 * @desc    Fetch all news (sorted by date)
 * @access  Public or Protected (as per your use)
 */
exports.getAllNews = async (req, res) => {
  try {
    const newsList = await News.find().sort({ date: -1 });
    res.status(200).json(newsList);
  } catch (err) {
    console.error('❌ Failed to fetch news:', err);
    res.status(500).json({ error: 'Server error while fetching news.' });
  }
};

/**
 * @route   POST /api/news
 * @desc    Add a news item + notify users with emailNotif = true
 * @access  Admin only
 */
exports.addNews = async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'News title is required.' });
  }

  try {
    // Save the news to the database
    const news = new News({ title });
    await news.save();

    // Notify users with email notifications enabled
    const users = await User.find({ isApproved: true });

    const emailPromises = users.map(async (user) => {
      const setting = await NotificationSetting.findOne({ userId: user._id });

      if (setting?.emailNotif) {
        return transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '📰 New Company News Update',
          html: `
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>A new company announcement has been posted:</p>
            <h3 style="color:#007bff;">${title}</h3>
            <br/>
            <p>Regards,<br/>HR/Admin Team</p>
          `,
        });
      }
    });

    await Promise.all(emailPromises);

    res.status(201).json({
      success: true,
      message: 'News added and users notified.',
      news,
    });
  } catch (err) {
    console.error('❌ Error adding news:', err);
    res.status(500).json({ error: 'Failed to add news. Server error.' });
  }
};
