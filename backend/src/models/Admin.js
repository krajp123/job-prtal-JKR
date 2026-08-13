const mongoose = require('mongoose');

// Admins are intentionally a separate collection (not a "role" field on a shared
// users table). This keeps admin auth, permissions, and audit trail fully isolated
// from candidate/recruiter accounts.
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin',
    },

    // Placeholder for future 2FA support (see Future Scope)
    twoFactorEnabled: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
