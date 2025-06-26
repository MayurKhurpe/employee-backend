const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// GET /api/attendance/auto-marked
router.get('/auto-marked', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const autoAbsent = await Attendance.find({ date: today, status: 'Absent', checkInTime: null });
    res.json({ count: autoAbsent.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auto-marked data' });
  }
});

module.exports = router;
