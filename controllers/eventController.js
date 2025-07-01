// controllers/eventController.js
const Event = require('../models/Event');

// 📌 Add or Edit Event
exports.saveEvent = async (req, res) => {
  const { id, title, category, date } = req.body;
  const userId = req.user.userId;

  try {
    let event;
    if (id) {
      // Edit existing
      event = await Event.findOneAndUpdate(
        { _id: id, userId },
        { title, category, date },
        { new: true }
      );
    } else {
      // Create new
      event = await Event.create({ userId, title, category, date });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Error saving event', message: err.message });
  }
};

// 📌 Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const deleted = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting event' });
  }
};

// 📌 Get All My Events
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user.userId });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching events' });
  }
};

// 📌 Dashboard: Today + Upcoming Events
exports.getDashboardEvents = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userId = req.user.userId;

    const upcoming = await Event.find({
      userId,
      date: { $gte: today }
    }).sort({ date: 1 });

    const todayEvents = upcoming.filter(event => {
      const d = new Date(event.date);
      return d.toDateString() === today.toDateString();
    });

    res.json({
      today: todayEvents,
      upcoming: upcoming.filter(e => !todayEvents.includes(e)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error loading dashboard events' });
  }
};
