// 📁 controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { jwtSecret, frontendURL } = require('../config');
require('dotenv').config();

// ✅ Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Register
exports.register = async (req, res) => {
  try {
    const { name, email: rawEmail, password } = req.body;
    if (!name || !rawEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const email = rawEmail.toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({ name, email, password: hashedPassword, verificationToken, isVerified: false });
    await newUser.save();

    const verifyLink = `${frontendURL.replace(/\/$/, '')}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✅ Verify Your Email - MES HR Portal',
      html: `<p>Hello ${name},</p><p>Please verify your email: <a href="${verifyLink}">Verify Email</a></p>`,
    });

    res.status(201).json({ message: 'Registration successful. Please verify your email.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// ✅ Email Verification
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Server error verifying email' });
  }
};

// ✅ Login
exports.login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    if (!rawEmail || !password) return res.status(400).json({ error: 'Email and password required' });

    const email = rawEmail.toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email first' });

    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '2h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'employee',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// 🔁 Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: 'Email is required' });

    const email = rawEmail.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpires = expires;
    user.markModified('resetTokenExpires'); // 🔧 Fix for Render/Mongoose bug

    console.log('🧪 Reset Token:', resetToken);
    console.log('🕒 Expires:', expires);

    await user.save();

    console.log('✅ Saved user resetTokenExpires:', user.resetTokenExpires);

    const resetLink = `${frontendURL.replace(/\/$/, '')}/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔑 Reset Your Password - MES HR Portal',
      html: `
        <p>Hello,</p>
        <p>You requested to reset your password. Click below:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
    });

    res.json({ message: 'Password reset link sent to email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error sending password reset email' });
  }
};

// ✅ Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password: newPassword } = req.body;

    console.log('🔑 Token:', token);
    console.log('🔒 New password:', newPassword);

    if (!newPassword) return res.status(400).json({ error: 'New password is required' });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log('❌ Invalid or expired reset token');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '✅ Password Reset Successful - MES HR Portal',
      html: `<p>Hello ${user.name},</p><p>Your password was reset successfully.</p>`,
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error during password reset' });
  }
};

// 🔐 Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🔐 Password Changed - MES HR Portal',
      html: `<p>Hello ${user.name},</p><p>Your password was changed successfully. If this wasn't you, contact support.</p>`,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error changing password' });
  }
};
