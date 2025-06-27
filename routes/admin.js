// 📁 routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// 🔐 Protect all admin routes
router.use(authMiddleware, isAdmin);

// 👥 Get all users pending approval
router.get('/pending-users', adminController.getPendingUsers);

// ✅ Approve a user by email
router.post('/approve-user', adminController.approveUser);

// ❌ Reject/delete a user by email
router.post('/reject-user', adminController.rejectUser);

module.exports = router;
