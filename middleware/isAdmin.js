// 📁 middleware/isAdmin.js

// Middleware to check if the authenticated user is an admin
module.exports = function (req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
};
