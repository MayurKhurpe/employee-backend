// 📁 routes/attendance.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const attendanceController = require('../controllers/attendanceController');

// ✅ Routes
router.post('/mark', authMiddleware, attendanceController.markAttendance);
router.get('/my', authMiddleware, attendanceController.getMyAttendance);
router.get('/all', authMiddleware, isAdmin, attendanceController.getAllAttendance);
router.get('/user/:userId', authMiddleware, isAdmin, attendanceController.getUserAttendance);
router.patch('/:id', authMiddleware, attendanceController.updateCheckout);
router.get('/summary', authMiddleware, isAdmin, attendanceController.getSummary);

module.exports = router;
