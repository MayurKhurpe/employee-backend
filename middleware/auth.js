// 📁 middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // ✅ make sure this is imported

/**
 * Middleware to verify JWT and extract full user data
 */
const protect = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "🚫 Access denied. Token missing or malformed." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "your_jwt_secret";
    const decoded = jwt.verify(token, secret);

    // ✅ Fetch full user info (name, email, role, etc.)
    const user = await User.findById(decoded.id).select("name email role");

    if (!user) {
      return res.status(401).json({ message: "❌ User not found" });
    }

    req.user = {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

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
