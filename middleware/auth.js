// 📁 middleware/auth.js
const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT and extract user data
 */
const protect = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "🚫 Access denied. Token missing or malformed." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "your_jwt_secret";
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT verification error:", err.message);
    return res.status(401).json({ message: "❌ Invalid or expired token." });
  }
};

/**
 * Middleware to allow only admins
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "🚫 Access denied. Admins only." });
  }
};

module.exports = { protect, isAdmin };
