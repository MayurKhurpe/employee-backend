// 📁 middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || require('../config').jwtSecret;

// 🔐 Middleware: Verify JWT token
const protect = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '🚫 Token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, name, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: '❌ Invalid or expired token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '⛔ Admin only' });
  }
};

module.exports = { protect, isAdmin }; // ✅ make sure this line exists
