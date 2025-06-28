const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SecurityLog = require('../models/SecurityLog');

// Middleware to authenticate and extract user ID
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: Invalid token format' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// GET security logs for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const logs = await SecurityLog.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Fetch security logs error:', err);
    res.status(500).json({ error: 'Failed to fetch security logs' });
  }
});

module.exports = router;
