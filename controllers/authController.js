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

// ✅ Email Mask Helper
function maskEmail(email) {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}****@${domain}`;
}

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

// ✅ Login (Fixed Version)
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

    // ✅ Fixed: payload uses userId (not id)
    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, { expiresIn: '2h' });

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

// ✅ 1. Send OTP
exports.sendOTP = async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: 'Email is required' });

    const email = rawEmail.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'No account found with that email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    user.resetToken = otp;
    user.resetTokenExpires = expires;
    await user.save();

    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your OTP - MES HR Portal',
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong><br/>It expires in 10 minutes.</p>`,
    });

    res.json({ message: `OTP sent to ${maskEmail(email)}` });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Server error sending OTP' });
  }
};

// ✅ 2. Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email: rawEmail, otp } = req.body;
    if (!rawEmail || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const email = rawEmail.toLowerCase();
    const user = await User.findOne({
      email,
      resetToken: otp,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    res.json({ message: 'OTP verified. You can now reset your password.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
};

// ✅ 3. Set New Password
exports.setNewPassword = async (req, res) => {
  try {
    const { email: rawEmail, otp, newPassword } = req.body;
    if (!rawEmail || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP and new password are required' });
    }

    const email = rawEmail.toLowerCase();
    const user = await User.findOne({
      email,
      resetToken: otp,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    await transporter.sendMail({
      from: `"MES HR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✅ Password Reset Successful',
      html: `<p>Hello ${user.name},<br/>Your password was reset successfully.</p>`,
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Set new password error:', err);
    res.status(500).json({ error: 'Server error setting new password' });
  }
};

// ✅ Change Password (from logged in user)
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
      html: `<p>Hello ${user.name},<br/>Your password was changed successfully. If this wasn't you, contact support.</p>`,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error changing password' });
  }
};
