// 📁 controllers/holidayController.js
const Holiday = require('../models/Holiday');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

/**
 * @desc Get all holidays sorted by date ascending
 */
exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    console.error('Failed to fetch holidays:', err);
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
};

/**
 * @desc Add a new holiday or event
 */
exports.addHoliday = async (req, res) => {
  try {
    const { name, date, isEvent } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

    const newHoliday = new Holiday({ name, date: new Date(date), isEvent: !!isEvent });
    await newHoliday.save();

    res.status(201).json(newHoliday);
  } catch (err) {
    console.error('Failed to add holiday:', err);
    res.status(500).json({ message: 'Failed to add holiday' });
  }
};

/**
 * @desc Delete holiday by ID
 */
exports.deleteHoliday = async (req, res) => {
  try {
    const deleted = await Holiday.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Failed to delete holiday:', err);
    res.status(500).json({ message: 'Failed to delete' });
  }
};

/**
 * @desc Export holidays as CSV file
 */
exports.exportCSV = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });

    const fields = ['name', 'date', 'isEvent'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(holidays);

    res.setHeader('Content-Disposition', 'attachment; filename=holidays.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    console.error('Failed to export CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

/**
 * @desc Export holidays as PDF file
 */
exports.exportPDF = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Disposition', 'attachment; filename=holidays.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('📅 Holiday & Event Report', { align: 'center' });
    doc.moveDown();

    holidays.forEach((holiday, index) => {
      const dateStr = holiday.date.toLocaleDateString();
      const typeStr = holiday.isEvent ? 'Event' : 'Holiday';
      doc
        .fontSize(12)
        .text(`${index + 1}. [${dateStr}] ${holiday.name} (${typeStr})`, { continued: false })
        .moveDown(0.2);
    });

    doc.end();
  } catch (err) {
    console.error('Failed to export PDF:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
};
