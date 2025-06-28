// 📁 middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// ✅ Use env or fallback secret
const JWT_SECRET = process.env.JWT_SECRET || require("../config").jwtSecret;

/**
 * 🔐 Middleware: Protect routes by verifying JWT token
 * Attaches decoded user object to req.user
 */
const protect = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "🚫 Access denied. Token missing or malformed.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains: { userId, email, role, name, ... }
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ message: "❌ Invalid or expired token." });
  }
};

/**
 * 👑 Middleware: Only allow admin role
 * Must be used after `protect`
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "⛔ Admin access only." });
  }
};

module.exports = { protect, isAdmin };
