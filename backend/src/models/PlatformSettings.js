const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default' },
    siteName: { type: String, default: 'HireLoop' },
    logo: { type: String, default: null },
    autoApproveJobs: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    emailVerificationRequired: { type: Boolean, default: true },
    notifications: {
      newRecruiterSignup: { type: Boolean, default: true },
      jobFlagged: { type: Boolean, default: true },
      paymentFailed: { type: Boolean, default: true },
      lowWalletAlert: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: false },
    },
    candidateRegistrationFee: { type: Number, min: 0, default: 9 },
    recruiterRegistrationFee: { type: Number, min: 0, default: 110 },
    resumeDownloadCharge: { type: Number, min: 0, default: 9 },
    sessionTimeout: { type: Number, min: 1, default: 30 },
    gstEnabled: { type: Boolean, default: true },
    gstRate: { type: Number, min: 0, default: 18 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
