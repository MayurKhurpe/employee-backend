const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    mobile: {
      type: String,
      default: '',
      trim: true,
    },

    emergencyMobile: {
      type: String,
      default: '',
      trim: true,
    },

    bloodGroup: {
      type: String,
      default: '',
      trim: true,
    },

    joiningDate: {
      type: Date,
      default: null,
    },

    dob: {
      type: Date,
      default: null,
    },

    department: {
      type: String,
      default: '',
      trim: true,
    },

    address: {
      type: String,
      default: '',
      trim: true,
    },

    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
    },

    resetToken: {
      type: String,
    },

    resetTokenExpires: {
      type: Date,
      default: null,
    },

    profileImage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
