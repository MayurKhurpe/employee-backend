const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SecurityLog = require('../models/SecurityLog');

// Middleware to authenticate and extract user ID
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// GET security logs for a user
router.get('/', auth, async (req, res) => {
  try {
    const logs = await SecurityLog.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch security logs' });
  }
});

module.exports = router;
