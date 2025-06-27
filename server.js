// 📁 server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

const { jwtSecret } = require('./config');
const User = require('./models/User');

// ✅ Import Routes
const profileRoutes = require('./routes/profile');
const attendanceRoute = require('./routes/attendance');
const attendanceStatsRoute = require('./routes/attendanceStats');
const leaveRoutes = require('./routes/leave');
const birthdayRoutes = require('./routes/birthday');
const newsRoutes = require('./routes/news');
const adminRoutes = require('./routes/admin');
const holidayRoutes = require('./routes/holiday');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = jwtSecret;

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Connect MongoDB
mongoose.connect(
  'mongodb+srv://hrseekersautomation:Mayur123@mayur.urnkzrg.mongodb.net/employeeDB?retryWrites=true&w=majority&appName=Mayur',
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ DB error:', err));

// ✅ Auth: Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!user.isApproved) return res.status(403).json({ error: 'Not approved by admin' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, SECRET_KEY, { expiresIn: '2h' });

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role || 'employee',
        profilePic: user.profilePic || user.profileImage || '', // ✅ Added line
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ✅ Auth: Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashed, role: 'employee', isApproved: false });
    await newUser.save();

    res.json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Forgot Password
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.tokenExpiry = Date.now() + 3600000;
  await user.save();

  const resetLink = `http://localhost:3000/reset-password/${token}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password',
    },
  });

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: user.email,
    subject: 'Reset Password',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Email sending failed' });
  }
});

// ✅ Reset Password
app.post('/api/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({ resetToken: token, tokenExpiry: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ error: 'Token expired or invalid' });

  const hashed = await bcrypt.hash(password, 10);
  user.password = hashed;
  user.resetToken = undefined;
  user.tokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
});

// ✅ Extended Register
app.post('/api/register-request', async (req, res) => {
  const { name, email, password, mobile, department, address, profileImage } = req.body;
  if (!name || !email || !password || !mobile || !department) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      name, email, password: hashed, mobile, department, address, profileImage,
      role: 'employee', isApproved: false
    });

    await user.save();
    res.status(201).json({ message: 'Registration submitted. Awaiting approval' });
  } catch (err) {
    res.status(500).json({ error: 'Error saving user' });
  }
});

// ✅ Admin Approval
app.post('/api/approve-user', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOneAndUpdate({ email }, { isApproved: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User approved' });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
});

// ✅ File Upload
const DocumentSchema = new mongoose.Schema({
  name: String,
  size: String,
  type: String,
  filePath: String,
  uploadedAt: { type: Date, default: Date.now },
});
const Document = mongoose.model('Document', DocumentSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const doc = new Document({
      name: file.originalname,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.mimetype,
      filePath: file.path,
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const { sortBy = 'uploadedAt', order = 'desc' } = req.query;
    const docs = await Document.find().sort({ [sortBy]: order === 'asc' ? 1 : -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Fetch error' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (doc && fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ✅ Use Routes
app.use('/api/profile', profileRoutes);
app.use('/api/attendance', attendanceRoute);
app.use('/api/attendance-stats', attendanceStatsRoute);
app.use('/api/leave', leaveRoutes);
app.use('/api/birthdays', birthdayRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/holidays', holidayRoutes);

// ✅ Scheduler
require('./scheduler');

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
