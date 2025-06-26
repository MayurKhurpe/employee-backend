// routes/devices.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// In-memory data (replace with DB logic)
let devices = [
  { id: 1, name: "Mayur’s iPhone 14", lastActive: "2025-06-16 10:23 AM", ip: "192.168.1.12", browser: "Safari iOS" },
  { id: 2, name: "Work Laptop (HP)", lastActive: "2025-06-15 8:05 PM", ip: "192.168.1.3", browser: "Chrome on Windows" }
];

// GET all linked devices
router.get('/devices', authMiddleware, (req, res) => {
  res.json(devices);
});

// DELETE (unlink) a device by ID
router.delete('/devices/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  devices = devices.filter(d => d.id !== id);
  res.json({ message: 'Device unlinked successfully' });
});

module.exports = router;
