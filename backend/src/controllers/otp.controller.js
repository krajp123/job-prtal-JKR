const { twilioClient, TWILIO_PHONE_NUMBER } = require('../config/twilio');
const Candidate = require('../models/Candidate');

// Simple in-memory OTP store for demo purposes.
// In production, use Redis with a TTL instead.
const otpStore = new Map(); // phone -> { code, expiresAt }

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
}

// POST /api/otp/send  body: { phone }
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const candidate = await Candidate.findOne({ phone });
    if (!candidate) {
      return res.status(404).json({ error: 'No account found with this phone number' });
    }

    const code = generateOtp();
    otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.warn('Twilio is not configured; OTP send is skipped for local development.');
      return res.json({ message: 'OTP generated in dev mode; SMS not sent.' });
    }

    await twilioClient.messages.create({
      body: `Your Job Portal verification code is ${code}. It expires in 5 minutes.`,
      from: TWILIO_PHONE_NUMBER,
      to: phone,
    });

    res.json({ message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/otp/verify  body: { phone, code }
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;

    const record = otpStore.get(phone);
    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'OTP expired or not found. Request a new one.' });
    }

    if (record.code !== code) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    otpStore.delete(phone);

    const candidate = await Candidate.findOne({ phone });
    res.json({ uniqueId: candidate.uniqueId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
