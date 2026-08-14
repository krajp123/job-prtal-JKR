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
    companyEmail: { type: String, trim: true, lowercase: true },
    companyGst: { type: String, trim: true },
    companyCin: { type: String, trim: true },
    companyLogoUrl: { type: String },
    companyDetails: { type: String },
    profilePictureUrl: { type: String }, // Recruiter's own profile picture
    bio: { type: String, trim: true },
    location: { type: String, trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    expertiseTags: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    experienceTimeline: [
      {
        company: { type: String, trim: true },
        role: { type: String, trim: true },
        location: { type: String, trim: true },
        startDate: { type: String, trim: true },
        endDate: { type: String, trim: true },
        current: { type: Boolean, default: false },
        duration: { type: String, trim: true },
        achievements: [{ type: String, trim: true }],
      },
    ],

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
