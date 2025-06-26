const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const User = require('../models/User');
const Broadcast = require('../models/Broadcast');
const Holiday = require('../models/Holiday');

// === Audit Log File Location ===
const logFilePath = path.join(__dirname, '../data/auditLogs.json');

// ------------------------------
// ✅ User Management
// ------------------------------
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'employee' });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { isApproved } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
    appendAuditLog(`User ${user.email} approval updated to ${isApproved ? 'approved' : 'disapproved'}`);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error updating approval' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    appendAuditLog(`User ${user?.email || '[Unknown]'} deleted`);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// ------------------------------
// ✅ Audit Logs
// ------------------------------
router.get('/audit-logs', (req, res) => {
  try {
    const logs = fs.existsSync(logFilePath)
      ? JSON.parse(fs.readFileSync(logFilePath, 'utf-8'))
      : [];

    const { search = '', date = '' } = req.query;
    const filtered = logs.filter(log =>
      log.message.toLowerCase().includes(search.toLowerCase()) &&
      (!date || log.timestamp.startsWith(date))
    );

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

router.post('/audit-logs', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const logs = fs.existsSync(logFilePath)
      ? JSON.parse(fs.readFileSync(logFilePath, 'utf-8'))
      : [];

    const newLog = {
      message,
      timestamp: new Date().toISOString(),
    };

    logs.unshift(newLog);
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save log' });
  }
});

router.delete('/audit-logs', (req, res) => {
  try {
    fs.writeFileSync(logFilePath, '[]');
    res.json({ message: 'All logs cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

router.get('/audit-logs/export/csv', (req, res) => {
  try {
    const logs = fs.existsSync(logFilePath)
      ? JSON.parse(fs.readFileSync(logFilePath, 'utf-8'))
      : [];

    const parser = new Parser({ fields: ['timestamp', 'message'] });
    const csv = parser.parse(logs);

    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'CSV export failed' });
  }
});

router.get('/audit-logs/export/pdf', (req, res) => {
  try {
    const logs = fs.existsSync(logFilePath)
      ? JSON.parse(fs.readFileSync(logFilePath, 'utf-8'))
      : [];

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('📜 Audit Logs Report', { align: 'center' });
    doc.moveDown();

    logs.forEach((log, idx) => {
      doc.fontSize(12).text(`${idx + 1}. [${log.timestamp}] ${log.message}`);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'PDF export failed' });
  }
});

// ------------------------------
// ✅ Broadcasts with Email Alerts
// ------------------------------
router.post('/broadcasts', async (req, res) => {
  try {
    const { message, audience } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const newBroadcast = new Broadcast({ message, audience });
    await newBroadcast.save();

    const users = await User.find({ role: 'employee' });
    const toEmails = users.map(u => u.email);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"MES System" <${process.env.EMAIL_USER}>`,
      to: toEmails,
      subject: '📢 New Broadcast Message',
      html: `<h3>📢 Broadcast Message:</h3><p>${message}</p>`
    });

    res.status(201).json({ message: 'Broadcast sent and email delivered', data: newBroadcast });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

router.get('/broadcasts', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
    res.json(broadcasts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
});

router.delete('/broadcasts/:id', async (req, res) => {
  try {
    await Broadcast.findByIdAndDelete(req.params.id);
    res.json({ message: 'Broadcast deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

// ------------------------------
// ✅ Holidays & Events Management
// ------------------------------
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

router.post('/holidays', async (req, res) => {
  try {
    const { name, date, description } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Name and date are required' });

    const newHoliday = new Holiday({ name, date, description });
    await newHoliday.save();

    appendAuditLog(`New holiday added: ${name} on ${date}`);
    res.status(201).json({ message: 'Holiday added successfully', data: newHoliday });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add holiday' });
  }
});

router.delete('/holidays/:id', async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    appendAuditLog(`Holiday deleted: ${req.params.id}`);
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

// ------------------------------
// ✅ Helper to append audit log
// ------------------------------
function appendAuditLog(message) {
  const logs = fs.existsSync(logFilePath)
    ? JSON.parse(fs.readFileSync(logFilePath, 'utf-8'))
    : [];

  const newLog = {
    message,
    timestamp: new Date().toISOString(),
  };

  logs.unshift(newLog);
  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}

module.exports = router;
