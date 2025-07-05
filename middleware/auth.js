const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../config"); // ✅ Use the correct secret

const protect = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "🚫 Access denied. Token missing or malformed." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtSecret); // ✅ Now uses the correct secret

    const user = await User.findById(decoded.userId).select("name email role");

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

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "🚫 Access denied. Admins only." });
  }
};

module.exports = { protect, isAdmin };
