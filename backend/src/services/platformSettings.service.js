const PlatformSettings = require('../models/PlatformSettings');
const { PRICING } = require('../config/razorpay');
const { DEFAULT_GST_RATE } = require('./tax.service');

const DEFAULT_SETTINGS = {
  siteName: 'HireLoop',
  logo: null,
  autoApproveJobs: false,
  maintenanceMode: false,
  emailVerificationRequired: true,
  notifications: {
    newRecruiterSignup: true,
    jobFlagged: true,
    paymentFailed: true,
    lowWalletAlert: true,
    smsAlerts: false,
  },
  moderation: {
    flaggedKeywords: ['work from home guaranteed', 'no interview needed', 'pay to apply'],
    autoSuspendThreshold: 5,
  },
  candidateRegistrationFee: PRICING.CANDIDATE_REGISTRATION,
  recruiterRegistrationFee: PRICING.RECRUITER_REGISTRATION,
  resumeDownloadCharge: PRICING.RESUME_DOWNLOAD,
  sessionTimeout: 30,
  gstEnabled: true,
  gstRate: DEFAULT_GST_RATE,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
};

async function getPlatformSettings() {
  let settings = await PlatformSettings.findOne({ key: 'default' }).lean();
  if (!settings) settings = await PlatformSettings.create({ key: 'default', ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function getPaymentPricing() {
  const settings = await getPlatformSettings();
  return {
    CANDIDATE_REGISTRATION: settings.candidateRegistrationFee,
    RECRUITER_REGISTRATION: settings.recruiterRegistrationFee,
    RESUME_DOWNLOAD: settings.resumeDownloadCharge,
    GST_ENABLED: settings.gstEnabled,
    GST_RATE: settings.gstRate,
  };
}

module.exports = { DEFAULT_SETTINGS, getPlatformSettings, getPaymentPricing };
