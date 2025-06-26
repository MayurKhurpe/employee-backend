// 📁 routes/registerRequest.js
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const PendingUser = require("../models/PendingUser");

// POST /api/register-request
router.post("/", async (req, res) => {
  const { name, email, password, mobile, department, address, profileImage } = req.body;

  if (!name || !email || !password || !mobile || !department) {
    return res.status(400).json({ error: "All required fields must be filled." });
  }

  try {
    // Check if already pending
    const existing = await PendingUser.findOne({ email });
    if (existing) return res.status(400).json({ error: "Registration request already submitted." });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newRequest = new PendingUser({
      name,
      email,
      password: hashedPassword,
      mobile,
      department,
      address,
      profileImage,
      status: "pending",
      requestedAt: new Date(),
    });

    await newRequest.save();
    res.status(201).json({ message: "Registration submitted. Awaiting admin approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while registering." });
  }
});

module.exports = router;
