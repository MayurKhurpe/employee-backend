// 📁 routes/holiday.js
const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// ✅ Get all holidays/events
router.get('/', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
});

// ✅ Add new holiday/event
router.post('/', async (req, res) => {
  try {
    const { name, date, isEvent } = req.body;
    const newHoliday = new Holiday({ name, date, isEvent });
    await newHoliday.save();
    res.status(201).json(newHoliday);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add holiday' });
  }
});

// ✅ Delete holiday/event
router.delete('/:id', async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete' });
  }
});

// ✅ Export holidays to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    const parser = new Parser({ fields: ['name', 'date', 'isEvent'] });
    const csv = parser.parse(holidays);

    res.setHeader('Content-Disposition', 'attachment; filename=holidays.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// ✅ Export holidays to PDF
router.get('/export/pdf', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename=holidays.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('📅 Holiday & Event Report', { align: 'center' });
    doc.moveDown();

    holidays.forEach((h, i) => {
      doc
        .fontSize(12)
        .text(
          `${i + 1}. [${h.date}] ${h.name} ${h.isEvent ? '(Event)' : '(Holiday)'}`
        );
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

module.exports = router;
