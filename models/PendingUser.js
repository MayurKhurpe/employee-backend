const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  mobile: String,
  department: String,
  address: String,
  profileImage: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  requestedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.PendingUser || mongoose.model("PendingUser", pendingUserSchema);
