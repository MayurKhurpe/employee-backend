// 📁 middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT and extract user data
 * @route   Protected
 * @header  Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");

  // 🚫 Check for missing or malformed token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "🚫 Access denied. Token missing or malformed." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 🔐 Verify token using secret from .env (with fallback)
    const secret = process.env.JWT_SECRET || "your_jwt_secret";
    const decoded = jwt.verify(token, secret);

    // 🧾 Attach user info to request object
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT verification error:", err.message);
    return res.status(401).json({ message: "❌ Invalid or expired token." });
  }
};

module.exports = authMiddleware;
