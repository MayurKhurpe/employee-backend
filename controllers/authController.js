// 📁 controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { jwtSecret, frontendURL } = require('../config');
require('dotenv').config();

// Create reusable nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @desc Register a new user and send email verification link
 */
exports.register = async (req, res) => {
  try {
    const { name, email: rawEmail, password } = req.body;

    if (!name || !rawEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const email = rawEmail.toLowerCase();

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user but mark unverified
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
    });
    await newUser.save();

    // Send verification email
    const verifyLink = `${frontendURL.replace(/\/$/, '')}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✅ Verify Your Email - MES HR Portal',
      html: `
        <h2>Hello ${name},</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <a href="${verifyLink}">👉 Verify Email</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.status(201).json({ message: 'Registration successful. Please verify your email.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

/**
 * @desc Verify email using token
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined; // clear token
    await user.save();

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Server error during email verification' });
  }
};

/**
 * @desc Login user and return JWT token
 */
exports.login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;

    if (!rawEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const email = rawEmail.toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, {
      expiresIn: '2h',
    });

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

/**
 * @desc Change password for logged-in user
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Notify user by email
    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🔐 Password Changed - MES HR Portal',
      html: `<p>Hello ${user.name},</p><p>Your password was successfully changed. If this was not you, please contact support immediately.</p>`,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error during password change' });
  }
};

/**
 * @desc Send password reset email with expiring token
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email: rawEmail } = req.body;

    if (!rawEmail) return res.status(400).json({ error: 'Email is required' });
    const email = rawEmail.toLowerCase();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    // Generate reset token and expiry (1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    const resetLink = `${frontendURL.replace(/\/$/, '')}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔑 Reset Your Password - MES HR Portal',
      html: `
        <p>Hello,</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetLink}">🔁 Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error sending password reset email' });
  }
};

/**
 * @desc Reset password using reset token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password: newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ error: 'New password is required' });

    // Find user with valid reset token and unexpired
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    // Notify user about password reset
    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '✅ Password Reset Successful - MES HR Portal',
      html: `<p>Hello ${user.name},</p><p>Your password has been reset successfully.</p>`,
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error during password reset' });
  }
};
