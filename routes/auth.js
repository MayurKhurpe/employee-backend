// ✅ routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { jwtSecret } = require('../config');
require('dotenv').config();

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false
    });

    await newUser.save();

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✅ Verify Your Email - MES HR Portal',
      html: `<h2>Hello ${name},</h2><p>Click below to verify:</p><a href="${verifyLink}">👉 Verify Email</a>`
    });

    res.status(201).json({ message: 'Registered. Please verify your email.' });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) return res.status(400).send('Invalid or expired token.');

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send('🎉 Email verified successfully!');
  } catch (err) {
    res.status(500).send('Error during verification.');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '2h' });

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role || 'employee'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;