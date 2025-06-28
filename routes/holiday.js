// 📁 routes/holiday.js
const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const Holiday = require('../models/Holiday');
const NotificationSetting = require('../models/NotificationSetting');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 📧 Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ GET all holidays
router.get('/', holidayController.getAllHolidays);

// ✅ ADD new holiday + notify all users with emailNotif enabled
router.post('/', async (req, res) => {
  try {
    const { title, date, description } = req.body;
    const holiday = new Holiday({ title, date, description });
    await holiday.save();

    // 🔔 Get users who want email notifications
    const usersToNotify = await NotificationSetting.find({ emailNotif: true }).populate('userId');

    // ✉️ Send holiday announcement emails
    for (const setting of usersToNotify) {
      const user = setting.userId;
      if (user?.email) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: `📅 New Holiday Announced - ${title}`,
          html: `
            <h2>${title}</h2>
            <p><strong>Date:</strong> ${new Date(date).toDateString()}</p>
            <p><strong>Description:</strong> ${description || 'N/A'}</p>
            <br/>
            <p>Enjoy your day off! 🎉</p>
          `,
        });
      }
    }

    res.status(201).json({ message: 'Holiday added and users notified', holiday });
  } catch (err) {
    console.error('Add holiday error:', err.message);
    res.status(500).json({ error: 'Failed to add holiday' });
  }
});

// ✅ DELETE holiday
router.delete('/:id', holidayController.deleteHoliday);

// ✅ EXPORT CSV
router.get('/export/csv', holidayController.exportCSV);

// ✅ EXPORT PDF
router.get('/export/pdf', holidayController.exportPDF);

module.exports = router;
