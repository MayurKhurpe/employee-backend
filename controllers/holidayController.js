const Holiday = require('../models/Holiday');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// ✅ Get All Holidays
exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.status(200).json(holidays);
  } catch (err) {
    console.error('❌ Failed to fetch holidays:', err.message);
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
};

// ✅ Add Holiday
exports.addHoliday = async (req, res) => {
  try {
    const { name, date, isEvent } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

    const holiday = new Holiday({
      name,
      date: new Date(date),
      isEvent: !!isEvent,
    });

    await holiday.save();
    res.status(201).json({ message: '✅ Holiday added successfully', holiday });
  } catch (err) {
    console.error('❌ Failed to add holiday:', err.message);
    res.status(500).json({ message: 'Failed to add holiday' });
  }
};

// ✅ Delete Holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const deleted = await Holiday.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    res.status(200).json({ message: '✅ Holiday deleted' });
  } catch (err) {
    console.error('❌ Delete error:', err.message);
    res.status(500).json({ message: 'Failed to delete holiday' });
  }
};

// ✅ Export as CSV
exports.exportCSV = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    const fields = ['name', 'date', 'isEvent'];
    const csv = new Parser({ fields }).parse(holidays);
    res.setHeader('Content-Disposition', 'attachment; filename=holidays.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    console.error('❌ CSV export failed:', err.message);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

// ✅ Export as PDF
exports.exportPDF = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Disposition', 'attachment; filename=holidays.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('📅 Holiday & Event Report', { align: 'center' });
    doc.moveDown();

    holidays.forEach((holiday, i) => {
      doc.fontSize(12).text(
        `${i + 1}. ${holiday.name} (${holiday.isEvent ? 'Event' : 'Holiday'}) on ${new Date(holiday.date).toDateString()}`
      ).moveDown(0.2);
    });

    doc.end();
  } catch (err) {
    console.error('❌ PDF export failed:', err.message);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
};
