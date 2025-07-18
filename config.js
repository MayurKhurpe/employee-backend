// 📁 config.js
require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
  mongoURI: process.env.MONGO_URI,
  frontendURL: process.env.FRONTEND_URL,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  adminEmail: process.env.ADMIN_EMAIL,
};
