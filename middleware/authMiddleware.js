const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");

// ✅ Middleware to verify JWT token
const protect = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "🚫 Access denied. Token missing or malformed." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // Contains { userId, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "❌ Invalid or expired token." });
  }
};

// ✅ Middleware to allow only admins
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "⛔ Admin access only." });
  }
};

module.exports = { protect, isAdmin };
