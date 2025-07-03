const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
require('dotenv').config();

const { jwtSecret } = require('./config');
const User = require('./models/User');
const { protect, isAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://employee-web-mu.vercel.app';

// ✅ CORS Setup
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://employee-web-kifp.onrender.com',
      'https://employee-web-mu.vercel.app',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ✅ Middleware
app.use(express.json());
app.use(helmet());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ✅ Home Route
app.get('/', (req, res) => {
  res.send('🎉 Employee Management Backend API is running!');
});

// 🔐 Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!user.isApproved) return res.status(403).json({ error: 'Not approved by admin' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, { expiresIn: '2h' });

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic || user.profileImage || '',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔐 Simple Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, isApproved: false });
    await user.save();

    res.json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// 🔐 Full Registration
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
      role: 'employee', isApproved: false,
    });

    await user.save();
    res.status(201).json({ message: 'Registration submitted. Awaiting approval' });
  } catch (err) {
    res.status(500).json({ error: 'Error saving user' });
  }
});

// 🔐 Forgot Password
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.tokenExpiry = Date.now() + 3600000;
  await user.save();

  const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: '🔐 Reset Your Password',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// 🔐 Reset Password
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

// ✅ Admin Approves Users
app.post('/api/approve-user', protect, isAdmin, async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOneAndUpdate({ email }, { isApproved: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User approved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// ✅ Routes
app.use('/api/profile', protect, require('./routes/profile'));
app.use('/api/attendance', protect, require('./routes/attendance'));
app.use('/api/attendance-stats', protect, require('./routes/attendanceStats'));
app.use('/api/leave', protect, require('./routes/leave'));
app.use('/api/birthdays', protect, require('./routes/birthday'));
app.use('/api/news', protect, require('./routes/news'));
app.use('/api/holidays', protect, require('./routes/holiday'));
app.use('/api/broadcasts', require('./routes/broadcast'));         // for public fetch
app.use('/api/admin/broadcasts', require('./routes/broadcast'));   // for admin controls
app.use('/api/notification-settings', protect, require('./routes/notification'));
app.use('/api/admin', protect, isAdmin, require('./routes/admin'));
app.use('/api/events', protect, require('./routes/eventRoutes'));

// ✅ ✅ ✅ ✅ NEW: Change Password Route Added
app.use('/api/change-password', protect, require('./routes/changePassword'));

// ✅ ✅ ✅ ✅ NEW: USERS DROPDOWN API (REQUIRED FOR FILTER)
app.use('/api/users', protect, isAdmin, require('./routes/userRoutes')); // <-- ✅ added this line

// ✅ ✅ ✅ ✅ ADD THIS NEW PING ROUTE BELOW
app.use('/api', require('./routes/ping'));

// ⏰ Daily Background Jobs
require('./scheduler');

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
