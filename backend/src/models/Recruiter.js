const mongoose = require('mongoose');

const recruiterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    fullName: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    teamMembers: [
      {
        email: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, enum: ['admin', 'recruiter', 'viewer'], default: 'recruiter' },
        status: { type: String, enum: ['pending', 'active'], default: 'pending' },
      },
    ],
    companyName: { type: String, required: true },
    companyWebsite: { type: String, trim: true },
    companyLogoUrl: { type: String },
    companyDetails: { type: String },

    accountStatus: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    registeredAt: { type: Date, default: Date.now },
    renewalDueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recruiter', recruiterSchema);
