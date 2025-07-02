// 📁 routes/holiday.js
const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');

// ✅ Public or protected as needed
router.get('/', holidayController.getAllHolidays);
router.post('/', holidayController.addHoliday);
router.delete('/:id', holidayController.deleteHoliday);
router.get('/export/csv', holidayController.exportCSV);
router.get('/export/pdf', holidayController.exportPDF);

module.exports = router;
