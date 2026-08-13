const Candidate = require('../models/Candidate');
const { sendEmail, sendOtpEmail } = require('../services/email.service');
const { twilioClient, TWILIO_PHONE_NUMBER } = require('../config/twilio');
const { isValidEmail, isValidPhone } = require('../utils/validators');
const { setOtp, checkOtp, clearOtp, markVerified } = require('../services/verificationStore.service');

// POST /api/candidate/verify/email/send   body: { email }
exports.sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const existing = await Candidate.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const code = setOtp(`email:${email.toLowerCase()}`);

    const result = await sendOtpEmail(email, code, 'email');
    
    if (!result.sent) {
      console.error('Failed to send OTP email:', result.error);
      return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/verify/email/confirm   body: { email, code }
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    const key = `email:${(email || '').toLowerCase()}`;

    if (!checkOtp(key, code)) {
      return res.status(400).json({ error: 'Incorrect or expired code' });
    }

    clearOtp(key);
    markVerified(key);
    res.json({ message: 'Email verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/verify/phone/send   body: { phone }
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const existing = await Candidate.findOne({ phone });
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }

    const code = setOtp(`phone:${phone}`);

    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.warn(`[candidateVerification] Twilio not configured — dev mode OTP for ${phone}: ${code}`);
      return res.json({ message: 'OTP generated in dev mode; SMS not sent.' });
    }

    await twilioClient.messages.create({
      body: `Your Job Portal verification code is ${code}. It expires in 5 minutes.`,
      from: TWILIO_PHONE_NUMBER,
      to: phone,
    });

    res.json({ message: 'OTP sent to your phone' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/verify/phone/confirm   body: { phone, code }
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    const key = `phone:${phone}`;

    if (!checkOtp(key, code)) {
      return res.status(400).json({ error: 'Incorrect or expired code' });
    }

    clearOtp(key);
    markVerified(key);
    res.json({ message: 'Phone number verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};