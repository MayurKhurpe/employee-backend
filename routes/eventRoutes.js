const express = require('express');
const router = express.Router();
const {
  saveEvent,
  deleteEvent,
  getMyEvents,
  getDashboardEvents
} = require('../controllers/eventController');
const { protect } = require('../middleware/auth');

// 📌 Create or Update Event
router.post('/', protect, saveEvent);

// 📌 Delete Event
router.delete('/:id', protect, deleteEvent);

// 📌 Get All My Events
router.get('/', protect, getMyEvents);

// 📌 Get Events for Dashboard
router.get('/dashboard', protect, getDashboardEvents);

module.exports = router;
