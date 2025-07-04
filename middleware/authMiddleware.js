const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { jwtSecret } = require("../config"); // or use process.env.JWT_SECRET

// ✅ POST /api/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 🔍 Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // 🔒 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // 🧾 Create token (✅ use userId instead of id)
    const token = jwt.sign(
      {
        userId: user._id, // 👈 This is important
        name: user.name,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
