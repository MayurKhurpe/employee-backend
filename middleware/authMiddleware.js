// 📁 middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ✅ Ensure User model is loaded

const JWT_SECRET = process.env.JWT_SECRET || require('../config').jwtSecret;

// 🔐 Middleware: Verify JWT token and attach full user
const protect = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '🚫 Token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ Load full user details
    const user = await User.findById(decoded.userId).select('name email role');
    if (!user) {
      return res.status(401).json({ message: '❌ User not found' });
    }

    req.user = {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: '❌ Invalid or expired token' });
  }
};

// 👑 Admin check middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '⛔ Admin only' });
  }
};

module.exports = { protect, isAdmin };
