// 📁 middleware/isAdmin.js

/**
 * 👑 Admin Middleware
 * Ensures the user is authenticated and has admin role.
 * Assumes `req.user` is already set by `protect` middleware.
 */
const isAdmin = (req, res, next) => {
  // 🔐 Ensure user data exists
  if (!req.user) {
    return res.status(401).json({ message: "🚫 Unauthorized. No user data found." });
  }

  // 👑 Check admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "⛔ Access denied. Admins only." });
  }

  next(); // ✅ Proceed to route
};

module.exports = isAdmin;
