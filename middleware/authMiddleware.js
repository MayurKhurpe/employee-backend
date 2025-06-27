// 📁 middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config"); // Ensure config file has the secret

const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "🚫 Access denied. Token missing or malformed." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "❌ Invalid or expired token." });
  }
};

module.exports = authMiddleware;
